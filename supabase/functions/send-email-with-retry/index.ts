/**
 * Email Send with Retry and Deliverability Features
 * Features:
 * - Exponential backoff retry logic (2s, 4s, 8s, 16s)
 * - Bounce tracking and suppression
 * - Email validation
 * - Template support
 * - DMARC/SPF compliance (configuration guidance)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface EmailRequest {
  to: string | string[];
  subject: string;
  content?: string;
  template?: string;
  templateData?: Record<string, any>;
  userId?: string;
  tripId?: string;
  maxRetries?: number;
}

const MAX_RETRIES = 4;
const RETRY_DELAYS = [2000, 4000, 8000, 16000]; // milliseconds

serve(async (req) => {
  const { createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('No authorization header', 401);
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const payload: EmailRequest = await req.json();

    // Validate required fields
    if (!payload.to || !payload.subject || (!payload.content && !payload.template)) {
      return createErrorResponse('Missing required fields: to, subject, and (content or template)', 400);
    }

    // Normalize recipients to array
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    // Validate email addresses
    for (const email of recipients) {
      if (!isValidEmail(email)) {
        return createErrorResponse(`Invalid email address: ${email}`, 400);
      }

      // Check if email should be suppressed
      const suppressed = await shouldSuppressEmail(email);
      if (suppressed) {
        return createErrorResponse(
          `Email address ${email} is suppressed due to previous bounces`,
          400
        );
      }
    }

    // Prepare email content
    let htmlContent = payload.content || '';
    if (payload.template) {
      htmlContent = renderTemplate(payload.template, payload.templateData || {});
    }

    // Add unsubscribe link (required for compliance)
    const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/unsubscribe-email?token=${generateUnsubscribeToken(recipients[0])}`;
    htmlContent += `<br/><br/><small><a href="${unsubscribeUrl}">Unsubscribe</a></small>`;

    const maxRetries = payload.maxRetries ?? MAX_RETRIES;
    let lastError: Error | null = null;

    // Attempt sending with retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await sendEmailViaProvider(
          recipients,
          payload.subject,
          htmlContent,
          user.id
        );

        // Log successful send
        await logNotification(
          payload.userId || user.id,
          recipients,
          payload.subject,
          htmlContent,
          'sent',
          null,
          attempt
        );

        return createSecureResponse(
          JSON.stringify({
            success: true,
            messageId: result.messageId,
            recipients: recipients.length,
            attempts: attempt + 1
          }),
          200,
          { 'Content-Type': 'application/json' }
        );

      } catch (error) {
        lastError = error as Error;
        console.error(`Email send attempt ${attempt + 1} failed:`, error);

        // Check if it's a permanent failure (don't retry)
        if (isPermanentFailure(error as Error)) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await handleBounce(recipients[0], 'hard', errorMessage);
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await sleep(RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]);
        }
      }
    }

    // All retries failed
    await logNotification(
      payload.userId || user.id,
      recipients,
      payload.subject,
      htmlContent,
      'failed',
      lastError?.message || null,
      maxRetries + 1
    );

    return createErrorResponse(
      `Failed to send email after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      500
    );

  } catch (error) {
    console.error('Email send error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(errorMessage, 500);
  }
});

async function sendEmailViaProvider(
  recipients: string[],
  subject: string,
  htmlContent: string,
  fromUserId: string
): Promise<{ messageId: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');

  // Try Resend first (preferred)
  if (resendApiKey) {
    return await sendViaResend(recipients, subject, htmlContent, resendApiKey);
  }

  // Fallback to SendGrid
  if (sendgridApiKey) {
    return await sendViaSendGrid(recipients, subject, htmlContent, sendgridApiKey);
  }

  throw new Error('No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY)');
}

async function sendViaResend(
  recipients: string[],
  subject: string,
  html: string,
  apiKey: string
): Promise<{ messageId: string }> {
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@chravel.app';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject,
      html,
      headers: {
        'X-Entity-Ref-ID': crypto.randomUUID(), // For tracking
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }

  const result = await response.json();
  return { messageId: result.id };
}

async function sendViaSendGrid(
  recipients: string[],
  subject: string,
  html: string,
  apiKey: string
): Promise<{ messageId: string }> {
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@chravel.app';

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: recipients.map(email => ({ email })),
        subject
      }],
      from: {
        email: fromEmail,
        name: 'ChravelApp'
      },
      content: [{
        type: 'text/html',
        value: html
      }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  // SendGrid doesn't return message ID in response for single sends
  const messageId = response.headers.get('X-Message-Id') || crypto.randomUUID();
  return { messageId };
}

async function shouldSuppressEmail(email: string): Promise<boolean> {
  const { data } = await supabase.rpc('should_suppress_email', {
    p_email: email
  });

  return data || false;
}

async function handleBounce(email: string, bounceType: 'hard' | 'soft' | 'complaint', reason: string) {
  await supabase
    .from('email_bounces')
    .upsert({
      email,
      bounce_type: bounceType,
      bounce_count: 1,
      last_bounce_at: new Date().toISOString(),
      suppressed: bounceType === 'hard' || bounceType === 'complaint'
    }, {
      onConflict: 'email,bounce_type',
      ignoreDuplicates: false
    });

  console.log(`Bounce recorded: ${email} (${bounceType})`);
}

async function logNotification(
  userId: string,
  recipients: string[],
  subject: string,
  content: string,
  status: string,
  error: string | null,
  retryCount: number
) {
  await supabase
    .from('notification_logs')
    .insert({
      user_id: userId,
      type: 'email',
      title: subject,
      body: content.substring(0, 500), // Truncate for storage
      recipient: recipients.join(', '),
      success: status === 'sent' ? recipients.length : 0,
      failure: status === 'failed' ? recipients.length : 0,
      delivery_status: status,
      retry_count: retryCount,
      sent_at: new Date().toISOString()
    });
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isPermanentFailure(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('invalid email') ||
    message.includes('does not exist') ||
    message.includes('mailbox not found') ||
    message.includes('550') || // SMTP permanent failure
    message.includes('bounced')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function renderTemplate(templateName: string, data: Record<string, any>): string {
  // Simple template rendering - in production, use a proper template engine
  const templates: Record<string, string> = {
    'trip_invite': `
      <h2>You're invited to join a trip!</h2>
      <p>Hi ${data.recipientName || 'there'},</p>
      <p>${data.inviterName} has invited you to join the trip: <strong>${data.tripName}</strong></p>
      <p><a href="${data.inviteLink}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Trip</a></p>
      <p>This invitation expires in 7 days.</p>
    `,
    'payment_reminder': `
      <h2>Payment Reminder</h2>
      <p>Hi ${data.recipientName},</p>
      <p>You have a pending payment of <strong>${data.amount} ${data.currency}</strong> for ${data.description}.</p>
      <p><a href="${data.paymentLink}">View Details</a></p>
    `,
    'trip_summary': `
      <h2>Trip Summary: ${data.tripName}</h2>
      <p>Here's a summary of your trip:</p>
      <ul>
        <li>Dates: ${data.startDate} - ${data.endDate}</li>
        <li>Participants: ${data.participantCount}</li>
        <li>Total Expenses: ${data.totalExpenses}</li>
      </ul>
      <p><a href="${data.tripLink}">View Full Trip</a></p>
    `
  };

  return templates[templateName] || `<p>${data.content}</p>`;
}

function generateUnsubscribeToken(email: string): string {
  // In production, use proper token generation and storage
  return btoa(email + ':' + Date.now());
}
