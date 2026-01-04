/**
 * Client-Side PDF Export Fallback
 * Generates PDFs using jsPDF when server export fails or for mock trips
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportSection, PDFCustomizationOptions, PDFProgressCallback } from '@/types/tripExport';

/**
 * Font loading for jsPDF
 * Fetches a font from a URL and returns it as a base64 encoded string.
 * This is used to embed Unicode-capable fonts into the client-side PDF.
 * @param url The URL of the font file to fetch.
 * @returns A promise that resolves with the base64 encoded font data.
 */

/**
 * Safely retrieves the finalY position from the last autoTable call
 * @param doc The jsPDF document instance
 * @param fallback The fallback Y position if finalY is not available
 * @returns The finalY position or fallback
 */
function getFinalY(doc: jsPDF, fallback: number): number {
  const last = (doc as any).lastAutoTable;
  const val = last?.finalY;
  return typeof val === 'number' && isFinite(val) ? val : fallback;
}

/**
 * Font loading for jsPDF
 * Fetches a font from a URL and returns it as a base64 encoded string.
 * This is used to embed Unicode-capable fonts into the client-side PDF.
 * @param url The URL of the font file to fetch.
 * @returns A promise that resolves with the base64 encoded font data.
 */
async function getFontAsBase64(url: string, timeoutMs: number = 5000): Promise<string> {
  // Add timeout to prevent hanging in PWA mode on iOS
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Font fetch failed: ${response.status}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Strip the data URL prefix to get just the base64 data
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to read font as base64.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading font file.'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Loads and embeds the Noto Sans font family into the jsPDF document.
 * This ensures that Unicode characters are properly rendered in the PDF.
 * Falls back to built-in Helvetica font if loading fails (e.g., in offline PWA mode).
 * @param doc The jsPDF instance.
 */
async function embedNotoSansFont(doc: jsPDF): Promise<void> {
  try {
    // Load fonts in parallel for faster loading (especially on mobile)
    const [fontNormal, fontBold, fontItalic, fontBoldItalic] = await Promise.all([
      getFontAsBase64(
        'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-normal.ttf',
      ),
      getFontAsBase64(
        'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-normal.ttf',
      ),
      getFontAsBase64(
        'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-italic.ttf',
      ),
      getFontAsBase64(
        'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-italic.ttf',
      ),
    ]);

    doc.addFileToVFS('NotoSans-Regular.ttf', fontNormal);
    doc.addFileToVFS('NotoSans-Bold.ttf', fontBold);
    doc.addFileToVFS('NotoSans-Italic.ttf', fontItalic);
    doc.addFileToVFS('NotoSans-BoldItalic.ttf', fontBoldItalic);

    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
    doc.addFont('NotoSans-Italic.ttf', 'NotoSans', 'italic');
    doc.addFont('NotoSans-BoldItalic.ttf', 'NotoSans', 'bolditalic');

    doc.setFont('NotoSans', 'normal');
  } catch (error) {
    console.warn('Failed to load custom fonts, using built-in Helvetica:', error);
    // jsPDF has Helvetica as default, just ensure it's set
    doc.setFont('helvetica', 'normal');
  }
}

interface ExportData {
  tripId: string;
  tripTitle: string;
  destination?: string;
  dateRange?: string;
  description?: string;
  calendar?: Array<{
    title: string;
    start_time: string;
    end_time?: string;
    location?: string;
    description?: string;
  }>;
  payments?: {
    items: Array<{
      description: string;
      amount: number;
      currency: string;
      split_count: number;
      is_settled: boolean;
    }>;
    total: number;
    currency: string;
  };
  polls?: Array<{
    question: string;
    options: any;
    total_votes: number;
  }>;
  tasks?: Array<{
    title: string;
    description?: string;
    completed: boolean;
  }>;
  places?: Array<{
    name: string;
    url: string;
    description?: string;
    votes: number;
  }>;
  roster?: Array<{
    name: string;
    role?: string;
  }>;
  broadcasts?: Array<{
    message: string;
    priority: string;
    timestamp: string;
    sender: string;
    read_count: number;
  }>;
  attachments?: Array<{
    name: string;
    type: string;
    uploaded_at: string;
    uploaded_by?: string;
  }>;
}

/**
 * Chunk array into smaller arrays for pagination
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Parse hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [66, 139, 202]; // Default blue
}

function sanitizePdfText(value: string): string {
  if (!value) return '';
  return (
    value
      .normalize('NFKC')
      // eslint-disable-next-line no-control-regex -- Intentionally removing control characters from PDF text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\s+/g, ' ')
  );
}

function formatEventDateTime(start?: string, end?: string): string {
  if (!start) return 'N/A';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'N/A';

  const startText = startDate.toLocaleString();
  if (!end) return startText;

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startText;

  const sameDay = startDate.toDateString() === endDate.toDateString();
  const endText = sameDay
    ? endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : endDate.toLocaleString();

  return `${startText} - ${endText}`;
}

/**
 * Enhanced PDF generation with pagination, progress, and customization
 */
export async function generateClientPDF(
  data: ExportData,
  sections: ExportSection[],
  options?: {
    customization?: PDFCustomizationOptions;
    onProgress?: PDFProgressCallback;
  },
): Promise<Blob> {
  const { customization, onProgress } = options || {};
  // Clamp maxItemsPerSection to ensure it's always >= 1 to prevent infinite loops
  // Negative or zero values would cause chunkArray's loop to never progress
  const maxItems = Math.max(1, Math.floor(customization?.maxItemsPerSection || 100));
  const primaryColor = customization?.primaryColor || '#428BCA';
  const secondaryColor = customization?.secondaryColor || '#5BC0DE';
  const [primaryR, primaryG, primaryB] = hexToRgb(primaryColor);
  const [secondaryR, secondaryG, secondaryB] = hexToRgb(secondaryColor);

  // Report progress
  const reportProgress = (
    stage: 'preparing' | 'rendering' | 'finalizing',
    current: number,
    total: number,
    message: string,
  ) => {
    onProgress?.({ stage, current, total, message });
  };

  reportProgress('preparing', 0, sections.length + 2, 'Initializing PDF...');

  // Always use letter size and privacy is enforced server-side
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
    compress: customization?.compress !== false, // Enable compression by default
  });

  // Embed the Unicode font
  await embedNotoSansFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Header
  doc.setFontSize(24);
  doc.setFont('NotoSans', 'bold');
  doc.text(sanitizePdfText(data.tripTitle), margin, yPos);
  yPos += 30;

  if (data.destination) {
    doc.setFontSize(12);
    doc.setFont('NotoSans', 'normal');
    doc.text(sanitizePdfText(data.destination), margin, yPos);
    yPos += 20;
  }

  if (data.dateRange) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(sanitizePdfText(data.dateRange), margin, yPos);
    yPos += 20;
  }

  if (data.description) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    const descriptionText = sanitizePdfText(data.description);
    const splitDesc = doc.splitTextToSize(descriptionText, contentWidth);
    doc.text(splitDesc, margin, yPos);
    yPos += splitDesc.length * 14 + 10;
  }

  // Add a separator line
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 30;

  // Determine section order (use customization or default)
  const sectionOrder = customization?.sectionOrder || sections;
  const orderedSections = sectionOrder.filter(s => sections.includes(s));

  // Sections - render in order
  doc.setFontSize(14);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0);

  let sectionIndex = 0;
  for (const section of orderedSections) {
    sectionIndex++;
    reportProgress(
      'rendering',
      sectionIndex,
      orderedSections.length + 2,
      `Rendering ${section}...`,
    );

    // Calendar section
    if (section === 'calendar') {
      yPos = checkPageBreak(doc, yPos, 60);

      const events = (data.calendar || []).slice().sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
      if (events.length > 0) {
        // Paginate if too many events
        const eventChunks = events.length > maxItems ? chunkArray(events, maxItems) : [events];

        for (let chunkIndex = 0; chunkIndex < eventChunks.length; chunkIndex++) {
          const chunk = eventChunks[chunkIndex];

          // Add page break if needed
          yPos = checkPageBreak(doc, yPos, 60);

          // Add section header only on first chunk
          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Calendar', margin, yPos);
            yPos += 20;
          }

          const eventRows = chunk.map((event: any) => {
            const description = event.description ? sanitizePdfText(event.description) : '';
            const truncatedDescription =
              description.length > 60 ? `${description.slice(0, 60)}...` : description;

            return [
              sanitizePdfText(event.title || 'Untitled Event'),
              formatEventDateTime(event.start_time, event.end_time),
              sanitizePdfText(event.location || 'N/A'),
              truncatedDescription || ' ',
            ];
          });

          autoTable(doc, {
            startY: yPos,
            head: [['Event', 'Date & Time', 'Location', 'Description']],
            body: eventRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
          });

          yPos = getFinalY(doc, yPos) + 10;

          // If more chunks, add continuation note
          if (chunkIndex < eventChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued on next page - showing ${(chunkIndex + 1) * maxItems} of ${events.length} events)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(120);
        doc.text('No calendar events available', margin, yPos);
        yPos += 30;
      }
    }

    // Payments section
    if (section === 'payments') {
      yPos = checkPageBreak(doc, yPos, 60);

      const payments = data.payments?.items || [];
      if (payments.length > 0) {
        // Paginate if too many payments
        const paymentChunks =
          payments.length > maxItems ? chunkArray(payments, maxItems) : [payments];

        for (let chunkIndex = 0; chunkIndex < paymentChunks.length; chunkIndex++) {
          const chunk = paymentChunks[chunkIndex];

          yPos = checkPageBreak(doc, yPos, 60);

          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Payments', margin, yPos);
            yPos += 20;
          }

          const paymentRows = chunk.map((p: any) => [
            sanitizePdfText(p.description || 'N/A'),
            `${p.currency || 'USD'} ${p.amount?.toFixed(2) || '0.00'}`,
            `${p.split_count || 0} people`,
            p.is_settled ? 'Settled' : 'Pending',
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Description', 'Amount', 'Split', 'Status']],
            body: paymentRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
          });

          yPos = getFinalY(doc, yPos) + 10;

          // Display total only on last chunk
          if (chunkIndex === paymentChunks.length - 1) {
            doc.setFontSize(10);
            doc.setFont('NotoSans', 'bold');
            doc.text(
              `Total: ${data.payments?.currency || 'USD'} ${(data.payments?.total || 0).toFixed(2)}`,
              margin,
              yPos,
            );
            yPos += 30;
          }

          if (chunkIndex < paymentChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued - showing ${(chunkIndex + 1) * maxItems} of ${payments.length} payments)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(120);
        doc.text('No payment records available', margin, yPos);
        yPos += 30;
      }
    }

    // Polls section
    if (section === 'polls') {
      yPos = checkPageBreak(doc, yPos, 60);

      const polls = data.polls || [];
      if (polls.length > 0) {
        // Paginate polls if too many
        const pollChunks = polls.length > maxItems ? chunkArray(polls, maxItems) : [polls];

        for (let chunkIndex = 0; chunkIndex < pollChunks.length; chunkIndex++) {
          const chunk = pollChunks[chunkIndex];

          yPos = checkPageBreak(doc, yPos, 60);

          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Polls', margin, yPos);
            yPos += 20;
          }

          chunk.forEach((poll: any, index: number) => {
            yPos = checkPageBreak(doc, yPos, 80);

            doc.setFontSize(11);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            const pollNumber = chunkIndex * maxItems + index + 1;
            doc.text(`${pollNumber}. ${sanitizePdfText(poll.question)}`, margin, yPos);
            yPos += 15;

            if (poll.options && poll.options.length > 0) {
              const pollRows = poll.options.map((opt: any) => {
                const percentage =
                  poll.total_votes > 0 ? ((opt.votes / poll.total_votes) * 100).toFixed(1) : '0.0';
                return [
                  sanitizePdfText(opt.text || 'N/A'),
                  `${opt.votes || 0} votes`,
                  `${percentage}%`,
                ];
              });

              autoTable(doc, {
                startY: yPos,
                body: pollRows,
                theme: 'plain',
                margin: { left: margin + 20, right: margin },
                styles: { fontSize: 9, cellPadding: 3 },
              });

              yPos = getFinalY(doc, yPos) + 5;
            }

            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(100);
            const totalVotes = Math.max(0, Number(poll.total_votes || 0));
            doc.text(`Total votes: ${totalVotes}`, margin + 20, yPos);
            yPos += 20;
          });

          if (chunkIndex < pollChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued - showing ${(chunkIndex + 1) * maxItems} of ${polls.length} polls)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(120);
        doc.text('No polls available', margin, yPos);
        yPos += 30;
      }
    }

    // Places section
    if (section === 'places') {
      yPos = checkPageBreak(doc, yPos, 60);

      const places = data.places || [];
      if (places.length > 0) {
        const placeChunks = places.length > maxItems ? chunkArray(places, maxItems) : [places];

        for (let chunkIndex = 0; chunkIndex < placeChunks.length; chunkIndex++) {
          const chunk = placeChunks[chunkIndex];

          yPos = checkPageBreak(doc, yPos, 60);

          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Places & Links', margin, yPos);
            yPos += 20;
          }

          // Helper to shorten URLs for display
          const shortenUrl = (url: string, maxLen: number = 45): string => {
            if (!url || url.length <= maxLen) return url;
            try {
              const parsed = new URL(url);
              const domain = parsed.hostname.replace('www.', '');
              const path = parsed.pathname.slice(0, 15);
              return `${domain}${path}${path.length < parsed.pathname.length ? '...' : ''}`;
            } catch {
              return url.slice(0, maxLen) + '...';
            }
          };

          const placeRows = chunk.map((place: any) => [
            sanitizePdfText(place.name || 'N/A'),
            sanitizePdfText(shortenUrl(place.url || 'N/A')),
            place.votes?.toString() || '0',
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Name', 'URL', 'Votes']],
            body: placeRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: {
              fontSize: 9,
              cellPadding: 4,
              overflow: 'linebreak',
            },
            columnStyles: {
              0: { cellWidth: contentWidth * 0.4 }, // Name - 40%
              1: { cellWidth: contentWidth * 0.48 }, // URL - 48%
              2: { cellWidth: contentWidth * 0.12, halign: 'center' }, // Votes - 12%
            },
          });

          yPos = getFinalY(doc, yPos) + 10;

          if (chunkIndex < placeChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued - showing ${(chunkIndex + 1) * maxItems} of ${places.length} places)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(120);
        doc.text('No places saved', margin, yPos);
        yPos += 30;
      }
    }

    // Tasks section
    if (section === 'tasks') {
      yPos = checkPageBreak(doc, yPos, 60);

      const tasks = data.tasks || [];
      if (tasks.length > 0) {
        const taskChunks = tasks.length > maxItems ? chunkArray(tasks, maxItems) : [tasks];

        for (let chunkIndex = 0; chunkIndex < taskChunks.length; chunkIndex++) {
          const chunk = taskChunks[chunkIndex];

          yPos = checkPageBreak(doc, yPos, 60);

          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Tasks', margin, yPos);
            yPos += 20;
          }

          const taskRows = chunk.map((task: any) => [
            sanitizePdfText(task.title || task.description || 'N/A'),
            task.completed ? '[x] Done' : '[ ] Pending',
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Task', 'Status']],
            body: taskRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
          });

          yPos = getFinalY(doc, yPos) + 10;

          if (chunkIndex < taskChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued - showing ${(chunkIndex + 1) * maxItems} of ${tasks.length} tasks)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(120);
        doc.text('No tasks available', margin, yPos);
        yPos += 30;
      }
    }

    // Broadcasts section (Pro/Events only)
    if (section === 'broadcasts') {
      yPos = checkPageBreak(doc, yPos, 60);

      const broadcasts = data.broadcasts || [];
      if (broadcasts.length > 0) {
        const broadcastChunks =
          broadcasts.length > maxItems ? chunkArray(broadcasts, maxItems) : [broadcasts];

        for (let chunkIndex = 0; chunkIndex < broadcastChunks.length; chunkIndex++) {
          const chunk = broadcastChunks[chunkIndex];

          yPos = checkPageBreak(doc, yPos, 60);

          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Broadcasts', margin, yPos);
            yPos += 20;
          }

          chunk.forEach((broadcast: any, index: number) => {
            yPos = checkPageBreak(doc, yPos, 80);

            // Priority indicator
            const priorityColor = broadcast.priority === 'urgent' ? [220, 38, 38] : [100, 100, 100];
            doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'bold');
            doc.text(broadcast.priority.toUpperCase(), margin, yPos);

            // Timestamp
            doc.setTextColor(100);
            doc.setFont('NotoSans', 'normal');
            const timestamp = new Date(broadcast.timestamp).toLocaleString();
            doc.text(`  •  ${timestamp}`, margin + 50, yPos);
            yPos += 15;

            // Message
            doc.setFontSize(10);
            doc.setFont('NotoSans', 'normal');
            doc.setTextColor(0);
            const messageLines = doc.splitTextToSize(
              sanitizePdfText(broadcast.message),
              contentWidth - 20,
            );
            doc.text(messageLines, margin + 10, yPos);
            yPos += messageLines.length * 14 + 5;

            // Sender and read count
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `Sent by: ${sanitizePdfText(broadcast.sender)}  •  ${broadcast.read_count} read`,
              margin + 10,
              yPos,
            );
            yPos += 20;
          });

          if (chunkIndex < broadcastChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued - showing ${(chunkIndex + 1) * maxItems} of ${broadcasts.length} broadcasts)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(120);
        doc.text('No broadcasts available', margin, yPos);
        yPos += 30;
      }
    }

    // Pro sections (always available if selected)
    if (section === 'roster') {
      yPos = checkPageBreak(doc, yPos, 60);

      const roster = data.roster || [];
      if (roster.length > 0) {
        const rosterChunks = roster.length > maxItems ? chunkArray(roster, maxItems) : [roster];

        for (let chunkIndex = 0; chunkIndex < rosterChunks.length; chunkIndex++) {
          const chunk = rosterChunks[chunkIndex];

          yPos = checkPageBreak(doc, yPos, 60);

          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Roster', margin, yPos);
            yPos += 20;
          }

          const rosterRows = chunk.map((member: any) => [
            sanitizePdfText(member.name || 'N/A'),
            sanitizePdfText(member.role || 'member'),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Name', 'Role']],
            body: rosterRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
          });

          yPos = getFinalY(doc, yPos) + 10;

          if (chunkIndex < rosterChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued - showing ${(chunkIndex + 1) * maxItems} of ${roster.length} members)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }
      } else {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(120);
        doc.text('No roster data available', margin, yPos);
        yPos += 30;
      }
    }

    // Attachments section
    if (section === 'attachments') {
      yPos = checkPageBreak(doc, yPos, 60);

      const attachments = data.attachments || [];
      // Match server behavior: if no attachments exist, omit the section entirely.
      if (attachments.length > 0) {
        const attachmentChunks =
          attachments.length > maxItems ? chunkArray(attachments, maxItems) : [attachments];

        for (let chunkIndex = 0; chunkIndex < attachmentChunks.length; chunkIndex++) {
          const chunk = attachmentChunks[chunkIndex];

          yPos = checkPageBreak(doc, yPos, 60);

          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Attachments', margin, yPos);
            yPos += 20;
          }

          const attachmentRows = chunk.map((att: any) => [
            sanitizePdfText(att.name || 'Unnamed file'),
            sanitizePdfText(att.type || 'Unknown'),
            sanitizePdfText(att.uploaded_by || 'Unknown'),
            att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString() : 'N/A',
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['File Name', 'Type', 'Uploaded By', 'Date']],
            body: attachmentRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
          });

          yPos = getFinalY(doc, yPos) + 10;

          if (chunkIndex < attachmentChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(
              `(Continued - showing ${(chunkIndex + 1) * maxItems} of ${attachments.length} attachments)`,
              margin,
              yPos,
            );
            yPos += 20;
            doc.addPage();
            yPos = margin;
          }
        }

        // Add note about viewing full attachments
        yPos = checkPageBreak(doc, yPos, 20);
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'italic');
        doc.setTextColor(100);
        doc.text('Note: Download full attachments from the Chravel app', margin, yPos);
        yPos += 20;
      }
    }
  }

  // Footer
  reportProgress(
    'finalizing',
    orderedSections.length + 1,
    orderedSections.length + 2,
    'Finalizing PDF...',
  );

  const footerText = customization?.footerText || 'From www.Chravel.App';
  const brandTitle = 'ChravelApp Recap';
  const brandTagline = 'The Group Chat Travel App';

  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1; // jsPDF uses 1-indexed pages but array is 0-indexed
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Top-right brand text (no logo)
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    // Match the table header bar color for consistency and readability
    doc.setTextColor(primaryR, primaryG, primaryB);
    const titleW = doc.getTextWidth(brandTitle);
    doc.text(brandTitle, pageWidth - margin - titleW, 22);

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30);
    const tagW = doc.getTextWidth(brandTagline);
    doc.text(brandTagline, pageWidth - margin - tagW, 36);

    // Bottom-left footer
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(footerText, margin, pageHeight - 20);
  }

  reportProgress(
    'finalizing',
    orderedSections.length + 2,
    orderedSections.length + 2,
    'PDF ready!',
  );

  return doc.output('blob');
}

function checkPageBreak(doc: jsPDF, currentY: number, requiredSpace: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + requiredSpace > pageHeight - 60) {
    doc.addPage();
    return 40; // Reset to top margin
  }
  return currentY;
}
