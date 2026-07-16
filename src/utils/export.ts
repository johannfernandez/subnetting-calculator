/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { SubnetResult } from '../types';

// Export results to CSV format
export function exportToCSV(results: SubnetResult[], title: string) {
  const headers = [
    'Subnet Name',
    'Network IP Address',
    'CIDR Prefix',
    'Subnet Mask',
    'First Usable IP',
    'Last Usable IP',
    'Broadcast Address',
    'Requested Hosts',
    'Allocated Usable Hosts',
    'Total Hosts'
  ];
  
  const rows = results.map(r => [
    r.name,
    r.networkAddress,
    `/${r.cidr}`,
    r.subnetMask,
    r.firstUsable,
    r.lastUsable,
    r.broadcastAddress,
    r.requestedHosts !== undefined ? r.requestedHosts : 'N/A',
    r.allocatedHosts,
    r.totalHosts
  ]);
  
  // Create CSV String
  const csvString = [
    headers.join(','),
    ...rows.map(e => e.map(val => `"${val}"`).join(','))
  ].join('\r\n');
  
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, '_')}_subnets.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export results to PDF format
export function exportToPDF(results: SubnetResult[], title: string, baseNet: string, mode: string) {
  const doc = new jsPDF();
  
  // Header section
  doc.setFillColor(15, 118, 110); // Teal / Cyan primary accent
  doc.rect(0, 0, 210, 38, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Subnetting Allocation Plan', 15, 16);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Strategy: ${mode.toUpperCase()}`, 15, 24);
  doc.text(`Base Network Address: ${baseNet}`, 15, 30);

  let y = 48;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Calculated Subnets', 15, y);
  y += 8;

  // Table Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Subnet Name', 17, y + 5);
  doc.text('Network IP', 45, y + 5);
  doc.text('Mask', 75, y + 5);
  doc.text('Usable IP Range', 110, y + 5);
  doc.text('Broadcast', 160, y + 5);
  doc.text('Capacity', 183, y + 5);
  
  y += 12;
  doc.setFont('helvetica', 'normal');

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    
    // Page overflow handler (leaves 20mm margin)
    if (y > 275) {
      doc.addPage();
      y = 20;
      
      // Reprint Table Headers on the next page
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Subnet Name', 17, y + 5);
      doc.text('Network IP', 45, y + 5);
      doc.text('Mask', 75, y + 5);
      doc.text('Usable IP Range', 110, y + 5);
      doc.text('Broadcast', 160, y + 5);
      doc.text('Capacity', 183, y + 5);
      y += 12;
      doc.setFont('helvetica', 'normal');
    }

    // Zebra striping for table readability
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, 180, 6, 'F');
    }

    doc.text(r.name, 17, y);
    doc.text(`${r.networkAddress}/${r.cidr}`, 45, y);
    doc.text(r.subnetMask, 75, y);
    doc.text(r.ipRange, 110, y);
    doc.text(r.broadcastAddress, 160, y);
    doc.text(`${r.allocatedHosts} hosts`, 183, y);
    
    y += 6;
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_subnets.pdf`);
}
