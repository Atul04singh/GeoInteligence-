import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisResult, Point } from '../types';
import { formatDuration, formatDate } from './utils';

export type OCRMode = 'summary' | 'detailed';

export const generateReport = (result: AnalysisResult, mode: OCRMode = 'summary') => {
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

  if (mode === 'summary') {
    generateSummaryReport(doc, result, pageWidth);
  } else {
    generateDetailedReport(doc, result, pageWidth);
  }

  // Footer for all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
    doc.text('GeoTel Intelligence Analysis System - Confidential Report', 20, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`GeoTel_${mode === 'summary' ? 'Summary' : 'Detailed'}_Report_${new Date().getTime()}.pdf`);
};

const generateSummaryReport = (doc: jsPDF, result: AnalysisResult, pageWidth: number) => {
  const { summary, intelligenceSummary, towerAnalysis, points } = result;
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 30;

  const checkPageBreak = (needed: number) => {
    if (currentY + needed > pageHeight - 25) {
      doc.addPage();
      currentY = 25;
      return true;
    }
    return false;
  };

  // Filter points for 10-digit mobile only (for summary metrics)
  const filteredPoints = points.filter(p => {
    if (!p.bParty) return false;
    const cleanNum = p.bParty.replace(/\D/g, '');
    const isTenDigit = cleanNum.length === 10;
    const isService = /JZ-|JIO|PAY|NOTICE|INFO|SMS|ALERT|PROMO/i.test(p.bParty);
    return isTenDigit && !isService;
  });

  // --- SECTION 1: EXECUTIVE SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 51, 102);
  doc.text('EXECUTIVE SUMMARY', 20, currentY);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 51, 102);
  doc.line(20, currentY + 5, 100, currentY + 5);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('MOBILE INTELLIGENCE OVERVIEW (10-DIGIT CONTACTS ONLY)', 20, currentY + 12);

  const execData = [
    ['Total Mobile Records', filteredPoints.length.toString()],
    ['Date Range', summary.dateRange],
    ['Primary IMEI', intelligenceSummary.device?.imei || 'N/A'],
    ['Primary IMSI', intelligenceSummary.device?.imsi || 'N/A'],
    ['Primary Location', intelligenceSummary.topAddress || 'N/A'],
    ['Roaming Status', intelligenceSummary.isRoaming ? 'Roaming Detected' : 'Home Network'],
    ['Peak Activity', `${intelligenceSummary.activity?.topDay} at ${intelligenceSummary.activity?.peakHour}`]
  ];

  autoTable(doc, {
    startY: currentY + 20,
    body: execData,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Auto-generated Conclusion
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text('CONCLUSION', 20, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  const topMobileContacts = intelligenceSummary.contactStats.filter(c => {
    const cleanNum = c.number.replace(/\D/g, '');
    return cleanNum.length === 10 && !/JZ-|JIO|PAY|NOTICE|INFO|SMS|ALERT/i.test(c.number);
  }).slice(0, 3);

  const conclusion = `Device shows high activity around ${intelligenceSummary.topAddress?.split(',')[0] || 'primary'} region with repeated contact patterns indicating strong association with ${topMobileContacts.length} key mobile numbers. The movement profile suggests a ${intelligenceSummary.isRoaming ? 'mobile' : 'localized'} operational pattern focusing on direct person-to-person communication.`;
  const splitConclusion = doc.splitTextToSize(conclusion, pageWidth - 40);
  doc.text(splitConclusion, 20, currentY + 10);
  currentY += 15 + (splitConclusion.length * 6);

  // --- SECTION 2: TOP CONTACTS ---
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102);
  doc.text('TOP MOBILE CONTACTS (PRIORITY)', 20, currentY);

  const filteredContacts = intelligenceSummary.contactStats
    .filter(c => {
      const cleanNum = c.number.replace(/\D/g, '');
      const isTenDigit = cleanNum.length === 10;
      const isService = /JZ-|JIO|PAY|NOTICE|INFO|SMS|ALERT|PROMO/i.test(c.number);
      return isTenDigit && !isService && c.count > 1;
    })
    .slice(0, 7);

  const contactData = filteredContacts.map((c, i) => {
    let tag = 'Low Importance';
    if (c.count > 15 || c.totalDuration > 3600) tag = 'Frequent Contact';
    else if (c.count > 5) tag = 'Possible Associate';

    return [(i + 1).toString(), c.number, c.count.toString(), formatDuration(c.totalDuration), tag];
  });

  autoTable(doc, {
    startY: currentY + 10,
    head: [['Rank', 'Number', 'Hits', 'Duration', 'Tag']],
    body: contactData,
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102] },
    columnStyles: { 4: { fontStyle: 'bold' } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 20;

  // --- SECTION 3: MOVEMENT / LOCATION INTELLIGENCE ---
  checkPageBreak(60);
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102);
  doc.text('LOCATION INTELLIGENCE', 20, currentY);

  const topTowers = towerAnalysis.slice(0, 5);
  const towerData = topTowers.map((t, i) => [
    (i + 1).toString(),
    t["CELL ID"],
    t.FREQUENCY.toString(),
    t["AVG LATITUDE"].toFixed(4) + ', ' + t["AVG LONGITUDE"].toFixed(4)
  ]);

  autoTable(doc, {
    startY: currentY + 10,
    head: [['Rank', 'Tower ID', 'Frequency', 'Coordinates']],
    body: towerData,
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 204] }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('INSIGHT', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const locInsight = `Device majorly operates around ${topTowers[0]?.["CELL ID"] || 'primary'} and ${topTowers[1]?.["CELL ID"] || 'secondary'} towers, indicating a specific geographic cluster. The concentration of ${((topTowers[0]?.FREQUENCY / summary.totalPoints) * 100).toFixed(1)}% activity at a single point suggests a primary base of operations.`;
  const splitLoc = doc.splitTextToSize(locInsight, pageWidth - 40);
  doc.text(splitLoc, 20, currentY + 10);
  currentY += 20 + (splitLoc.length * 6);

  // --- SECTION 4: KEY INTERACTION ANALYSIS ---
  checkPageBreak(80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102);
  doc.text('KEY INTERACTION ANALYSIS', 20, currentY);

  const suspicious = filteredContacts.slice(0, 3);
  currentY += 15;
  suspicious.forEach(c => {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Target: ${c.number}`, 20, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      body: [
        ['Total Interactions', c.count.toString()],
        ['Pattern', c.callTypes.join(', ')],
        ['Last Activity', `${formatDate(c.lastDate)} ${c.lastTime}`]
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      margin: { left: 25 }
    });

    const insight = c.totalDuration > 600 ? 'High duration calls indicate close association.' : 'Repeated short duration calls suggest coordination behavior.';
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Insight: ${insight}`, 25, (doc as any).lastAutoTable.finalY + 5);
    currentY = (doc as any).lastAutoTable.finalY + 20;
  });
};

const generateDetailedReport = (doc: jsPDF, result: AnalysisResult, pageWidth: number) => {
  const { summary, intelligenceSummary, points } = result;
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 40;

  const checkPageBreak = (needed: number) => {
    if (currentY + needed > pageHeight - 25) {
      doc.addPage();
      currentY = 25;
      return true;
    }
    return false;
  };

  // --- COVER PAGE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 51, 102);
  const centerText = (text: string, y: number, size = 16, color = [0, 0, 0]) => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };
  centerText('GEOTEL DETAILED ANALYSIS REPORT', 40, 22, [0, 51, 102]);
  centerText('Mobile OCR / Call-Only Timeline Report', 48, 14, [0, 102, 204]);
  
  autoTable(doc, {
    startY: 60,
    head: [['Metric', 'Value']],
    body: [
      ['Total Records', summary.totalPoints.toString()],
      ['Date Range', summary.dateRange],
      ['Primary IMEI', intelligenceSummary.device?.imei || 'N/A'],
      ['Primary IMSI', intelligenceSummary.device?.imsi || 'N/A']
    ],
    theme: 'striped',
    headStyles: { fillColor: [0, 51, 102] },
    margin: { left: 20, right: 20 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 20;

  // Group points by B-party
  const bPartyGroups: Record<string, Point[]> = {};
  points.forEach(p => {
    if (p.bParty) {
      if (!bPartyGroups[p.bParty]) bPartyGroups[p.bParty] = [];
      bPartyGroups[p.bParty].push(p);
    }
  });

  let sortedBParties = Object.keys(bPartyGroups).sort((a, b) => bPartyGroups[b].length - bPartyGroups[a].length);
  sortedBParties = sortedBParties.filter(number => {
    const isTenDigit = number.replace(/\D/g, '').length === 10;
    return isTenDigit && bPartyGroups[number].some(p => !(p.callType || '').toUpperCase().includes('SMS'));
  });

  sortedBParties.forEach((number) => {
    const timelineData = bPartyGroups[number]
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(p => !(p.callType || '').toUpperCase().includes('SMS'))
      .map(p => {
        const type = p.callType || '';
        const isIncoming = type.toUpperCase().includes('INCOMING') || 
                         type.toUpperCase().includes('MTC') || 
                         type.toUpperCase().includes('TERMINATING') ||
                         type.toUpperCase().includes('IN');
        return [
          isIncoming ? 'call-in' : 'call-out',
          formatDate(p.date),
          p.time,
          p.duration ? formatDuration(p.duration) : '-',
          p.cellId,
          p.lat.toFixed(6),
          p.lon.toFixed(6),
          p.address || '-'
        ];
      });

    if (timelineData.length === 0) return;

    // Check if we need a new page for the header + at least 2 rows of table
    checkPageBreak(40);

    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text(`INTERACTION TIMELINE: ${number}`, 20, currentY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Total Calls: ${timelineData.length}`, 20, currentY + 8);

    autoTable(doc, {
      startY: currentY + 15,
      head: [['Type', 'Date', 'Time', 'Duration', 'Tower ID', 'Lat', 'Lon', 'Address']],
      body: timelineData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 7 },
      columnStyles: { 7: { cellWidth: 40 } },
      margin: { left: 10, right: 10 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  });
};
