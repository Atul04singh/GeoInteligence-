import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Settings, 
  Bell, 
  User, 
  Activity,
  FileText,
  Clock,
  ExternalLink,
  Linkedin,
  Mail,
  X,
  ShieldCheck,
  Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AnalysisResult } from '../types';

interface NavbarProps {
  result: AnalysisResult | null;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export const Navbar = ({ result, onSearchChange, searchQuery }: NavbarProps) => {
  const [showProfile, setShowProfile] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfile]);

  return (
    <nav className="h-14 sm:h-16 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: File Status */}
      <div className="flex items-center gap-4 sm:gap-6">
        {result ? (
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[9px] sm:text-[10px] text-white/60 font-mono flex items-center gap-1.5 sm:gap-2">
              <FileText size={10} className="sm:w-3 sm:h-3" />
              <span className="hidden xs:inline">{result.summary.totalPoints} Records Loaded</span>
              <span className="xs:hidden">{result.summary.totalPoints} Recs</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 rounded-full border border-white/10 opacity-40">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/20 rounded-full" />
            <p className="text-[9px] sm:text-[10px] text-white/60 font-mono">No Session</p>
          </div>
        )}
      </div>

      {/* Center: Empty Space (Search Removed) */}
      <div className="flex-1" />

      {/* Right: Actions */}
      <div className="flex items-center gap-3 sm:gap-4 relative">
        <div className="flex items-center gap-2 sm:gap-3 pl-2">
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-white font-bold leading-none">Analyst Mode</p>
            <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">Local Session</p>
          </div>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center border transition-all shrink-0",
              showProfile 
                ? "bg-white border-white text-black" 
                : "bg-white/10 border-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            )}
          >
            <User size={16} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </button>
        </div>

        {/* Profile Popup */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-4 w-72 sm:w-80 bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-white/5 to-transparent border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                    <User size={24} className="text-black" />
                  </div>
                  <button 
                    onClick={() => setShowProfile(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <h3 className="text-lg font-bold tracking-tight">Guest Account</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1">Limited Access Session</p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                    <Code2 size={16} className="text-white/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Developer</p>
                    <p className="text-sm font-medium text-white/80">Atul Singh</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} className="text-white/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Status</p>
                    <p className="text-sm font-medium text-white/80">Verified Analyst</p>
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a 
                    href="https://in.linkedin.com/in/atulsingh58" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#0077B5] hover:bg-[#0077B5]/90 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Linkedin size={14} />
                    LinkedIn
                  </a>
                  <a 
                    href="mailto:as3807778@gmail.com"
                    className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-all"
                  >
                    <Mail size={14} />
                    Email
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5">
                <p className="text-[9px] text-white/20 text-center uppercase tracking-[0.2em] font-bold">
                  GeoTel Intelligence v2.0
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
