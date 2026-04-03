import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Map as MapIcon, Activity, Layers, Radio as Tower, Download, X, ChevronRight, ExternalLink, AlertCircle, Info, History as HistoryIcon, Trash2, Clock, Maximize, Minimize, GripHorizontal, Search, Calendar, Filter, Phone, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

import { Point, TowerStat, IntelligenceSummary, AnalysisResult, HistoryItem, View } from './types';
import { cn, formatDuration } from './lib/utils';
import { saveToHistory, getHistory, deleteFromHistory } from './lib/db';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MapView } from './components/MapView';
import { TowerView } from './components/TowerView';
import { UploadView } from './components/UploadView';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeView, setActiveView] = useState<View>('upload');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleHistorySelect = (item: HistoryItem) => {
    setResult(item.result);
    setActiveView('dashboard');
  };

  const handleHistoryDelete = async (id: string) => {
    try {
      await deleteFromHistory(id);
      await loadHistory();
      if (result && history.find(h => h.id === id)?.result === result) {
        setResult(null);
        setActiveView('upload');
      }
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const trimmed = dateStr.trim();
    
    // 1. Already normalized
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) return trimmed;

    try {
      // 2. Manual parsing for common formats (Prioritize over new Date() to avoid locale issues)
      const separators = ['/', '-', '.'];
      for (const sep of separators) {
        if (trimmed.includes(sep)) {
          const parts = trimmed.split(sep);
          if (parts.length === 3) {
            let day, month, year;
            if (parts[0].length === 4) { // YYYY/MM/DD
              [year, month, day] = parts;
            } else {
              // For ambiguous cases like 12/03/2026, we assume DD/MM/YYYY 
              // as requested by the user's preference for dd/mm/yyyy display
              const p0 = parseInt(parts[0]);
              const p1 = parseInt(parts[1]);
              
              if (p0 > 12) { // Definitely DD/MM/YYYY
                [day, month, year] = parts;
              } else if (p1 > 12) { // Definitely MM/DD/YYYY
                [month, day, year] = parts;
              } else {
                // Ambiguous (both <= 12), default to DD/MM/YYYY 
                // as it is the standard format in India (user's region)
                [day, month, year] = parts;
              }
            }
            
            // Ensure year is 4 digits
            if (year.length === 2) year = (parseInt(year) > 50 ? "19" : "20") + year;
            
            const finalYear = year.padStart(4, '0');
            const finalMonth = month.padStart(2, '0');
            const finalDay = day.padStart(2, '0');
            
            // Validate if it's a real date
            const testDate = new Date(`${finalYear}-${finalMonth}-${finalDay}`);
            if (!isNaN(testDate.getTime())) {
              return `${finalYear}-${finalMonth}-${finalDay}`;
            }
          }
        }
      }

      // 3. Fallback to standard parsing
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        if (year > 1970) return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn("Normalization failed for", dateStr);
    }
    return trimmed;
  };

  const normalizeTime = (timeStr: string): string => {
    if (!timeStr) return "";
    const trimmed = timeStr.trim();
    if (trimmed.match(/^\d{2}:\d{2}$/)) return trimmed;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        let h = parts[0].trim().padStart(2, '0');
        let m = parts[1].trim().padStart(2, '0');
        if (trimmed.toLowerCase().includes('pm') && parseInt(h) < 12) h = String(parseInt(h) + 12);
        else if (trimmed.toLowerCase().includes('am') && parseInt(h) === 12) h = '00';
        return `${h}:${m}`;
      }
    }
    return trimmed;
  };

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processExcel = async (file: File) => {
    return new Promise<AnalysisResult>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

          if (jsonData.length === 0) throw new Error("The selected Excel file appears to be empty.");

          // Auto-detect columns based on user provided keys
          const keys = Object.keys(jsonData[0]);
          const latKey = keys.find(k => k.toUpperCase() === "LATITUDE") || keys.find(k => k.toUpperCase().includes("LAT"));
          const lonKey = keys.find(k => k.toUpperCase() === "LONGITUDE") || keys.find(k => k.toUpperCase().includes("LON"));
          
          if (!latKey || !lonKey) {
            throw new Error("Could not find Latitude or Longitude columns. Please ensure your Excel file has columns named 'LATITUDE' and 'LONGITUDE'.");
          }

          const dateKey = keys.find(k => k.toUpperCase() === "DATE") || keys.find(k => k.toUpperCase().includes("DATE")) || "DATE";
          const timeKey = keys.find(k => k.toUpperCase() === "TIME") || keys.find(k => k.toUpperCase().includes("TIME")) || "TIME";
          const cellKey = keys.find(k => k.toUpperCase() === "FIRST CELL ID") || keys.find(k => k.toUpperCase() === "FIRST CELL ID A") || keys.find(k => k.toUpperCase().includes("CELL") || k.toUpperCase().includes("TOWER")) || "CELL ID";
          const aPartyKey = keys.find(k => k.toUpperCase() === "A PARTY") || keys.find(k => k.toUpperCase().includes("A PARTY") || k.toUpperCase().includes("A_PARTY") || k.toUpperCase().includes("SOURCE"));
          const bPartyKey = keys.find(k => k.toUpperCase() === "B PARTY") || keys.find(k => k.toUpperCase().includes("B PARTY") || k.toUpperCase().includes("B_PARTY") || k.toUpperCase().includes("DESTINATION"));
          const durationKey = keys.find(k => k.toUpperCase() === "DURATION") || keys.find(k => k.toUpperCase().includes("DURATION") || k.toUpperCase().includes("DUR"));
          const callTypeKey = keys.find(k => k.toUpperCase() === "CALL TYPE");
          const imeiKey = keys.find(k => k.toUpperCase() === "IMEI") || keys.find(k => k.toUpperCase() === "IMEI A");
          const imsiKey = keys.find(k => k.toUpperCase() === "IMSI") || keys.find(k => k.toUpperCase() === "IMSI A");
          const addressKey = keys.find(k => k.toUpperCase() === "FIRST CELL ID A ADDRESS") || keys.find(k => k.toUpperCase().includes("ADDRESS"));
          const roamingKey = keys.find(k => k.toUpperCase() === "ROAMING A") || keys.find(k => k.toUpperCase().includes("ROAMING"));

          // Process points
          const points = jsonData.map(row => {
            const lat = parseFloat(row[latKey]);
            const lon = parseFloat(row[lonKey]);
            const bParty = bPartyKey ? String(row[bPartyKey] || "").trim() : "";
            
            // Rule: Ignore rows where LATITUDE or LONGITUDE is missing
            if (isNaN(lat) || isNaN(lon)) return null;
            
            // Rule: Ignore rows where B PARTY is empty
            if (!bParty) return null;
            
            // Robust date/time parsing
            let rawDate = String(row[dateKey] || "");
            let rawTime = String(row[timeKey] || "");
            
            // If date contains a space, it might have time included
            if (rawDate.includes(' ') && rawTime === "") {
              const parts = rawDate.split(' ');
              rawDate = parts[0];
              rawTime = parts[1];
            }
            
            // Try to normalize date to YYYY-MM-DD
            const normalizedDate = normalizeDate(rawDate);
            
            // Try to normalize time to HH:mm
            const normalizedTime = normalizeTime(rawTime);
            
            return {
              lat,
              lon,
              date: normalizedDate,
              time: normalizedTime,
              cellId: String(row[cellKey] || "N/A"),
              timestamp: new Date(`${normalizedDate}T${normalizedTime}:00`).getTime() || Date.now(),
              aParty: aPartyKey ? String(row[aPartyKey] || "") : undefined,
              bParty: bParty,
              duration: durationKey ? parseFloat(row[durationKey]) || 0 : undefined,
              callType: callTypeKey ? String(row[callTypeKey] || "") : undefined,
              imei: imeiKey ? String(row[imeiKey] || "") : undefined,
              imsi: imsiKey ? String(row[imsiKey] || "") : undefined,
              address: addressKey ? String(row[addressKey] || "") : undefined,
              roaming: roamingKey ? String(row[roamingKey] || "") : undefined
            };
          }).filter((p): p is NonNullable<typeof p> => p !== null).sort((a, b) => a.timestamp - b.timestamp);

          if (points.length === 0) {
            throw new Error("No valid coordinates or B-Party numbers found in the file. Please check the data format.");
          }

          // Intelligence Summary Calculations
          const bPartyData: Record<string, { 
            count: number; 
            totalDuration: number; 
            lastDate: string; 
            lastTime: string; 
            callTypes: Set<string>;
            lastTimestamp: number;
          }> = {};
          const locationHits: Record<string, number> = {};
          const dayCounts: Record<string, number> = {};
          const hourCounts: Record<string, number> = {};
          const callTypeStats: Record<string, number> = {};
          const addressCounts: Record<string, number> = {};
          let longestCall = { duration: 0, number: "N/A" };
          let imei = "Not Found";
          let imsi = "Not Found";
          let isRoaming = false;

          points.forEach(p => {
            // 1. MOST CONTACTED
            if (p.bParty) {
              if (!bPartyData[p.bParty]) {
                bPartyData[p.bParty] = { 
                  count: 0, 
                  totalDuration: 0, 
                  lastDate: p.date, 
                  lastTime: p.time, 
                  callTypes: new Set(),
                  lastTimestamp: p.timestamp
                };
              }
              const data = bPartyData[p.bParty];
              data.count++;
              data.totalDuration += p.duration || 0;
              if (p.callType) data.callTypes.add(p.callType);
              if (p.timestamp >= data.lastTimestamp) {
                data.lastDate = p.date;
                data.lastTime = p.time;
                data.lastTimestamp = p.timestamp;
              }
            }

            // 2. TOP LOCATION
            const locKey = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
            locationHits[locKey] = (locationHits[locKey] || 0) + 1;

            // 3. LONGEST CALL
            if (p.duration !== undefined && p.duration > longestCall.duration) {
              longestCall = { duration: p.duration, number: p.bParty || "N/A" };
            }

            // 5. ACTIVITY PROFILE - Top Day
            if (p.date) {
              dayCounts[p.date] = (dayCounts[p.date] || 0) + 1;
            }

            // 5. ACTIVITY PROFILE - Peak Hour
            if (p.time) {
              const hour = p.time.split(':')[0];
              hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }

            // 6. CALL TYPES
            if (p.callType) {
              callTypeStats[p.callType] = (callTypeStats[p.callType] || 0) + 1;
            }

            // Address Stats
            if (p.address) {
              addressCounts[p.address] = (addressCounts[p.address] || 0) + 1;
            }

            // 4. DEVICE IDENTITY (take first non-empty)
            if (imei === "Not Found" && p.imei && p.imei.trim() !== "") imei = p.imei;
            if (imsi === "Not Found" && p.imsi && p.imsi.trim() !== "") imsi = p.imsi;

            // 7. ROAMING STATUS
            if (p.roaming && p.roaming.toUpperCase() !== "HOME" && p.roaming.toUpperCase() !== "NO" && p.roaming.toUpperCase() !== "FALSE") {
              isRoaming = true;
            }
          });

          const getSortedEntries = (counts: Record<string, number>) => {
            return Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => ({ key, count }));
          };

          const sortedContacts = Object.entries(bPartyData)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([number, data]) => ({
              number,
              count: data.count,
              totalDuration: data.totalDuration,
              lastDate: data.lastDate,
              lastTime: data.lastTime,
              callTypes: Array.from(data.callTypes)
            }));

          const topLocationEntry = getSortedEntries(locationHits)[0];
          const topDayEntry = getSortedEntries(dayCounts)[0];
          const topHourEntry = getSortedEntries(hourCounts)[0];
          const topAddressEntry = getSortedEntries(addressCounts)[0];

          const intelligenceSummary: IntelligenceSummary = {
            contactStats: sortedContacts,
            topLocation: topLocationEntry ? { 
              lat: parseFloat(topLocationEntry.key.split(',')[0]), 
              lon: parseFloat(topLocationEntry.key.split(',')[1]), 
              count: topLocationEntry.count 
            } : null,
            longestCall: longestCall.duration > 0 ? longestCall : null,
            device: { imei, imsi },
            activity: { 
              topDay: topDayEntry ? topDayEntry.key : "N/A", 
              peakHour: topHourEntry ? `${topHourEntry.key}:00` : "N/A" 
            },
            callTypeStats,
            isRoaming,
            topAddress: topAddressEntry ? topAddressEntry.key : null
          };

          // Tower Analysis
          const towerStats: any = {};
          points.forEach(p => {
            if (!p.cellId) return;
            if (!towerStats[p.cellId]) {
              towerStats[p.cellId] = { id: p.cellId, count: 0, lats: [], lons: [] };
            }
            towerStats[p.cellId].count++;
            towerStats[p.cellId].lats.push(p.lat);
            towerStats[p.cellId].lons.push(p.lon);
          });

          const towerAnalysis = Object.values(towerStats).map((t: any) => ({
            "CELL ID": t.id,
            "FREQUENCY": t.count,
            "AVG LATITUDE": t.lats.reduce((a: any, b: any) => a + b, 0) / t.lats.length,
            "AVG LONGITUDE": t.lons.reduce((a: any, b: any) => a + b, 0) / t.lons.length
          })).sort((a, b) => b.FREQUENCY - a.FREQUENCY);

          resolve({
            points,
            towerAnalysis,
            summary: {
              totalPoints: points.length,
              uniqueTowers: towerAnalysis.length,
              dateRange: points.length > 0 ? `${points[0].date} to ${points[points.length - 1].date}` : "N/A"
            },
            intelligenceSummary
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const data = await processExcel(file);
      const historyItem: HistoryItem = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: file.name,
        timestamp: Date.now(),
        result: data
      };
      await saveToHistory(historyItem);
      await loadHistory();
      setResult(data);
      setActiveView('dashboard');
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during processing.");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!result || activeView === 'upload') {
      return (
        <UploadView 
          onFileChange={handleFileChange}
          onUpload={handleUpload}
          file={file}
          loading={loading}
          error={error}
          fileInputRef={fileInputRef}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView result={result} onViewChange={setActiveView} />;
      case 'map':
        return <MapView result={result} searchQuery={searchQuery} onSearchChange={setSearchQuery} />;
      case 'towers':
        return <TowerView result={result} />;
      default:
        return <DashboardView result={result} onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black flex flex-row">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        history={history}
        onHistorySelect={handleHistorySelect}
        onHistoryDelete={handleHistoryDelete}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navbar 
          result={result}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (result ? 'has-result' : 'no-result')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* PWA Install Prompt */}
        <AnimatePresence>
          {deferredPrompt && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-8 right-8 z-50"
            >
              <div className="bg-white text-black p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-2xl">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <Zap className="text-white w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Install App</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Optimized Experience</p>
                </div>
                <button 
                  onClick={handleInstall}
                  className="h-10 px-6 bg-black text-white rounded-xl text-xs font-bold hover:bg-black/90 transition-all"
                >
                  Install
                </button>
                <button 
                  onClick={() => setDeferredPrompt(null)} 
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Sub-components removed (moved to separate files) ---
