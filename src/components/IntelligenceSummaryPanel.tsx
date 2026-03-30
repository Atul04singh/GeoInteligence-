import React from 'react';
import { AlertCircle, Phone, Map as MapIcon, Zap } from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { IntelligenceSummary } from '../types';

export const IntelligenceSummaryPanel = ({ summary }: { summary: IntelligenceSummary }) => {
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

  const callTypeStats = summary.callTypeStats || {};
  const contactStats = Array.isArray(summary.contactStats) ? summary.contactStats : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Primary Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Table Section - Takes 2 columns on large screens */}
        <Card className="lg:col-span-2 p-6 bg-white/[0.03] border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Contact Analysis</p>
                <p className="text-sm font-medium text-white">Most to Least Contacted</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <p className="text-[10px] text-white/60 font-mono">{contactStats.length} Unique Contacts</p>
            </div>
          </div>
          
          <div className="mt-2 overflow-hidden rounded-lg border border-white/5">
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
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
                  {contactStats.map((contact, index) => (
                    <tr key={contact.number} className="hover:bg-white/[0.02] transition-colors group">
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
                        <p className="text-xs font-mono text-white/90 group-hover:text-white transition-colors">
                          {contact.number}
                        </p>
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
                          <p className="text-[10px] text-white/60">{contact.lastDate || "N/A"}</p>
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
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Right Column Insights */}
        <div className="flex flex-col gap-6">
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
            {Object.entries(callTypeStats).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <p className="text-[10px] text-white/50">{type}</p>
                <p className="text-[10px] font-mono text-white/80">{count}</p>
              </div>
            ))}
            {Object.keys(callTypeStats).length === 0 && <p className="text-[10px] text-white/20 italic">No data</p>}
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
    </div>
  );
};
