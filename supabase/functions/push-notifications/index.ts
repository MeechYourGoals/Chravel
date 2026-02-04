import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';
import { generateSmsMessage, isSmsEligibleCategory, type SmsTemplateData } from '../_shared/smsTemplates.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const SMS_DAILY_LIMIT = 10;

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();
    
    switch (action) {
      case 'send_push':
        return await sendPushNotification(payload);
      case 'send_email':
        return await sendEmailNotification(payload);
      case 'send_sms':
        return await sendSMSNotification(payload);
      case 'save_token':
        return await savePushToken(payload);
      case 'remove_token':
        return await removePushToken(payload);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendPushNotification({ userId, tokens, title, body, data, icon, badge }: any) {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
  
  if (!fcmServerKey) {
    throw new Error('FCM server key not configured');
  }

  const fcmPayload = {
    registration_ids: Array.isArray(tokens) ? tokens : [tokens],
    notification: {
      title,
      body,
      icon: icon || '/favicon.ico',
      badge: badge || '/favicon.ico',
      click_action: data?.url || '/',
    },
    data: data || {},
    webpush: {
      fcm_options: {
        link: data?.url || '/'
      }
    }
  };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FCM error: ${error}`);
  }

  const result = await response.json();

  // Log notification in database
  await supabase
    .from('notification_logs')
    .insert({
      user_id: userId,
      type: 'push',
      title,
      body,
      data,
      success: result.success || 0,
      failure: result.failure || 0,
      sent_at: new Date().toISOString()
    });

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendEmailNotification({ userId, email, subject, content, template }: any) {
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  
  if (!sendgridApiKey) {
    throw new Error('SendGrid API key not configured');
  }

  const emailPayload = {
    personalizations: [{
      to: [{ email }],
      subject
    }],
    from: {
      email: 'noreply@yourdomain.com',
      name: 'Travel Planning App'
    },
    content: [{
      type: 'text/html',
      value: template || `<p>${content}</p>`
    }]
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  // Log notification in database
  await supabase
    .from('notification_logs')
    .insert({
      user_id: userId,
      type: 'email',
      title: subject,
      body: content,
      recipient: email,
      sent_at: new Date().toISOString()
    });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendSMSNotification({ 
  userId, 
  phoneNumber, 
  message,
  category,
  templateData 
}: {
  userId: string;
  phoneNumber: string;
  message?: string;
  category?: string;
  templateData?: SmsTemplateData;
}) {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.error('[SMS] Twilio credentials not configured');
    
    // Log the failure
    await supabase.from('notification_logs').insert({
      user_id: userId,
      type: 'sms',
      title: 'SMS Notification',
      body: message || 'N/A',
      recipient: phoneNumber,
      status: 'failed',
      error_message: 'Twilio credentials not configured',
      created_at: new Date().toISOString()
    });
    
    throw new Error('Twilio credentials not configured');
  }

  // Check rate limit
  const { data: rateLimitData, error: rateLimitError } = await supabase
    .rpc('check_sms_rate_limit', { p_user_id: userId, p_daily_limit: SMS_DAILY_LIMIT });
  
  if (rateLimitError) {
    console.error('[SMS] Rate limit check failed:', rateLimitError);
  }
  
  const rateLimit = rateLimitData?.[0];
  if (rateLimit && !rateLimit.allowed) {
    console.warn(`[SMS] Rate limit exceeded for user ${userId}. Remaining: ${rateLimit.remaining}`);
    
    // Log rate-limited attempt
    await supabase.from('notification_logs').insert({
      user_id: userId,
      type: 'sms',
      title: 'SMS Rate Limited',
      body: message || 'N/A',
      recipient: phoneNumber,
      status: 'rate_limited',
      error_message: `Daily limit of ${SMS_DAILY_LIMIT} SMS exceeded. Resets at ${rateLimit.reset_at}`,
      created_at: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'rate_limited',
        message: `Daily SMS limit reached. Resets at ${rateLimit.reset_at}`,
        remaining: 0
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate templated message if category is provided
  let finalMessage = message || '';
  if (category && isSmsEligibleCategory(category) && templateData) {
    finalMessage = generateSmsMessage(category, templateData);
    console.log(`[SMS] Generated template for ${category}: ${finalMessage.substring(0, 50)}...`);
  } else if (!finalMessage) {
    finalMessage = '[Chravel] You have a new notification. Check the app for details.';
  }

  const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  
  console.log(`[SMS] Sending to ${phoneNumber.substring(0, 6)}*** via Twilio`);
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioPhoneNumber,
        To: phoneNumber,
        Body: finalMessage
      }),
    }
  );

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`[SMS] Twilio error (${response.status}):`, responseText);
    
    // Log the failure
    await supabase.from('notification_logs').insert({
      user_id: userId,
      type: 'sms',
      title: 'SMS Failed',
      body: finalMessage,
      recipient: phoneNumber,
      status: 'failed',
      error_message: `Twilio error (${response.status}): ${responseText.substring(0, 200)}`,
      created_at: new Date().toISOString()
    });
    
    throw new Error(`Twilio error: ${responseText}`);
  }

  const result = JSON.parse(responseText);
  console.log(`[SMS] Sent successfully. SID: ${result.sid}`);

  // Increment the user's SMS counter
  await supabase.rpc('increment_sms_counter', { p_user_id: userId });

  // Log successful notification
  await supabase.from('notification_logs').insert({
    user_id: userId,
    type: 'sms',
    title: 'SMS Notification',
    body: finalMessage,
    recipient: phoneNumber,
    external_id: result.sid,
    status: 'sent',
    data: { category, twilioStatus: result.status },
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      sid: result.sid,
      status: result.status,
      remaining: rateLimit?.remaining ?? SMS_DAILY_LIMIT - 1
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function savePushToken({ userId, token, platform }: any) {
  const { data, error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token,
      platform: platform || 'web',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,token'
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function removePushToken({ userId, token }: any) {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}