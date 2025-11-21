import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

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

async function sendSMSNotification({ userId, phoneNumber, message }: any) {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  
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
        Body: message
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
  }

  const result = await response.json();

  // Log notification in database
  await supabase
    .from('notification_logs')
    .insert({
      user_id: userId,
      type: 'sms',
      title: 'SMS Notification',
      body: message,
      recipient: phoneNumber,
      external_id: result.sid,
      sent_at: new Date().toISOString()
    });

  return new Response(
    JSON.stringify(result),
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