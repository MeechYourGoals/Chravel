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
async function getFontAsBase64(url: string): Promise<string> {
  // In a real-world scenario, you'd want to handle network errors.
  // For this example, we'll assume the font is always available.
  const response = await fetch(url);
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
}

/**
 * Loads and embeds the Noto Sans font family into the jsPDF document.
 * This ensures that Unicode characters are properly rendered in the PDF.
 * @param doc The jsPDF instance.
 */
async function embedNotoSansFont(doc: jsPDF): Promise<void> {
  try {
    const fontNormal = await getFontAsBase64('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-normal.ttf');
    const fontBold = await getFontAsBase64('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-normal.ttf');
    const fontItalic = await getFontAsBase64('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-italic.ttf');
    const fontBoldItalic = await getFontAsBase64('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-italic.ttf');

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
    console.error('Failed to load and embed font, falling back to default:', error);
    // Continue with the default font (NotoSans) if embedding fails
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
    email?: string;
    role?: string;
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
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [66, 139, 202]; // Default blue
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
  }
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
  const reportProgress = (stage: 'preparing' | 'rendering' | 'finalizing', current: number, total: number, message: string) => {
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
  doc.text(data.tripTitle, margin, yPos);
  yPos += 30;

  if (data.destination) {
    doc.setFontSize(12);
    doc.setFont('NotoSans', 'normal');
    doc.text(data.destination, margin, yPos);
    yPos += 20;
  }

  if (data.dateRange) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(data.dateRange, margin, yPos);
    yPos += 20;
  }

  if (data.description) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    const splitDesc = doc.splitTextToSize(data.description, contentWidth);
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
    reportProgress('rendering', sectionIndex, orderedSections.length + 2, `Rendering ${section}...`);

    // Calendar section
    if (section === 'calendar') {
      yPos = checkPageBreak(doc, yPos, 60);
      
      const events = data.calendar || [];
      if (events.length > 0) {
        // Paginate if too many events
        const eventChunks = events.length > maxItems 
          ? chunkArray(events, maxItems)
          : [events];

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

          const eventRows = chunk.map((event: any) => [
            event.title || 'Untitled Event',
            event.start_time ? new Date(event.start_time).toLocaleString() : 'N/A',
            event.location || 'N/A',
            event.description ? event.description.substring(0, 50) + '...' : ''
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Event', 'Date & Time', 'Location', 'Description']],
            body: eventRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 }
          });

          yPos = getFinalY(doc, yPos) + 10;

          // If more chunks, add continuation note
          if (chunkIndex < eventChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(`(Continued on next page - showing ${(chunkIndex + 1) * maxItems} of ${events.length} events)`, margin, yPos);
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
        const paymentChunks = payments.length > maxItems 
          ? chunkArray(payments, maxItems)
          : [payments];

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
            p.description || 'N/A',
            `${p.currency || 'USD'} ${p.amount?.toFixed(2) || '0.00'}`,
            `${p.split_count || 0} people`,
            p.is_settled ? 'Settled' : 'Pending'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Description', 'Amount', 'Split', 'Status']],
            body: paymentRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 }
          });

          yPos = getFinalY(doc, yPos) + 10;

          // Display total only on last chunk
          if (chunkIndex === paymentChunks.length - 1) {
            doc.setFontSize(10);
            doc.setFont('NotoSans', 'bold');
            doc.text(`Total: ${data.payments?.currency || 'USD'} ${(data.payments?.total || 0).toFixed(2)}`, margin, yPos);
            yPos += 30;
          }

          if (chunkIndex < paymentChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(`(Continued - showing ${(chunkIndex + 1) * maxItems} of ${payments.length} payments)`, margin, yPos);
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
        const pollChunks = polls.length > maxItems 
          ? chunkArray(polls, maxItems)
          : [polls];

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
            doc.text(`${pollNumber}. ${poll.question}`, margin, yPos);
            yPos += 15;

            if (poll.options && poll.options.length > 0) {
              const pollRows = poll.options.map((opt: any) => {
                const percentage = poll.total_votes > 0 ? ((opt.votes / poll.total_votes) * 100).toFixed(1) : '0.0';
                return [
                  opt.text || 'N/A',
                  `${opt.votes || 0} votes`,
                  `${percentage}%`
                ];
              });

              autoTable(doc, {
                startY: yPos,
                body: pollRows,
                theme: 'plain',
                margin: { left: margin + 20, right: margin },
                styles: { fontSize: 9, cellPadding: 3 }
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
            doc.text(`(Continued - showing ${(chunkIndex + 1) * maxItems} of ${polls.length} polls)`, margin, yPos);
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
        const placeChunks = places.length > maxItems 
          ? chunkArray(places, maxItems)
          : [places];

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

          const placeRows = chunk.map((place: any) => [
            place.name || 'N/A',
            place.url || 'N/A',
            place.votes?.toString() || '0'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Name', 'URL', 'Votes']],
            body: placeRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 }
          });

          yPos = getFinalY(doc, yPos) + 10;

          if (chunkIndex < placeChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(`(Continued - showing ${(chunkIndex + 1) * maxItems} of ${places.length} places)`, margin, yPos);
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
        const taskChunks = tasks.length > maxItems 
          ? chunkArray(tasks, maxItems)
          : [tasks];

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
            task.title || task.description || 'N/A',
            task.completed ? '[x] Done' : '[ ] Pending'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Task', 'Status']],
            body: taskRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 }
          });

          yPos = getFinalY(doc, yPos) + 10;

          if (chunkIndex < taskChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(`(Continued - showing ${(chunkIndex + 1) * maxItems} of ${tasks.length} tasks)`, margin, yPos);
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
    
    // Pro sections (always available if selected)
    if (section === 'roster') {
      yPos = checkPageBreak(doc, yPos, 60);
      
      const roster = data.roster || [];
      if (roster.length > 0) {
        const rosterChunks = roster.length > maxItems 
          ? chunkArray(roster, maxItems)
          : [roster];

        for (let chunkIndex = 0; chunkIndex < rosterChunks.length; chunkIndex++) {
          const chunk = rosterChunks[chunkIndex];
          
          yPos = checkPageBreak(doc, yPos, 60);
          
          if (chunkIndex === 0) {
            doc.setFontSize(14);
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(0);
            doc.text('Roster & Contacts', margin, yPos);
            yPos += 20;
          }

          const rosterRows = chunk.map((member: any) => [
            member.name || 'N/A',
            member.email || 'Not shared',
            member.role || 'member'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Name', 'Email', 'Role']],
            body: rosterRows,
            theme: 'striped',
            headStyles: { fillColor: [primaryR, primaryG, primaryB], fontSize: 10 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 }
          });

          yPos = getFinalY(doc, yPos) + 10;

          if (chunkIndex < rosterChunks.length - 1) {
            yPos = checkPageBreak(doc, yPos, 30);
            doc.setFontSize(9);
            doc.setFont('NotoSans', 'italic');
            doc.setTextColor(120);
            doc.text(`(Continued - showing ${(chunkIndex + 1) * maxItems} of ${roster.length} members)`, margin, yPos);
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
  }

  // Footer
  reportProgress('finalizing', orderedSections.length + 1, orderedSections.length + 2, 'Finalizing PDF...');
  
  const footerText = customization?.footerText || `Generated by Chravel • ${new Date().toLocaleString()} • Trip ID: ${data.tripId}`;
  
  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1; // jsPDF uses 1-indexed pages but array is 0-indexed
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(footerText, margin, pageHeight - 20);
  }

  reportProgress('finalizing', orderedSections.length + 2, orderedSections.length + 2, 'PDF ready!');
  
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
