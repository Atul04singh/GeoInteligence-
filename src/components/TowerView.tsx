import React from 'react';
import { 
  Radio as TowerIcon, 
  Search, 
  Download, 
  Filter,
  Activity,
  Map as MapIcon,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AnalysisResult } from '../types';
import { TowerTable } from './TowerTable';
import { Card } from './ui/Card';

interface TowerViewProps {
  result: AnalysisResult;
}

export const TowerView = ({ result }: TowerViewProps) => {
  const towers = result.towerAnalysis;
  const topTower = towers[0];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 md:pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
            <TowerIcon size={18} className="text-white/60 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">Tower Analysis</h2>
            <p className="text-[10px] sm:text-xs lg:text-sm text-white/40">Geospatial distribution of cell towers and signal frequency.</p>
          </div>
        </div>
      </div>

      {/* Top Tower Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-4">
          <Card className="p-6 sm:p-8 bg-white/[0.03] border-white/10 flex flex-col gap-6 sm:gap-8 h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TowerIcon size={80} className="sm:w-[120px] sm:h-[120px]" />
            </div>
            
            <div>
              <p className="text-[9px] sm:text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Primary Cell Tower</p>
              <h3 className="text-2xl sm:text-4xl font-mono font-bold text-white truncate">{topTower["CELL ID"]}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-[9px] sm:text-[10px] text-white/30 uppercase font-bold mb-1">Total Hits</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{topTower.FREQUENCY}</p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-white/30 uppercase font-bold mb-1">Avg Lat</p>
                  <p className="text-sm sm:text-lg font-mono text-white/60">{topTower["AVG LATITUDE"].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-white/30 uppercase font-bold mb-1">Avg Lon</p>
                  <p className="text-sm sm:text-lg font-mono text-white/60">{topTower["AVG LONGITUDE"].toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 sm:pt-8 border-t border-white/5 space-y-4">
              <p className="text-[11px] sm:text-xs text-white/40 leading-relaxed">
                This tower represents the most frequent point of contact for the target device, accounting for 
                <span className="text-white font-bold mx-1">
                  {((topTower.FREQUENCY / result.summary.totalPoints) * 100).toFixed(1)}%
                </span>
                of all recorded activity.
              </p>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${topTower["AVG LATITUDE"]},${topTower["AVG LONGITUDE"]}`}
                target="_blank"
                className="flex items-center justify-between w-full p-3 sm:p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all group/btn"
              >
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">View on Google Maps</span>
                <ExternalLink size={12} className="sm:w-[14px] sm:h-[14px] group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </div>
          </Card>
        </div>

        {/* Tower Table Section */}
        <div className="lg:col-span-8 space-y-8">
          {/* Frequency Distribution Chart (Alternative to Canvas) */}
          <Card className="p-6 bg-white/[0.03] border-white/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Frequency Distribution</p>
                <p className="text-sm font-medium text-white">Top 10 Towers by Activity</p>
              </div>
              <Activity size={16} className="text-white/20" />
            </div>
            
            <div className="space-y-4">
              {towers.slice(0, 10).map((tower, idx) => (
                <div key={idx} className="space-y-2 group">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-mono text-white/60 group-hover:text-white transition-colors">
                      {tower["CELL ID"]}
                    </p>
                    <p className="text-[10px] font-mono text-white/40">
                      {tower.FREQUENCY} hits
                    </p>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(tower.FREQUENCY / topTower.FREQUENCY) * 100}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className="h-full bg-gradient-to-r from-white/20 to-white/60 group-hover:from-white/40 group-hover:to-white transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white/[0.03] border-white/10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Full Tower Distribution</p>
              <p className="text-[10px] text-white/20 font-mono">{towers.length} Unique Towers Identified</p>
            </div>
            <div className="h-[500px]">
              <TowerTable data={towers} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
