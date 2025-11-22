/**
 * CHRAVEL PUSH NOTIFICATION SERVICE
 * 
 * Sends push notifications to iOS/Android/Web devices
 * 
 * ⚠️ HUMAN MUST CONFIGURE:
 * - FIREBASE_SERVER_KEY (for Android/Web via FCM)
 * - APNs certificate (.p8 key for iOS)
 * 
 * Environment Variables Required:
 * - FIREBASE_SERVER_KEY
 * - APNS_KEY_ID
 * - APNS_TEAM_ID
 * - APNS_KEY_CONTENT (base64 encoded .p8 key)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')

interface PushNotificationRequest {
  userId?: string
  userIds?: string[]
  title: string
  body: string
  data?: Record<string, any>
  badge?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, userIds, title, body, data = {}, badge }: PushNotificationRequest = await req.json()
    
    // Determine recipients
    const recipients = userIds || (userId ? [userId] : [])
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get push tokens for all recipients
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('*')
      .in('user_id', recipients)
      .eq('active', true)
    
    if (tokensError) throw tokensError
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No push tokens found for recipients',
          sent: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`📱 Sending push notifications to ${tokens.length} device(s)`)
    
    // Group tokens by platform
    const iosTokens = tokens.filter(t => t.platform === 'ios')
    const androidTokens = tokens.filter(t => t.platform === 'android')
    const webTokens = tokens.filter(t => t.platform === 'web')
    
    // Send to each platform
    const results = {
      ios: await sendToAPNs(iosTokens, title, body, data, badge),
      android: await sendToFCM(androidTokens, title, body, data, badge),
      web: await sendToWebPush(webTokens, title, body, data, badge)
    }
    
    // Update last_used_at for successful tokens
    const successfulTokenIds = [
      ...results.ios.successful,
      ...results.android.successful,
      ...results.web.successful
    ]
    
    if (successfulTokenIds.length > 0) {
      await supabase
        .from('push_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .in('id', successfulTokenIds)
    }
    
    // Deactivate failed tokens
    const failedTokenIds = [
      ...results.ios.failed,
      ...results.android.failed,
      ...results.web.failed
    ]
    
    if (failedTokenIds.length > 0) {
      await supabase
        .from('push_tokens')
        .update({ active: false })
        .in('id', failedTokenIds)
    }
    
    const totalSent = successfulTokenIds.length
    const totalFailed = failedTokenIds.length
    
    return new Response(
      JSON.stringify({ 
        success: true,
        sent: totalSent,
        failed: totalFailed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Push notification error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Send to iOS devices via APNs (Apple Push Notification service)
 * 
 * ⚠️ HUMAN MUST IMPLEMENT:
 * - Get APNs .p8 key from Apple Developer Portal
 * - Add APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_CONTENT to Supabase secrets
 * - Implement JWT signing for APNs authentication
 */
async function sendToAPNs(
  tokens: any[],
  title: string,
  body: string,
  data: Record<string, any>,
  badge?: number
): Promise<{ successful: string[], failed: string[] }> {
  if (tokens.length === 0) {
    return { successful: [], failed: [] }
  }
  
  const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID')
  const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID')
  const APNS_KEY_CONTENT = Deno.env.get('APNS_KEY_CONTENT')
  
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_KEY_CONTENT) {
    console.warn('⚠️ APNs credentials not configured. iOS push notifications will not be sent.')
    console.warn('Human must set up:')
    console.warn('  1. Get .p8 key from Apple Developer Portal')
    console.warn('  2. Set APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_CONTENT in Supabase secrets')
    
    return {
      successful: [],
      failed: tokens.map(t => t.id)
    }
  }
  
  // TODO: Implement APNs JWT signing and HTTP/2 push
  // Libraries to use:
  // - https://deno.land/x/jose for JWT
  // - HTTP/2 request to api.push.apple.com
  
  const successful: string[] = []
  const failed: string[] = []
  
  for (const token of tokens) {
    try {
      // Placeholder for actual APNs implementation
      console.log(`📱 [iOS] Would send to token: ${token.token.substring(0, 20)}...`)
      
      // APNs payload format:
      const payload = {
        aps: {
          alert: {
            title,
            body
          },
          badge,
          sound: 'default',
          'mutable-content': 1 // Enables notification service extension
        },
        ...data
      }
      
      // TODO: Send actual HTTP/2 request to APNs
      // const response = await fetch(`https://api.push.apple.com/3/device/${token.token}`, {
      //   method: 'POST',
      //   headers: {
      //     'authorization': `bearer ${jwtToken}`,
      //     'apns-topic': 'com.chravel.app',
      //     'apns-push-type': 'alert',
      //     'apns-priority': '10'
      //   },
      //   body: JSON.stringify(payload)
      // })
      
      // For now, mark as failed (not implemented)
      failed.push(token.id)
      
    } catch (error) {
      console.error(`❌ [iOS] Failed to send to token ${token.id}:`, error)
      failed.push(token.id)
    }
  }
  
  return { successful, failed }
}

/**
 * Send to Android/Web devices via Firebase Cloud Messaging
 */
async function sendToFCM(
  tokens: any[],
  title: string,
  body: string,
  data: Record<string, any>,
  badge?: number
): Promise<{ successful: string[], failed: string[] }> {
  if (tokens.length === 0) {
    return { successful: [], failed: [] }
  }
  
  if (!FIREBASE_SERVER_KEY) {
    console.warn('⚠️ FCM not configured. Android/Web push notifications will not be sent.')
    return {
      successful: [],
      failed: tokens.map(t => t.id)
    }
  }
  
  const successful: string[] = []
  const failed: string[] = []
  
  for (const token of tokens) {
    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: token.token,
          notification: {
            title,
            body,
            icon: '/chravel-logo.png',
            badge: badge?.toString(),
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          priority: 'high'
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success === 1) {
        console.log(`✅ [FCM] Sent to token ${token.id}`)
        successful.push(token.id)
      } else {
        console.error(`❌ [FCM] Failed for token ${token.id}:`, result)
        failed.push(token.id)
      }
      
    } catch (error) {
      console.error(`❌ [FCM] Error for token ${token.id}:`, error)
      failed.push(token.id)
    }
  }
  
  return { successful, failed }
}

/**
 * Send to Web browsers via Web Push Protocol
 */
async function sendToWebPush(
  tokens: any[],
  title: string,
  body: string,
  data: Record<string, any>,
  badge?: number
): Promise<{ successful: string[], failed: string[] }> {
  if (tokens.length === 0) {
    return { successful: [], failed: [] }
  }
  
  const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
  
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️ VAPID keys not configured. Web push notifications will not be sent.')
    return {
      successful: [],
      failed: tokens.map(t => t.id)
    }
  }
  
  // TODO: Implement Web Push Protocol
  // Use web-push library or implement VAPID JWT signing manually
  
  console.warn('⚠️ Web Push not yet implemented')
  
  return {
    successful: [],
    failed: tokens.map(t => t.id)
  }
}
