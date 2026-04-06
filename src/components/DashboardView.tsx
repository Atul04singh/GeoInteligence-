import React from 'react';
import { 
  Activity, 
  Map as MapIcon, 
  Radio as TowerIcon, 
  Phone, 
  Zap, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Smartphone, 
  Globe,
  ArrowUpRight,
  Maximize2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDuration, formatDate } from '../lib/utils';
import { AnalysisResult, IntelligenceSummary } from '../types';
import { Card } from './ui/Card';
import { IntelligenceSummaryPanel } from './IntelligenceSummaryPanel';

interface DashboardViewProps {
  result: AnalysisResult;
  onViewChange: (view: any) => void;
}

export const DashboardView = ({ result, onViewChange }: DashboardViewProps) => {
  const summary = result.intelligenceSummary;
  const stats = [
    { label: 'Total Records', value: result.summary.totalPoints, icon: Activity, color: 'text-blue-500' },
    { label: 'Unique Towers', value: result.summary.uniqueTowers, icon: TowerIcon, color: 'text-purple-500' },
    { label: 'Date Range', value: result.summary.dateRange.split(' to ').map(formatDate).join(' to '), icon: Calendar, color: 'text-orange-500' },
    { label: 'Roaming Status', value: summary.isRoaming ? 'Roaming' : 'Home', icon: Globe, color: summary.isRoaming ? 'text-red-500' : 'text-green-500' },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 md:pb-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-3 sm:p-4 lg:p-6 bg-white/[0.03] border-white/10 hover:bg-white/[0.05] transition-all group">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <div className={cn("p-2 lg:p-3 rounded-lg sm:rounded-xl bg-white/5 group-hover:scale-110 transition-transform", stat.color)}>
                <stat.icon size={16} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </div>
              <ArrowUpRight size={12} className="text-white/10 group-hover:text-white/40 transition-colors sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
            </div>
            <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">{stat.label}</p>
            <p className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Intelligence Summary Panel (Contact Table) */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          <IntelligenceSummaryPanel result={result} />
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-6 lg:space-y-8">
          {/* Spatial Overview (Mini Map) */}
          <Card className="p-4 sm:p-6 bg-white/[0.03] border-white/10 flex flex-col gap-4 sm:gap-6 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-bold tracking-wider">Spatial Overview</p>
                  <p className="text-xs sm:text-sm font-medium text-white">Coordinate Distribution</p>
                </div>
              </div>
              <button 
                onClick={() => onViewChange('map')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
              >
                <Maximize2 size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
            
            {/* Visual representation of map (placeholder or small canvas) */}
            <div className="aspect-video bg-white/5 rounded-xl border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-all">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-white/80">{result.summary.totalPoints}</p>
                  <p className="text-[9px] sm:text-[10px] text-white/30 uppercase tracking-widest">Plotted Points</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-white/5">
                <p className="text-[8px] sm:text-[9px] text-white/20 uppercase font-bold mb-1">Top Lat</p>
                <p className="text-[10px] sm:text-xs font-mono text-white/60">{summary.topLocation?.lat.toFixed(4) || "N/A"}</p>
              </div>
              <div className="p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-white/5">
                <p className="text-[8px] sm:text-[9px] text-white/20 uppercase font-bold mb-1">Top Lon</p>
                <p className="text-[10px] sm:text-xs font-mono text-white/60">{summary.topLocation?.lon.toFixed(4) || "N/A"}</p>
              </div>
            </div>
          </Card>

          {/* Device Profile */}
          <Card className="p-4 sm:p-6 bg-white/[0.03] border-white/10 flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-bold tracking-wider">Device Profile</p>
                <p className="text-xs sm:text-sm font-medium text-white">Identity Metadata</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-2.5 sm:p-3 bg-white/5 rounded-lg sm:rounded-xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] text-white/30 uppercase font-bold">IMEI</p>
                <p className="text-[10px] sm:text-xs font-mono text-white/80">{summary.device?.imei || "Not Found"}</p>
              </div>
              <div className="flex justify-between items-center p-2.5 sm:p-3 bg-white/5 rounded-lg sm:rounded-xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] text-white/30 uppercase font-bold">IMSI</p>
                <p className="text-[10px] sm:text-xs font-mono text-white/80">{summary.device?.imsi || "Not Found"}</p>
              </div>
            </div>
          </Card>

          {/* Activity Trends */}
          <Card className="p-4 sm:p-6 bg-white/[0.03] border-white/10 flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-lg sm:rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-bold tracking-wider">Activity Trends</p>
                <p className="text-xs sm:text-sm font-medium text-white">Temporal Analysis</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-[8px] sm:text-[9px] text-white/20 uppercase font-bold">Peak Hour</p>
                <p className="text-base sm:text-lg font-bold text-white">{summary.activity?.peakHour || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <p className="text-[8px] sm:text-[9px] text-white/20 uppercase font-bold">Top Day</p>
                <p className="text-base sm:text-lg font-bold text-white">{summary.activity?.topDay || "N/A"}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
