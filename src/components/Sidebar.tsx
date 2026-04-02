import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Radio as TowerIcon, 
  Upload, 
  History as HistoryIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { View, HistoryItem } from '../types';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  history: HistoryItem[];
  onHistorySelect: (item: HistoryItem) => void;
  onHistoryDelete: (id: string) => void;
}

export const Sidebar = ({ 
  activeView, 
  onViewChange, 
  isCollapsed, 
  onToggleCollapse,
  history,
  onHistorySelect,
  onHistoryDelete
}: SidebarProps) => {
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map' as View, label: 'Full Map', icon: MapIcon },
    { id: 'towers' as View, label: 'Tower Analysis', icon: TowerIcon },
    { id: 'upload' as View, label: 'Upload New', icon: Upload },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="hidden md:flex h-screen bg-[#0A0A0A] border-r border-white/5 flex-col z-50 sticky top-0 shrink-0"
      >
        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-10 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center shadow-xl z-50 hover:scale-110 transition-transform"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Navigation */}
        <div className="p-4 space-y-2 flex-1 overflow-y-auto no-scrollbar">
          {!isCollapsed && (
            <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest px-4 mb-4">Navigation</p>
          )}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                activeView === item.id 
                  ? "bg-white text-black" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={20} className={cn(activeView === item.id ? "text-black" : "group-hover:scale-110 transition-transform")} />
              {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}

          {/* History Section */}
          <div className="pt-8">
            {!isCollapsed && (
              <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest px-4 mb-4">Recent History</p>
            )}
            <div className="space-y-1">
              {history.map((item) => (
                <div key={item.id} className="group relative">
                  <button
                    onClick={() => onHistorySelect(item)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left",
                      "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <FileText size={20} className="shrink-0" />
                    {!isCollapsed && (
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-white/20 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </button>
                  {!isCollapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHistoryDelete(item.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/0 group-hover:text-red-500/60 hover:!text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {history.length === 0 && !isCollapsed && (
                <p className="px-4 text-[10px] text-white/20 italic">No history yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
              <TowerIcon size={18} className="text-black" />
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-xs font-bold tracking-tight">GEOTEL INTEL</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest">v2.0 Dashboard</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/5 z-[100] flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onViewChange(item.id);
              setShowMobileHistory(false);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all",
              activeView === item.id && !showMobileHistory
                ? "text-white" 
                : "text-white/20"
            )}
          >
            <item.icon size={20} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label.split(' ')[0]}</span>
          </button>
        ))}
        {/* History Toggle for Mobile */}
        <button
          onClick={() => setShowMobileHistory(!showMobileHistory)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all",
            showMobileHistory ? "text-white" : "text-white/20"
          )}
        >
          <HistoryIcon size={20} />
          <span className="text-[9px] font-bold uppercase tracking-widest">History</span>
        </button>
      </nav>

      {/* Mobile History Overlay */}
      <AnimatePresence>
        {showMobileHistory && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="md:hidden fixed inset-0 z-[90] bg-[#050505] pt-20 px-6 pb-24 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Recent History</h2>
                <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">Local Session Data</p>
              </div>
              <button 
                onClick={() => setShowMobileHistory(false)}
                className="p-3 bg-white/5 rounded-full text-white/40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => {
                      onHistorySelect(item);
                      setShowMobileHistory(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-left active:bg-white/10 transition-all"
                  >
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-white/40" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate text-white">{item.name}</p>
                      <p className="text-[10px] text-white/30 flex items-center gap-1 mt-1 font-bold uppercase tracking-widest">
                        <Clock size={10} />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onHistoryDelete(item.id);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-red-500/40 active:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-center py-20">
                  <HistoryIcon size={40} className="mx-auto text-white/5 mb-4" />
                  <p className="text-sm text-white/20 italic">No history records found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
