/**
 * Client-Side PDF Export Fallback
 * Generates PDFs using jsPDF when server export fails or for mock trips
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportSection } from '@/types/tripExport';

/**
 * Font loading for jsPDF
 * Fetches a font from a URL and returns it as a base64 encoded string.
 * This is used to embed Unicode-capable fonts into the client-side PDF.
 * @param url The URL of the font file to fetch.
 * @returns A promise that resolves with the base64 encoded font data.
 */

// Type for autoTable result which includes finalY
interface AutoTableResult {
  finalY: number;
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

export async function generateClientPDF(
  data: ExportData,
  sections: ExportSection[]
): Promise<Blob> {
  // Always use letter size and privacy is enforced server-side
  const paper = 'letter';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  // Embed the Unicode font
  await embedNotoSansFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
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

  // Sections
  doc.setFontSize(14);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0);

  // Calendar section
  if (sections.includes('calendar')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Calendar', margin, yPos);
    yPos += 20;

    const events = data.calendar || [];
    if (events.length > 0) {
      const eventRows = events.map((event: any) => [
        event.title || 'Untitled Event',
        new Date(event.start_time).toLocaleString(),
        event.location || 'N/A',
        event.description ? event.description.substring(0, 50) + '...' : ''
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Event', 'Date & Time', 'Location', 'Description']],
        body: eventRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No calendar events available', margin, yPos);
      yPos += 30;
    }
  }

  // Payments section
  if (sections.includes('payments')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Payments', margin, yPos);
    yPos += 20;

    const payments = data.payments?.items || [];
    if (payments.length > 0) {
      const paymentRows = payments.map((p: any) => [
        p.description || 'N/A',
        `${p.currency || 'USD'} ${p.amount?.toFixed(2) || '0.00'}`,
        `${p.split_count || 0} people`,
        p.is_settled ? 'Settled' : 'Pending'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Description', 'Amount', 'Split', 'Status']],
        body: paymentRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;

      // Display total
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'bold');
      doc.text(`Total: ${data.payments?.currency || 'USD'} ${(data.payments?.total || 0).toFixed(2)}`, margin, yPos);
      yPos += 30;
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No payment records available', margin, yPos);
      yPos += 30;
    }
  }

  // Polls section
  if (sections.includes('polls')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Polls', margin, yPos);
    yPos += 20;

    const polls = data.polls || [];
    if (polls.length > 0) {
      polls.forEach((poll: any, index: number) => {
        yPos = checkPageBreak(doc, yPos, 80);

        doc.setFontSize(11);
        doc.setFont('NotoSans', 'bold');
        doc.setTextColor(0);
        doc.text(`${index + 1}. ${poll.question}`, margin, yPos);
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

          const result = autoTable(doc, {
            startY: yPos,
            body: pollRows,
            theme: 'plain',
            margin: { left: margin + 20, right: margin },
            styles: { fontSize: 9, cellPadding: 3 }
          }) as unknown as AutoTableResult;

          yPos = result.finalY + 5;
        }

        doc.setFontSize(9);
        doc.setFont('NotoSans', 'italic');
        doc.setTextColor(100);
        const totalVotes = Math.max(0, Number(poll.total_votes || 0));
        doc.text(`Total votes: ${totalVotes}`, margin + 20, yPos);
        yPos += 20;
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No polls available', margin, yPos);
      yPos += 30;
    }
  }

  // Places section
  if (sections.includes('places')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Places & Links', margin, yPos);
    yPos += 20;

    const places = data.places || [];
    if (places.length > 0) {
      const placeRows = places.map((place: any) => [
        place.name || 'N/A',
        place.url || 'N/A',
        place.votes?.toString() || '0'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Name', 'URL', 'Votes']],
        body: placeRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No places saved', margin, yPos);
      yPos += 30;
    }
  }

  // Tasks section
  if (sections.includes('tasks')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Tasks', margin, yPos);
    yPos += 20;

    const tasks = data.tasks || [];
    if (tasks.length > 0) {
      const taskRows = tasks.map((task: any) => [
        task.title || task.description || 'N/A',
        task.completed ? '[x] Done' : '[ ] Pending'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Task', 'Status']],
        body: taskRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No tasks available', margin, yPos);
      yPos += 30;
    }
  }

  // Pro sections (always available if selected)
  if (sections.includes('roster')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Roster & Contacts', margin, yPos);
    yPos += 20;

    const roster = data.roster || [];
    if (roster.length > 0) {
      const rosterRows = roster.map((member: any) => [
        member.name || 'N/A',
        member.email || 'Not shared',
        member.role || 'member'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Name', 'Email', 'Role']],
        body: rosterRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No roster data available', margin, yPos);
      yPos += 30;
    }
  }

  // Note: Broadcasts and attachments sections removed (not in core MVP)

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Generated by Chravel • ${new Date().toLocaleString()} • Trip ID: ${data.tripId}`,
    margin,
    pageHeight - 20
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
