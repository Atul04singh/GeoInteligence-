import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Map as MapIcon, 
  Activity, 
  Maximize, 
  Minimize, 
  Download,
  Filter,
  Search,
  Calendar,
  Clock,
  X,
  List,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { Point, AnalysisResult } from '../types';
import { MapViewer } from './MapViewer';
import { Card } from './ui/Card';

interface MapViewProps {
  result: AnalysisResult;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const MapView = ({ result, searchQuery, onSearchChange }: MapViewProps) => {
  const [mapType, setMapType] = useState<'heatmap' | 'path' | 'cluster'>('heatmap');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'timeline'>('filters');
  const [filterDate, setFilterDate] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  const filteredPoints = useMemo(() => {
    return result.points.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.cellId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bParty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.aParty?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = filterDate === '' || p.date === filterDate;
      
      const matchesTime = (filterStartTime === '' || p.time >= filterStartTime) &&
                          (filterEndTime === '' || p.time <= filterEndTime);

      return matchesSearch && matchesDate && matchesTime;
    });
  }, [result.points, searchQuery, filterDate, filterStartTime, filterEndTime]);

  // Sort points for timeline: Latest to Oldest
  const timelinePoints = useMemo(() => {
    return [...filteredPoints].sort((a, b) => {
      const dateA = `${a.date}T${a.time}`;
      const dateB = `${b.date}T${b.time}`;
      return dateB.localeCompare(dateA);
    });
  }, [filteredPoints]);

  const mapTypes = [
    { id: 'heatmap', label: 'Heatmap', icon: Activity, description: 'Density distribution' },
    { id: 'path', label: 'Movement Path', icon: MapIcon, description: 'Sequential movement' },
    { id: 'cluster', label: 'Point Clusters', icon: Layers, description: 'Individual locations' },
  ];

  return (
    <div className="h-[calc(100vh-64px)] relative overflow-hidden animate-in fade-in duration-700">
      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        <MapViewer 
          type={mapType} 
          points={filteredPoints} 
          selectedPoint={selectedPoint} 
        />
      </div>

      {/* Layer Controls (Floating) */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10 flex flex-row sm:flex-col gap-2 sm:gap-3 max-w-[calc(100%-100px)] overflow-x-auto no-scrollbar pb-2">
        {mapTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setMapType(type.id as any)}
            className={cn(
              "flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all border shadow-2xl group shrink-0",
              mapType === type.id 
                ? "bg-white text-black border-white" 
                : "bg-[#0A0A0A]/80 backdrop-blur-xl text-white/40 border-white/10 hover:text-white hover:border-white/20"
            )}
          >
            <type.icon size={16} className={cn("sm:w-[18px] sm:h-[18px]", mapType === type.id ? "text-black" : "group-hover:scale-110 transition-transform")} />
            <div className="text-left">
              <p className="text-[10px] sm:text-xs font-bold leading-none">{type.label}</p>
              <p className={cn("text-[8px] sm:text-[9px] uppercase tracking-widest mt-0.5 sm:mt-1 hidden xs:block", mapType === type.id ? "text-black/40" : "text-white/20")}>
                {type.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Filter panel toggle */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10 flex flex-col items-end gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all border shadow-2xl backdrop-blur-xl",
            showFilters 
              ? "bg-white text-black border-white" 
              : "bg-[#0A0A0A]/80 text-white/40 border-white/10 hover:text-white"
          )}
        >
          <Filter size={18} className="sm:w-5 sm:h-5" />
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="w-[calc(100vw-32px)] sm:w-80 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh] sm:max-h-[80vh]"
            >
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button 
                  onClick={() => setActiveTab('filters')}
                  className={cn(
                    "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors",
                    activeTab === 'filters' ? "text-white bg-white/5" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Filters
                </button>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={cn(
                    "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors",
                    activeTab === 'timeline' ? "text-white bg-white/5" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Timeline
                </button>
                <button onClick={() => setShowFilters(false)} className="px-4 text-white/20 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {activeTab === 'filters' ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/20 uppercase font-bold flex items-center gap-2">
                        <Calendar size={10} />
                        Filter Date
                      </label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/20 uppercase font-bold flex items-center gap-2">
                          <Clock size={10} />
                          Start
                        </label>
                        <input
                          type="time"
                          value={filterStartTime}
                          onChange={(e) => setFilterStartTime(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/20 uppercase font-bold flex items-center gap-2">
                          <Clock size={10} />
                          End
                        </label>
                        <input
                          type="time"
                          value={filterEndTime}
                          onChange={(e) => setFilterEndTime(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <p className="text-[10px] text-white/40 font-mono">{filteredPoints.length} Points Visible</p>
                      <button 
                        onClick={() => {
                          setFilterDate('');
                          setFilterStartTime('');
                          setFilterEndTime('');
                        }}
                        className="text-[10px] text-white/20 uppercase font-bold hover:text-white transition-colors"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-4">Latest Movements</p>
                    {timelinePoints.length === 0 ? (
                      <p className="text-xs text-white/20 italic text-center py-10">No points match filters</p>
                    ) : (
                      timelinePoints.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedPoint(p)}
                          className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-bold text-white/60 group-hover:text-white">{formatDate(p.date)}</p>
                            <p className="text-[10px] font-mono text-white/30">{p.time}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-mono text-white/40 truncate max-w-[150px]">{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</p>
                            <Navigation size={10} className="text-white/20 group-hover:text-white transition-colors" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-20 sm:bottom-6 left-4 sm:left-6 z-10 p-3 sm:p-4 bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl">
        <div className="flex flex-col gap-2 sm:gap-3">
          <p className="text-[8px] sm:text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Density (Ring Color)</p>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-red-500 bg-[#ff4444]" />
              <p className="text-[9px] sm:text-[10px] text-white/60 uppercase tracking-widest font-bold">High</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-orange-500 bg-[#ff4444]" />
              <p className="text-[9px] sm:text-[10px] text-white/60 uppercase tracking-widest font-bold">Med</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white bg-[#ff4444]" />
              <p className="text-[9px] sm:text-[10px] text-white/60 uppercase tracking-widest font-bold">Low</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
