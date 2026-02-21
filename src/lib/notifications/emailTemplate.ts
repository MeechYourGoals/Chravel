/**
 * HTML email template for ChravelApp notifications.
 *
 * Requirements:
 * - From: ChravelApp <support@chravelapp.com>
 * - Clear subject lines
 * - Simple branded HTML + plaintext fallback
 * - Strong CTA button/link: "Open in ChravelApp"
 * - Trip/event context and notification type
 * - Timestamp
 * - Footer with why-received and settings link
 */

import type { EmailContent } from './contentBuilder';

const APP_URL = 'https://app.chravelapp.com';
const SETTINGS_URL = `${APP_URL}/settings`;

export function buildEmailHtml(content: EmailContent): string {
  const timestamp = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111111;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1a1a1a;border-radius:12px;border:1px solid #333;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #333;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:700;color:#f59e0b;">ChravelApp</span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#888;">${escapeHtml(timestamp)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                ${escapeHtml(content.heading)}
              </h1>
              <p style="margin:0 0 24px 0;font-size:16px;color:#cccccc;line-height:1.6;">
                ${escapeHtml(content.bodyText)}
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f59e0b;border-radius:8px;">
                    <a href="${escapeHtml(content.ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#000000;font-size:16px;font-weight:600;text-decoration:none;">
                      ${escapeHtml(content.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #333;">
              <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">
                ${escapeHtml(content.footerText)}
                <br />
                <a href="${escapeHtml(SETTINGS_URL)}" style="color:#f59e0b;text-decoration:underline;">Manage notification settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailPlaintext(content: EmailContent): string {
  return [
    content.heading,
    '',
    content.bodyText,
    '',
    `${content.ctaLabel}: ${content.ctaUrl}`,
    '',
    '---',
    content.footerText,
    `Manage settings: ${SETTINGS_URL}`,
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
