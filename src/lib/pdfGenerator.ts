import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisResult, Point } from '../types';
import { formatDuration, formatDate } from './utils';

export type OCRMode = 'full' | 'call-only';

export const generateReport = (result: AnalysisResult, mode: OCRMode = 'full') => {
  const doc = new jsPDF();
  const { summary, intelligenceSummary, towerAnalysis, points } = result;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Helper for centered text
  const centerText = (text: string, y: number, size = 16, color = [0, 0, 0]) => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // --- PAGE 1: COVER & DASHBOARD SUMMARY ---
  doc.setFont('helvetica', 'bold');
  centerText('GEOTEL INTELLIGENCE ANALYSIS REPORT', 40, 22, [0, 51, 102]);
  centerText(mode === 'full' ? 'Full OCR Analysis Report' : 'Call-Only Analysis Report', 48, 14, [0, 102, 204]);
  centerText('Reference for Judicial Proceedings', 56, 12, [100, 100, 100]);
  
  doc.setLineWidth(0.5);
  doc.line(20, 65, pageWidth - 20, 65);

  // Dashboard Summary Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('1. DASHBOARD OVERVIEW', 20, 80);

  const summaryData = [
    ['Total Records', summary.totalPoints.toString()],
    ['Unique Towers', summary.uniqueTowers.toString()],
    ['Date Range', summary.dateRange],
    ['Primary Device IMEI', intelligenceSummary.device?.imei || 'N/A'],
    ['Primary Device IMSI', intelligenceSummary.device?.imsi || 'N/A'],
    ['Top Activity Day', intelligenceSummary.activity?.topDay || 'N/A'],
    ['Peak Hour', intelligenceSummary.activity?.peakHour || 'N/A'],
    ['Roaming Status', intelligenceSummary.isRoaming ? 'Roaming Detected' : 'Home Network'],
    ['Primary Location', intelligenceSummary.topAddress || 'N/A']
  ];

  autoTable(doc, {
    startY: 85,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [0, 51, 102] },
    margin: { left: 20, right: 20 }
  });

  // Call Type Distribution
  const callTypeData = Object.entries(intelligenceSummary.callTypeStats).map(([type, count]) => [type, count.toString()]);
  doc.text('Call Type Distribution', 20, (doc as any).lastAutoTable.finalY + 15);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Call Type', 'Count']],
    body: callTypeData,
    theme: 'grid',
    headStyles: { fillColor: [50, 50, 50] },
    margin: { left: 20, right: 20 }
  });

  // --- CONTACT ANALYSIS SUMMARY ---
  doc.addPage();
  doc.setFontSize(14);
  doc.text('2. CONTACT ANALYSIS SUMMARY', 20, 20);

  const contactStats = intelligenceSummary.contactStats.map((c, i) => [
    (i + 1).toString(),
    c.number,
    c.count.toString(),
    formatDuration(c.totalDuration),
    `${formatDate(c.lastDate)} ${c.lastTime}`,
    c.callTypes.join(', ')
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Rank', 'Number', 'Interactions', 'Duration', 'Last Seen', 'Types']],
    body: contactStats,
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 204] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 }
  });

  // --- PAGE 3+: DETAILED INTERACTION TIMELINES ---
  // Group points by B-party
  const bPartyGroups: Record<string, Point[]> = {};
  points.forEach(p => {
    if (p.bParty) {
      if (!bPartyGroups[p.bParty]) bPartyGroups[p.bParty] = [];
      bPartyGroups[p.bParty].push(p);
    }
  });

  // Sort groups by interaction count (same as contactStats)
  let sortedBParties = Object.keys(bPartyGroups).sort((a, b) => bPartyGroups[b].length - bPartyGroups[a].length);

  // Filter for Call Only mode
  if (mode === 'call-only') {
    sortedBParties = sortedBParties.filter(number => {
      // Check if number is 10 digits
      const isTenDigit = number.replace(/\D/g, '').length === 10;
      if (!isTenDigit) return false;

      // Check if it has any calls (not just SMS)
      return bPartyGroups[number].some(p => {
        const type = p.callType || '';
        return !type.toUpperCase().includes('SMS');
      });
    });
  }

  sortedBParties.forEach((number) => {
    const timelineData = bPartyGroups[number]
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(p => {
        if (mode === 'call-only') {
          const type = p.callType || '';
          return !type.toUpperCase().includes('SMS');
        }
        return true;
      })
      .map(p => {
        const type = p.callType || '';
        const isIncoming = type.toUpperCase().includes('INCOMING') || 
                         type.toUpperCase().includes('MTC') || 
                         type.toUpperCase().includes('TERMINATING') ||
                         type.toUpperCase().includes('IN');
        const isSms = type.toUpperCase().includes('SMS');
        
        let displayType = type;
        if (isSms) displayType = 'SMS';
        else if (isIncoming) displayType = 'call-in';
        else displayType = 'call-out';

        return [
          displayType,
          formatDate(p.date),
          p.time,
          (!isSms && p.duration) ? formatDuration(p.duration) : '-',
          p.cellId,
          p.lat.toFixed(6),
          p.lon.toFixed(6),
          p.address || '-'
        ];
      });

    if (timelineData.length === 0) return;

    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text(`INTERACTION TIMELINE: ${number}`, 20, 20);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Total Interactions: ${timelineData.length}`, 20, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Type', 'Date', 'Time', 'Duration', 'Tower ID', 'Lat', 'Lon', 'Address']],
      body: timelineData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 7 },
      columnStyles: {
        7: { cellWidth: 40 } // Address column width
      },
      margin: { left: 10, right: 10 }
    });
  });

  // --- LAST PAGE: TOWER ANALYSIS ---
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text('3. TOWER ANALYSIS REPORT', 20, 20);
  doc.setTextColor(0, 0, 0);

  const towerData = towerAnalysis.map(t => [
    t["CELL ID"],
    t.FREQUENCY.toString(),
    t["AVG LATITUDE"].toFixed(6),
    t["AVG LONGITUDE"].toFixed(6)
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Cell ID', 'Frequency', 'Avg Latitude', 'Avg Longitude']],
    body: towerData,
    theme: 'striped',
    headStyles: { fillColor: [50, 50, 50] },
    margin: { left: 20, right: 20 }
  });

  // Footer for all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
    doc.text('GeoTel Intelligence Analysis System - Confidential Report', 20, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`GeoTel_Analysis_Report_${new Date().getTime()}.pdf`);
};
