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
    // Continue with the default font (helvetica) if embedding fails
  }
}

// Type for autoTable result which includes finalY
interface AutoTableResult {
  finalY: number;
}

interface ExportData {
  tripId: string;
  tripTitle: string;
  destination?: string;
  dateRange?: string;
  description?: string;
  mockData?: {
    payments?: any[];
    polls?: any[];
    tasks?: any[];
    places?: any[];
    roster?: any[];
    broadcasts?: any[];
    attachments?: any[];
    schedule?: any[];
    participants?: any[];
  };
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
    checkPageBreak(doc, yPos, 40);
    doc.text('Calendar', margin, yPos);
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont('NotoSans', 'normal');
    doc.text('No calendar events available in demo mode', margin, yPos);
    yPos += 30;
  }

  // Payments section
  if (sections.includes('payments')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Payments', margin, yPos);
    yPos += 20;

    const payments = data.mockData?.payments || [];
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

      // Calculate total
      const total = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'bold');
      doc.text(`Total: ${payments[0]?.currency || 'USD'} ${total.toFixed(2)}`, margin, yPos);
      yPos += 30;
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No payment records available in demo mode', margin, yPos);
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

    const polls = data.mockData?.polls || [];
    if (polls.length > 0) {
      polls.forEach((poll: any, index: number) => {
        yPos = checkPageBreak(doc, yPos, 80);

        doc.setFontSize(11);
        doc.setFont('NotoSans', 'bold');
        doc.setTextColor(0);
        doc.text(`${index + 1}. ${poll.question}`, margin, yPos);
        yPos += 15;

        if (poll.options && poll.options.length > 0) {
          const pollRows = poll.options.map((opt: any) => [
            opt.text || 'N/A',
            `${opt.votes || 0} votes`,
            `${((opt.votes / poll.total_votes) * 100).toFixed(1)}%`
          ]);

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
        doc.text(`Total votes: ${poll.total_votes || 0}`, margin + 20, yPos);
        yPos += 20;
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.setTextColor(120);
      doc.text('No polls available in demo mode', margin, yPos);
      yPos += 30;
    }
  }

  // Places section
  if (sections.includes('places')) {
    checkPageBreak(doc, yPos, 40);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.text('Places & Links', margin, yPos);
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont('NotoSans', 'normal');
    doc.text('No places saved in demo mode', margin, yPos);
    yPos += 30;
  }

  // Tasks section
  if (sections.includes('tasks')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(0);
    doc.text('Tasks', margin, yPos);
    yPos += 20;

    const tasks = data.mockData?.tasks || [];
    if (tasks.length > 0) {
      const taskRows = tasks.map((task: any) => [
        task.title || task.description || 'N/A',
        task.assigned_to || 'Unassigned',
        task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date',
        task.completed ? '[x] Done' : '[ ] Pending'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Task', 'Assigned To', 'Due Date', 'Status']],
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
      doc.text('No tasks available in demo mode', margin, yPos);
      yPos += 30;
    }
  }

  // Pro sections (always available if selected)
  if (sections.includes('roster')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Roster & Contacts', margin, yPos);
    yPos += 20;

    const roster = data.mockData?.roster || data.mockData?.participants || [];
    if (roster.length > 0) {
      const rosterRows = roster.map((member: any) => [
        member.name || 'N/A',
        member.email || 'N/A',
        member.role || 'N/A',
        member.credentialLevel || 'N/A'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Name', 'Email', 'Role', 'Credential Level']],
        body: rosterRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('No roster data available in demo mode', margin, yPos);
      yPos += 30;
    }
  }

  if (sections.includes('broadcasts')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Broadcast Log', margin, yPos);
    yPos += 20;

    const broadcasts = data.mockData?.broadcasts || [];
    if (broadcasts.length > 0) {
      const broadcastRows = broadcasts.map((broadcast: any) => [
        broadcast.timestamp ? new Date(broadcast.timestamp).toLocaleString() : 'N/A',
        broadcast.message || 'N/A',
        broadcast.channel || 'N/A',
        broadcast.sender || 'N/A'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['Timestamp', 'Message', 'Channel', 'Sender']],
        body: broadcastRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('No broadcasts available in demo mode', margin, yPos);
      yPos += 30;
    }
  }

  if (sections.includes('attachments')) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Attachments', margin, yPos);
    yPos += 20;

    const attachments = data.mockData?.attachments || [];
    if (attachments.length > 0) {
      const attachmentRows = attachments.map((attachment: any) => [
        attachment.name || 'N/A',
        attachment.type || 'N/A',
        attachment.size || 'N/A',
        attachment.uploaded_at ? new Date(attachment.uploaded_at).toLocaleDateString() : 'N/A'
      ]);

      const result = autoTable(doc, {
        startY: yPos,
        head: [['File Name', 'Type', 'Size', 'Uploaded']],
        body: attachmentRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 10 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      }) as unknown as AutoTableResult;

      yPos = result.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('No attachments available in demo mode', margin, yPos);
      yPos += 30;
    }
  }

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
