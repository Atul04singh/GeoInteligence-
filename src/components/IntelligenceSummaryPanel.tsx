import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  Phone, 
  Map as MapIcon, 
  Zap, 
  MessageSquare, 
  X, 
  Clock, 
  ArrowRight,
  ArrowLeft,
  Calendar,
  PhoneIncoming,
  PhoneOutgoing,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDuration, formatDate } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AnalysisResult, Point } from '../types';

interface ContactStat {
  number: string;
  count: number;
  totalDuration: number;
  lastDate: string;
  lastTime: string;
  callTypes: string[];
}

export const IntelligenceSummaryPanel = ({ result }: { result: AnalysisResult }) => {
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const summary = result.intelligenceSummary;

  const isSms = (type: string) => type.toUpperCase().includes('SMS');
  const isCall = (type: string) => 
    type.toUpperCase().includes('CALL') || 
    type.toUpperCase().includes('INCOMING') || 
    type.toUpperCase().includes('OUTGOING') ||
    type.toUpperCase().includes('MOC') ||
    type.toUpperCase().includes('MTC');

  const { callStats, smsStats } = useMemo(() => {
    const callData: Record<string, ContactStat> = {};
    const smsData: Record<string, ContactStat> = {};

    result.points.forEach(p => {
      if (!p.bParty) return;
      const type = p.callType || '';
      
      const targetData = isSms(type) ? smsData : (isCall(type) ? callData : null);
      if (!targetData) return;

      if (!targetData[p.bParty]) {
        targetData[p.bParty] = {
          number: p.bParty,
          count: 0,
          totalDuration: 0,
          lastDate: p.date,
          lastTime: p.time,
          callTypes: []
        };
      }

      const stat = targetData[p.bParty];
      stat.count++;
      stat.totalDuration += p.duration || 0;
      if (type && !stat.callTypes.includes(type)) {
        stat.callTypes.push(type);
      }
      
      // Update last interaction if this one is newer
      const currentLast = new Date(`${stat.lastDate}T${stat.lastTime}`).getTime();
      const newTime = new Date(`${p.date}T${p.time}`).getTime();
      if (newTime > currentLast) {
        stat.lastDate = p.date;
        stat.lastTime = p.time;
      }
    });

    return {
      callStats: Object.values(callData).sort((a, b) => b.count - a.count),
      smsStats: Object.values(smsData).sort((a, b) => b.count - a.count)
    };
  }, [result.points]);

  const selectedInteractions = useMemo(() => {
    if (!selectedNumber) return [];
    return result.points
      .filter(p => p.bParty === selectedNumber)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedNumber, result.points]);

  if (!summary || !summary.contactStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-4 py-20">
        <AlertCircle className="w-12 h-12" />
        <div className="text-center">
          <p className="text-sm font-medium">Intelligence data not available for this record.</p>
          <p className="text-xs mt-1 opacity-60">This analysis was created before the detailed Intelligence features were added.</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Re-upload File
        </Button>
      </div>
    );
  }

  const renderTable = (stats: ContactStat[], title: string, icon: any, subtitle: string) => (
    <Card className="p-6 bg-white/[0.03] border-white/10 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            {React.createElement(icon, { className: "w-5 h-5 text-white/60" })}
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{title}</p>
            <p className="text-sm font-medium text-white">{subtitle}</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <p className="text-[10px] text-white/60 font-mono">{stats.length} Unique Numbers</p>
        </div>
      </div>
      
      <div className="mt-2 overflow-hidden rounded-lg border border-white/5">
        <div className="max-h-[300px] overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="sticky top-0 bg-[#0A0A0A] z-10">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">B Party Number</th>
                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Interactions</th>
                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Total Duration</th>
                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Last Interaction</th>
                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Types</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.map((contact, index) => (
                <tr 
                  key={contact.number} 
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => setSelectedNumber(contact.number)}
                >
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold",
                      index === 0 ? "bg-orange-500/20 text-orange-500" : 
                      index === 1 ? "bg-white/20 text-white/80" :
                      index === 2 ? "bg-orange-900/20 text-orange-700" : "bg-white/5 text-white/40"
                    )}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-white/90 group-hover:text-white transition-colors">
                        {contact.number}
                      </p>
                      <ExternalLink size={10} className="text-white/0 group-hover:text-white/40 transition-all" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-xs font-bold text-white/80">
                      {contact.count}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-[10px] font-mono text-white/60">
                      {formatDuration(contact.totalDuration)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <p className="text-[10px] text-white/60">{formatDate(contact.lastDate || "") || "N/A"}</p>
                      <p className="text-[9px] text-white/30">{contact.lastTime || "N/A"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(contact.callTypes || []).map(type => (
                        <span key={type} className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-white/40 uppercase tracking-tighter">
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[10px] text-white/20 uppercase tracking-widest font-bold">
                    No records found in this category
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Primary Insights */}
      <div className="space-y-6">
        {/* Contact Analysis (Calls) */}
        {renderTable(callStats, "Contact Analysis", Phone, "Incoming & Outgoing Calls")}
        
        {/* SMS Analysis */}
        {renderTable(smsStats, "SMS Analysis", MessageSquare, "Text Message Interactions")}
      </div>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white/[0.03] border-white/10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Top Location</p>
              <p className="text-lg font-mono text-white">
                {summary.topLocation ? `${summary.topLocation.lat.toFixed(4)}, ${summary.topLocation.lon.toFixed(4)}` : "N/A"}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-white/5">
            <p className="text-2xl font-bold">{summary.topLocation?.count || 0}</p>
            <p className="text-xs text-white/40">Occurrences at this coordinate</p>
          </div>
        </Card>

        <Card className="p-6 bg-white/[0.03] border-white/10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Longest Call</p>
              <p className="text-lg font-mono text-white">{formatDuration(summary.longestCall?.duration || 0)}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-white/5">
            <p className="text-sm font-medium text-white/60 truncate" title={summary.longestCall?.number}>
              Target: {summary.longestCall?.number || "N/A"}
            </p>
            <p className="text-xs text-white/40">Maximum duration record</p>
          </div>
        </Card>
      </div>

      {/* Secondary Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white/[0.02] border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-2">Device Identity</p>
          <div className="space-y-2">
            <div>
              <p className="text-[9px] text-white/20 uppercase">IMEI</p>
              <p className="text-xs font-mono text-white/80">{summary.device?.imei || "Not Found"}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">IMSI</p>
              <p className="text-xs font-mono text-white/80">{summary.device?.imsi || "Not Found"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/[0.02] border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-2">Activity Profile</p>
          <div className="space-y-2">
            <div>
              <p className="text-[9px] text-white/20 uppercase">Top Day</p>
              <p className="text-xs font-mono text-white/80">{summary.activity?.topDay || "N/A"}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">Peak Hour</p>
              <p className="text-xs font-mono text-white/80">{summary.activity?.peakHour || "N/A"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/[0.02] border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-2">Call Types</p>
          <div className="space-y-1">
            {Object.entries(summary.callTypeStats || {}).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <p className="text-[10px] text-white/50">{type}</p>
                <p className="text-[10px] font-mono text-white/80">{count}</p>
              </div>
            ))}
            {Object.keys(summary.callTypeStats || {}).length === 0 && <p className="text-[10px] text-white/20 italic">No data</p>}
          </div>
        </Card>

        <Card className="p-4 bg-white/[0.02] border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-2">Roaming & Location</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", summary.isRoaming ? "bg-orange-500 animate-pulse" : "bg-green-500")} />
              <p className="text-xs text-white/80">{summary.isRoaming ? "Roaming Detected" : "Home Network"}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">Primary Address</p>
              <p className="text-[10px] text-white/60 line-clamp-2 leading-tight">{summary.topAddress || "N/A"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Interaction Timeline Popup */}
      <AnimatePresence>
        {selectedNumber && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNumber(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Popup Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                    <Phone size={24} className="text-white/60" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{selectedNumber}</h3>
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">Interaction Timeline</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNumber(null)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Popup Content */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar">
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="sticky top-0 bg-[#0F0F0F] z-10">
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Tower ID</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Latitude</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Longitude</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedInteractions.map((point, idx) => {
                        const type = point.callType || '';
                        const isIncoming = type.toUpperCase().includes('INCOMING') || 
                                         type.toUpperCase().includes('MTC') || 
                                         type.toUpperCase().includes('TERMINATING') ||
                                         type.toUpperCase().includes('IN');
                        const isSmsType = isSms(type);
                        
                        let displayType = type;
                        if (isSmsType) displayType = 'SMS';
                        else if (isIncoming) displayType = 'call-in';
                        else displayType = 'call-out';

                        return (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isSmsType ? "bg-blue-500" : 
                                  isIncoming ? "bg-green-500" : "bg-orange-500"
                                )} />
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-tighter",
                                  isSmsType ? "text-blue-400" : 
                                  isIncoming ? "text-green-400" : "text-orange-400"
                                )}>
                                  {displayType}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[10px] font-mono text-white/60">
                              {formatDate(point.date)}
                            </td>
                            <td className="px-4 py-3 text-[10px] font-mono text-white/60">
                              {point.time}
                            </td>
                            <td className="px-4 py-3 text-[10px] font-mono text-white/40">
                              {!isSmsType && point.duration ? formatDuration(point.duration) : '-'}
                            </td>
                            <td className="px-4 py-3 text-[10px] font-mono text-white/40">
                              {point.cellId}
                            </td>
                            <td className="px-4 py-3 text-[10px] font-mono text-white/40">
                              {point.lat.toFixed(6)}
                            </td>
                            <td className="px-4 py-3 text-[10px] font-mono text-white/40">
                              {point.lon.toFixed(6)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-[10px] text-white/40 line-clamp-1 max-w-[200px]" title={point.address}>
                                {point.address || '-'}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Popup Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">
                  Total Records: {selectedInteractions.length}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[9px] text-white/30 uppercase font-bold">call-in</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-[9px] text-white/30 uppercase font-bold">call-out</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[9px] text-white/30 uppercase font-bold">SMS</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
