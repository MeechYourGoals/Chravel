/**
 * HTML Template Renderer for PDF Export v3.1
 * Professional typography, clean page breaks, metadata
 * Text-only, no icons or emojis
 * Always shows section headers with empty state messaging
 */

import type { TripExportData, ExportLayout } from './types.ts';
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
 * Sections are rendered in alphabetical order: attachments, broadcasts, calendar, payments, places, polls, roster, tasks
 */
export async function renderTemplate(data: TripExportData): Promise<string> {
  const {
    tripId,
    tripTitle,
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
  const layoutName = layout === 'pro' ? 'ChravelApp Pro Summary' : 'One-Pager';

  // Render sections in alphabetical order
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(tripTitle)} — ChravelApp Export</title>
  <style>${styles}</style>
</head>
<body>
  ${renderHeader(data)}

  ${renderAttachmentsSection(attachments)}
  ${renderBroadcastsSection(broadcasts)}
  ${renderCalendarSection(calendar)}
  ${renderPaymentsSection(payments, totals)}
  ${renderPlacesSection(places)}
  ${renderPollsSection(polls)}
  ${renderMembersSection(roster)}
  ${renderTasksSection(tasks)}

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
  const { tripTitle, subtitle, destination, startDate, endDate } = data;
  
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
  </div>`;
}

function renderMembersSection(roster: any[] | undefined): string {
  return `
  <section class="section">
    <h2>Trip Members</h2>
    ${roster && roster.length > 0 ? `
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
    ` : `<p class="empty-message">No members available</p>`}
  </section>`;
}

function renderCalendarSection(calendar: any[] | undefined): string {
  if (!calendar || calendar.length === 0) {
    return `
    <section class="section">
      <h2>Calendar</h2>
      <p class="empty-message">No calendar events available</p>
    </section>`;
  }

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

function renderPaymentsSection(payments: any[] | undefined, totals: any): string {
  if (!payments || payments.length === 0) {
    return `
    <section class="section">
      <h2>Payments</h2>
      <p class="empty-message">No payments available</p>
    </section>`;
  }

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

function renderPollsSection(polls: any[] | undefined): string {
  if (!polls || polls.length === 0) {
    return `
    <section class="section">
      <h2>Polls</h2>
      <p class="empty-message">No polls available</p>
    </section>`;
  }

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

function renderTasksSection(tasks: any[] | undefined): string {
  if (!tasks || tasks.length === 0) {
    return `
    <section class="section">
      <h2>Tasks</h2>
      <p class="empty-message">No tasks available</p>
    </section>`;
  }

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

function renderPlacesSection(places: any[] | undefined): string {
  if (!places || places.length === 0) {
    return `
    <section class="section">
      <h2>Places & Links</h2>
      <p class="empty-message">No places or links available</p>
    </section>`;
  }

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
        </div>
        ${place.category ? `<div class="small"><strong>Category:</strong> ${escapeHtml(place.category)}</div>` : ''}
        ${place.notes ? `<div class="small">${escapeHtml(place.notes)}</div>` : ''}
        <div class="small link-url">
          <a href="${escapeHtml(place.url)}" target="_blank" rel="noopener noreferrer" class="place-link">
            ${escapeHtml(place.url)}
          </a>
        </div>
      </div>
    `).join('')}
  </section>`;
}

function renderBroadcastsSection(broadcasts: any[] | undefined): string {
  if (!broadcasts || broadcasts.length === 0) {
    return `
    <section class="section">
      <h2>Broadcasts</h2>
      <p class="empty-message">No broadcasts available</p>
    </section>`;
  }

  return `
  <section class="section">
    <h2>Broadcasts</h2>
    <table class="table">
      <thead>
        <tr>
          <th>From</th>
          <th>Message</th>
          <th>Date & Time</th>
        </tr>
      </thead>
      <tbody>
        ${broadcasts.map(b => `
          <tr>
            <td>${escapeHtml(b.sender)}</td>
            <td>${escapeHtml(b.message)}</td>
            <td>${escapeHtml(b.ts)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>`;
}

function renderAttachmentsSection(attachments: any[] | undefined): string {
  if (!attachments || attachments.length === 0) {
    return `
    <section class="section">
      <h2>Attachments</h2>
      <p class="empty-message">No attachments available</p>
    </section>`;
  }

  // Plain-text index only (no embeds in the body). Actual file pages are appended after
  // the main recap in the PDF post-processing step.
  return `
  <section class="section">
    <h2>Attachments</h2>
    <ul class="bullet-list">
      ${attachments.map(a => {
        const meta = [a.type ? escapeHtml(a.type) : null, a.date ? escapeHtml(a.date) : null].filter(Boolean).join(' • ');
        return `
          <li>
            <span class="file-name">${escapeHtml(a.name)}</span>
            ${meta ? `<span class="file-meta"> (${meta})</span>` : ''}
          </li>
        `;
      }).join('')}
    </ul>
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