import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProParticipant } from '../types/pro';
import { ProTripCategory } from '../types/proCategories';

export interface ExportOptions {
  includeFields: {
    name: boolean;
    role: boolean;
    email: boolean;
    phone: boolean;
    dietary: boolean;
    medical: boolean;
    credentials: boolean;
    permissions: boolean;
    emergencyContact: boolean;
  };
  filterByRole?: string;
  title?: string;
  subtitle?: string;
}

const defaultOptions: ExportOptions = {
  includeFields: {
    name: true,
    role: true,
    email: true,
    phone: true,
    dietary: false,
    medical: false,
    credentials: false,
    permissions: false,
    emergencyContact: false
  }
};

class TeamDirectoryExportService {
  /**
   * Export team directory to PDF
   */
  exportToPDF(
    roster: ProParticipant[],
    category: ProTripCategory,
    options: ExportOptions = defaultOptions
  ): Blob {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add header
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38); // Red color
    doc.text(options.title || 'Team Directory', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(options.subtitle || category, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(150);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated: ${dateStr}`, pageWidth / 2, 35, { align: 'center' });

    // Filter roster
    let filteredRoster = roster;
    if (options.filterByRole && options.filterByRole !== 'all') {
      filteredRoster = roster.filter(m => m.role === options.filterByRole);
    }

    // Build table columns
    const columns: string[] = [];
    if (options.includeFields.name) columns.push('Name');
    if (options.includeFields.role) columns.push('Role');
    if (options.includeFields.email) columns.push('Email');
    if (options.includeFields.phone) columns.push('Phone');
    if (options.includeFields.credentials) columns.push('Credential');
    if (options.includeFields.dietary) columns.push('Dietary');
    if (options.includeFields.medical) columns.push('Medical');
    if (options.includeFields.permissions) columns.push('Permissions');
    if (options.includeFields.emergencyContact) columns.push('Emergency Contact');

    // Build table rows
    const rows = filteredRoster.map(member => {
      const row: string[] = [];
      if (options.includeFields.name) row.push(member.name);
      if (options.includeFields.role) row.push(member.role);
      if (options.includeFields.email) row.push(member.email);
      if (options.includeFields.phone) row.push(member.phone || 'N/A');
      if (options.includeFields.credentials) row.push(member.credentialLevel);
      if (options.includeFields.dietary) {
        row.push(member.dietaryRestrictions?.join(', ') || 'None');
      }
      if (options.includeFields.medical) {
        row.push(member.medicalNotes ? 'Yes (See Notes)' : 'None');
      }
      if (options.includeFields.permissions) {
        row.push(member.permissions.join(', '));
      }
      if (options.includeFields.emergencyContact) {
        row.push(
          member.emergencyContact
            ? `${member.emergencyContact.name} (${member.emergencyContact.phone})`
            : 'N/A'
        );
      }
      return row;
    });

    // Add table
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 45,
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [220, 38, 38], // Red
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 45, bottom: 20 }
    });

    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        'CONFIDENTIAL - For Internal Use Only',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }

    return doc.output('blob');
  }

  /**
   * Export team directory to CSV
   */
  exportToCSV(
    roster: ProParticipant[],
    options: ExportOptions = defaultOptions
  ): Blob {
    // Filter roster
    let filteredRoster = roster;
    if (options.filterByRole && options.filterByRole !== 'all') {
      filteredRoster = roster.filter(m => m.role === options.filterByRole);
    }

    // Build CSV data
    const headers: string[] = [];
    if (options.includeFields.name) headers.push('Name');
    if (options.includeFields.role) headers.push('Role');
    if (options.includeFields.email) headers.push('Email');
    if (options.includeFields.phone) headers.push('Phone');
    if (options.includeFields.credentials) headers.push('Credential Level');
    if (options.includeFields.dietary) headers.push('Dietary Restrictions');
    if (options.includeFields.medical) headers.push('Medical Notes');
    if (options.includeFields.permissions) headers.push('Permissions');
    if (options.includeFields.emergencyContact) {
      headers.push('Emergency Contact Name', 'Emergency Contact Phone', 'Emergency Contact Relationship');
    }

    const rows = filteredRoster.map(member => {
      const row: string[] = [];
      if (options.includeFields.name) row.push(member.name);
      if (options.includeFields.role) row.push(member.role);
      if (options.includeFields.email) row.push(member.email);
      if (options.includeFields.phone) row.push(member.phone || '');
      if (options.includeFields.credentials) row.push(member.credentialLevel);
      if (options.includeFields.dietary) {
        row.push(member.dietaryRestrictions?.join('; ') || '');
      }
      if (options.includeFields.medical) {
        row.push(member.medicalNotes || '');
      }
      if (options.includeFields.permissions) {
        row.push(member.permissions.join('; '));
      }
      if (options.includeFields.emergencyContact) {
        row.push(
          member.emergencyContact?.name || '',
          member.emergencyContact?.phone || '',
          member.emergencyContact?.relationship || ''
        );
      }
      return row;
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export team directory to Excel
   */
  exportToExcel(
    roster: ProParticipant[],
    category: ProTripCategory,
    options: ExportOptions = defaultOptions
  ): Blob {
    // Filter roster
    let filteredRoster = roster;
    if (options.filterByRole && options.filterByRole !== 'all') {
      filteredRoster = roster.filter(m => m.role === options.filterByRole);
    }

    // Build data array
    const data: any[] = [];

    // Add headers
    const headers: string[] = [];
    if (options.includeFields.name) headers.push('Name');
    if (options.includeFields.role) headers.push('Role');
    if (options.includeFields.email) headers.push('Email');
    if (options.includeFields.phone) headers.push('Phone');
    if (options.includeFields.credentials) headers.push('Credential Level');
    if (options.includeFields.dietary) headers.push('Dietary Restrictions');
    if (options.includeFields.medical) headers.push('Medical Notes');
    if (options.includeFields.permissions) headers.push('Permissions');
    if (options.includeFields.emergencyContact) {
      headers.push('Emergency Contact Name', 'Emergency Contact Phone', 'Emergency Contact Relationship');
    }
    data.push(headers);

    // Add rows
    filteredRoster.forEach(member => {
      const row: any[] = [];
      if (options.includeFields.name) row.push(member.name);
      if (options.includeFields.role) row.push(member.role);
      if (options.includeFields.email) row.push(member.email);
      if (options.includeFields.phone) row.push(member.phone || '');
      if (options.includeFields.credentials) row.push(member.credentialLevel);
      if (options.includeFields.dietary) {
        row.push(member.dietaryRestrictions?.join('; ') || '');
      }
      if (options.includeFields.medical) {
        row.push(member.medicalNotes || '');
      }
      if (options.includeFields.permissions) {
        row.push(member.permissions.join('; '));
      }
      if (options.includeFields.emergencyContact) {
        row.push(
          member.emergencyContact?.name || '',
          member.emergencyContact?.phone || '',
          member.emergencyContact?.relationship || ''
        );
      }
      data.push(row);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = headers.map((_, i) => {
      const maxLength = Math.max(
        ...data.map(row => (row[i] ? row[i].toString().length : 0))
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Team Directory');

    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  }

  /**
   * Download file helper
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const teamDirectoryExportService = new TeamDirectoryExportService();

