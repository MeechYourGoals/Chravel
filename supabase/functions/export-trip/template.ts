/**
 * HTML Template Renderer for PDF Export v3.0
 * Professional typography, clean page breaks, metadata
 * Text-only, no icons or emojis
 */

import type { TripExportData } from './types.ts';
import { calculateNetSettlement } from './util.ts';

/**
 * Load external CSS file
 */
async function loadStyles(): Promise<string> {
  try {
    const cssPath = new URL('./styles.css', import.meta.url).pathname;
    const css = await Deno.readTextFile(cssPath);
    return css;
  } catch (error) {
    console.error('[TEMPLATE] Failed to load styles.css:', error);
    return ''; // Fallback to no styles if file can't be read
  }
}

/**
 * Render complete HTML document with embedded styles
 */
export async function renderTemplate(data: TripExportData): Promise<string> {
  const {
    tripId,
    tripTitle,
    subtitle,
    destination,
    startDate,
    endDate,
    deeplinkQrSvg,
    generatedAtLocal,
    layout,
    totals,
    roster,
    calendar,
    payments,
    polls,
    tasks,
    places,
    broadcasts,
    attachments,
  } = data;

  const styles = await loadStyles();
  const layoutName = layout === 'pro' ? 'Chravel Pro Summary' : 'One-Pager';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(tripTitle)} — Chravel Export</title>
  <style>${styles}</style>
</head>
<body>
  ${renderHeader(data)}

  ${roster && roster.length > 0 && layout === 'pro' ? renderRoster(roster) : ''}
  ${calendar && calendar.length > 0 ? renderCalendar(calendar) : ''}
  ${payments && payments.length > 0 ? renderPayments(payments, totals) : ''}
  ${polls && polls.length > 0 ? renderPolls(polls) : ''}
  ${tasks && tasks.length > 0 ? renderTasks(tasks) : ''}
  ${places && places.length > 0 ? renderPlaces(places) : ''}
  ${broadcasts && broadcasts.length > 0 && layout === 'pro' ? renderBroadcasts(broadcasts) : ''}
  ${attachments && attachments.length > 0 && layout === 'pro' ? renderAttachments(attachments) : ''}

  <div class="footer-text">
    Generated on ${escapeHtml(generatedAtLocal)} &nbsp;•&nbsp; ${layoutName} &nbsp;•&nbsp; Trip ID: ${escapeHtml(tripId)}
  </div>
