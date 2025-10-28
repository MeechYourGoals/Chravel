/**
 * PDF Generation Utility
 *
 * Generates PDF from trip export data using jsPDF
 * Platform-aware: Works on web, mobile browsers, and native apps (iOS/Android)
 */

import jsPDF from 'jspdf';
import { TripExportData } from '@/types/tripExport';
import {
  buildCalendarSection,
  buildPaymentsSection,
  buildPollsSection,
  buildPlacesSection,
  buildTasksSection,
} from './exportSectionBuilders';
import { exportPDF } from './pdfExport';

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Generate PDF from export data
 */
export async function generateTripPDF(exportData: TripExportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper to check if we need a new page
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper to add text with wrapping
  const addText = (text: string, fontSize: number, color: string, options: any = {}) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, contentWidth);

    if (options.align === 'center') {
      lines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth / 2, yPosition + (index * fontSize * 0.4), { align: 'center' });
      });
    } else {
      doc.text(lines, margin, yPosition);
    }

    yPosition += lines.length * fontSize * 0.4 + (options.spacing || 5);
  };

  // Header
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('Trip Executive Summary', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(229, 231, 235); // gray-200
  doc.text(`Generated on ${formatDate(exportData.metadata.exportedAt)}`, pageWidth / 2, 30, { align: 'center' });

  yPosition = 50;

  // Trip Title
  checkNewPage(30);
  doc.setFontSize(22);
  doc.setTextColor(26, 26, 26);
  doc.text(exportData.trip.name, margin, yPosition);
  yPosition += 10;

  if (exportData.trip.description) {
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // gray-600
    const descLines = doc.splitTextToSize(exportData.trip.description, contentWidth);
    doc.text(descLines, margin, yPosition);
    yPosition += descLines.length * 5 + 5;
  }

  // Trip Details
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // gray-500

  if (exportData.trip.destination) {
    doc.text(`Destination: ${exportData.trip.destination}`, margin, yPosition);
    yPosition += 5;
  }

  if (exportData.trip.startDate && exportData.trip.endDate) {
    doc.text(
      `Dates: ${formatDate(exportData.trip.startDate)} - ${formatDate(exportData.trip.endDate)}`,
      margin,
      yPosition
    );
    yPosition += 5;
  } else if (exportData.trip.startDate) {
    doc.text(`Start: ${formatDate(exportData.trip.startDate)}`, margin, yPosition);
    yPosition += 5;
  }

  yPosition += 5;

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Process each section
  exportData.sections.forEach((section) => {
    checkNewPage(30);

    // Section Header
    doc.setFontSize(16);
    doc.setTextColor(26, 26, 26);
    doc.text(`${section.icon} ${section.title}`, margin, yPosition);
    yPosition += 8;

    switch (section.type) {
      case 'calendar':
        section.items.forEach((item, index) => {
          checkNewPage(20);
          if (index > 0) yPosition += 3;

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text(item.title, margin + 5, yPosition);
          yPosition += 5;

          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128);
          doc.text(`${item.date} at ${item.time}`, margin + 5, yPosition);
          yPosition += 4;

          if (item.location) {
            doc.text(`Location: ${item.location}`, margin + 5, yPosition);
            yPosition += 4;
          }

          if (item.description) {
            doc.setFontSize(9);
            doc.setTextColor(156, 163, 175);
            const descLines = doc.splitTextToSize(item.description, contentWidth - 10);
            doc.text(descLines, margin + 5, yPosition);
            yPosition += descLines.length * 3.5;
          }
        });
        break;

      case 'payments':
        let total = 0;
        section.items.forEach((item, index) => {
          checkNewPage(15);
          if (index > 0) yPosition += 3;

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text(item.description, margin + 5, yPosition);
          yPosition += 5;

          doc.setFontSize(10);
          doc.setTextColor(107, 114, 128);
          doc.text(`Amount: ${item.amount} • Split ${item.participants} ways`, margin + 5, yPosition);
          yPosition += 4;

          doc.text(
            `Status: ${item.settled ? 'Settled ✓' : 'Pending'} • ${item.date}`,
            margin + 5,
            yPosition
          );
          yPosition += 4;
        });

        if (section.totalAmount) {
          yPosition += 2;
          doc.setFontSize(12);
          doc.setTextColor(37, 99, 235);
          doc.text(`Total: ${section.totalAmount}`, pageWidth - margin, yPosition, { align: 'right' });
          yPosition += 5;
        }
        break;

      case 'polls':
        section.items.forEach((item, index) => {
          checkNewPage(25);
          if (index > 0) yPosition += 5;

          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text(item.question, margin + 5, yPosition);
          yPosition += 6;

          item.options.forEach((option) => {
            checkNewPage(8);
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.text(
              `  ${option.text}: ${option.votes} votes (${option.percentage}%)`,
              margin + 8,
              yPosition
            );
            yPosition += 4;
          });

          doc.setFontSize(9);
          doc.setTextColor(156, 163, 175);
          doc.text(`Total votes: ${item.totalVotes} • Status: ${item.status}`, margin + 5, yPosition);
          yPosition += 4;
        });
        break;

      case 'places':
        section.items.forEach((item, index) => {
          checkNewPage(15);
          if (index > 0) yPosition += 3;

          doc.setFontSize(12);
          doc.setTextColor(37, 99, 235);
          doc.textWithLink(item.name, margin + 5, yPosition, { url: item.url });
          yPosition += 5;

          if (item.description) {
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            const descLines = doc.splitTextToSize(item.description, contentWidth - 10);
            doc.text(descLines, margin + 5, yPosition);
            yPosition += descLines.length * 4;
          }

          doc.setFontSize(9);
          doc.setTextColor(156, 163, 175);
          doc.text(`Votes: ${item.votes}${item.category ? ` • ${item.category}` : ''}`, margin + 5, yPosition);
          yPosition += 5;
        });
        break;

      case 'tasks':
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `${section.stats.completed} completed, ${section.stats.pending} pending`,
          margin + 5,
          yPosition
        );
        yPosition += 6;

        section.items.forEach((item, index) => {
          checkNewPage(12);
          if (index > 0) yPosition += 3;

          const checkbox = item.completed ? '☑' : '☐';

          doc.setFontSize(11);
          doc.setTextColor(item.completed ? 107 : 31, item.completed ? 114 : 41, item.completed ? 128 : 55);
          doc.text(`${checkbox} ${item.title}`, margin + 5, yPosition);
          yPosition += 5;

          if (item.dueDate) {
            doc.setFontSize(9);
            doc.setTextColor(156, 163, 175);
            doc.text(`  Due: ${item.dueDate}`, margin + 8, yPosition);
            yPosition += 3.5;
          }

          if (item.completedDate) {
            doc.setFontSize(9);
            doc.setTextColor(16, 185, 129); // green-500
            doc.text(`  Completed: ${item.completedDate}`, margin + 8, yPosition);
            yPosition += 3.5;
          }
        });
        break;
    }

    yPosition += 10;
  });

  // Footer
  checkNewPage(15);
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Generated by Chravel', pageWidth / 2, yPosition, { align: 'center' });
  doc.textWithLink('chravel.com', pageWidth / 2, yPosition + 4, {
    align: 'center',
    url: 'https://chravel.com',
  });

  // Export the PDF using platform-aware method
  const filename = `${exportData.trip.name.replace(/[^a-z0-9]/gi, '_')}_Summary.pdf`;
  
  // Get PDF as blob
  const pdfBlob = doc.output('blob');
  
  // Use platform-aware export
  const result = await exportPDF({
    filename,
    blob: pdfBlob
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to export PDF');
  }
}