</body>
</html>`;
}

/**
 * Simple Text Header (No Cover Image)
 */
function renderHeader(data: TripExportData): string {
  const { tripTitle, subtitle, destination, startDate, endDate, deeplinkQrSvg } = data;
  
  const hasMeta = destination || (startDate && endDate);
  const metaText = [
    destination ? escapeHtml(destination) : null,
    startDate && endDate ? `${escapeHtml(startDate)} – ${escapeHtml(endDate)}` : null,
  ].filter(Boolean).join(' &nbsp;•&nbsp; ');

  return `
  <div class="header">
    <div class="header-content">
      <h1>${escapeHtml(tripTitle)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
      ${hasMeta ? `<div class="meta">${metaText}</div>` : ''}
    </div>
    ${deeplinkQrSvg ? `
    <div class="header-qr">
      ${deeplinkQrSvg}
      <div class="qr-label">Scan to open live trip</div>
    </div>` : ''}
  </div>`;
}

function renderRoster(roster: any[]): string {
  return `
  <section class="section">
    <h2>Roster & Contacts</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Dept</th>
          <th>Email</th>
          <th>Phone</th>
        </tr>
      </thead>
      <tbody>
        ${roster.map(m => `
          <tr>
            <td>${escapeHtml(m.name)}</td>
            <td>${m.role ? escapeHtml(m.role) : '—'}</td>
            <td>${m.dept ? escapeHtml(m.dept) : '—'}</td>
            <td>${m.email ? escapeHtml(m.email) : '—'}</td>
            <td>${m.phone ? escapeHtml(m.phone) : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>`;
}

function renderCalendar(calendar: any[]): string {
  let currentDay = '';
  let rows = '';

  calendar.forEach(item => {
    if (item.dayLabel !== currentDay) {
      currentDay = item.dayLabel;
      rows += `<div class="day-header">${escapeHtml(item.dayLabel)}</div>`;
    }
    rows += `
      <div class="event-item">
        <div><strong>${escapeHtml(item.title)}</strong> <span class="small">${escapeHtml(item.time)}</span></div>
        ${item.location ? `<div class="small">Location: ${escapeHtml(item.location)}</div>` : ''}
        ${item.notes ? `<div class="small">${escapeHtml(item.notes)}</div>` : ''}
      </div>`;
  });

  return `
  <section class="section">
    <h2>Calendar</h2>
    ${rows}
  </section>`;
}

function renderPayments(payments: any[], totals: any): string {
  const netSettlement = calculateNetSettlement(payments);
  
  return `
  <section class="section">
    <h2>Payments</h2>
    ${totals?.paymentsTotal ? `<p class="small"><strong>Total:</strong> <span class="tt">${totals.currency || 'USD'} ${totals.paymentsTotal.toFixed(2)}</span></p>` : ''}
    ${netSettlement ? `<p class="small net-settlement"><strong>Net Settlement:</strong> ${escapeHtml(netSettlement)}</p>` : ''}
    
    ${payments.map(p => `
      <div class="card">
        <div class="payment-header">
          <strong>${escapeHtml(p.title)}</strong>
          <span class="tt payment-amount">${p.currency} ${p.amount.toFixed(2)}</span>
        </div>
        <div class="small">
          Payer: ${escapeHtml(p.payer)}
          &nbsp;•&nbsp;
          Status: <span class="chip ${p.status === 'Paid' ? 'success' : (p.status === 'Overdue' ? 'danger' : 'warn')}">${p.status}</span>
          ${p.due ? ` &nbsp;•&nbsp; Due: ${escapeHtml(p.due)}` : ''}
        </div>
        ${p.split && p.split.length > 0 ? `
          <table class="table payment-split">
            <thead>
              <tr>
                <th>Member</th>
                <th class="money">Owes</th>
                <th>Status</th>
                <th>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              ${p.split.map((s: any) => `
                <tr>
                  <td>${escapeHtml(s.name)}</td>
                  <td class="money">${s.owes.toFixed(2)}</td>
                  <td><span class="chip ${s.paid ? 'success' : ''}">${s.paid ? 'Paid' : 'Unpaid'}</span></td>
                  <td>${s.paid_at ? escapeHtml(s.paid_at) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `).join('')}
  </section>`;
}

function renderPolls(polls: any[]): string {
  return `
  <section class="section">
    <h2>Polls</h2>
    ${polls.map(poll => `
      <div class="card">
        <strong>${escapeHtml(poll.question)}</strong>
        <table class="table poll-table">
          <thead>
            <tr>
              <th>Option</th>
              <th class="money">Votes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${poll.options.map((opt: any) => `
              <tr>
                <td>${escapeHtml(opt.text)}</td>
                <td class="money">${opt.votes}</td>
                <td>${opt.winner ? '<strong>Winner</strong>' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </section>`;
}

function renderTasks(tasks: any[]): string {
  return `
  <section class="section">
    <h2>Tasks</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Owner</th>
          <th>Due</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(t => `
          <tr>
            <td>${escapeHtml(t.title)}</td>
            <td>${escapeHtml(t.owner || '—')}</td>
            <td>${escapeHtml(t.due || '—')}</td>
            <td><span class="chip ${t.status === 'Done' ? 'success' : (t.status === 'Blocked' ? 'danger' : 'warn')}">${t.status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>`;
}

function renderPlaces(places: any[]): string {
  return `
  <section class="section">
    <h2>Places & Links</h2>
    ${places.map(place => `
      <div class="card place-card">
        <div class="place-header">
          <div>
            <strong>${escapeHtml(place.title)}</strong>
            <span class="small"> (${escapeHtml(place.domain)})</span>
          </div>
          ${place.qrSvg ? `<div class="qr-small">${place.qrSvg}</div>` : ''}
        </div>
        ${place.category ? `<div class="small"><strong>Category:</strong> ${escapeHtml(place.category)}</div>` : ''}
        ${place.notes ? `<div class="small">${escapeHtml(place.notes)}</div>` : ''}
        <div class="small link-url">${escapeHtml(place.url)}</div>
      </div>
    `).join('')}
  </section>`;
}

function renderBroadcasts(broadcasts: any[]): string {
  return `
  <section class="section">
    <h2>Broadcast Log</h2>
    <table class="table">
      <thead>
        <tr>
          <th>When</th>
          <th>Priority</th>
          <th>Message</th>
          <th>Read Rate</th>
        </tr>
      </thead>
      <tbody>
        ${broadcasts.map(b => `
          <tr>
            <td>${escapeHtml(b.ts)}</td>
            <td><span class="chip ${b.priority === 'High' ? 'warn' : ''}">${b.priority || 'Normal'}</span></td>
            <td>${escapeHtml(b.message)}</td>
            <td>${b.readRate ? escapeHtml(b.readRate) : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>`;
}

function renderAttachments(attachments: any[]): string {
  return `
  <section class="section">
    <h2>Attachments</h2>
    <table class="table">
      <thead>
        <tr>
          <th>File</th>
          <th>Type</th>
          <th>Uploaded by</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${attachments.map(a => `
          <tr>
            <td>${escapeHtml(a.name)}</td>
            <td>${escapeHtml(a.type)}</td>
            <td>${escapeHtml(a.uploaded_by || '—')}</td>
            <td>${escapeHtml(a.date || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
