import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Map as MapIcon, Activity, Layers, Radio as Tower, Download, X, ChevronRight, ExternalLink, AlertCircle, Info, History as HistoryIcon, Trash2, Clock, Maximize, Minimize, GripHorizontal, Search, Calendar, Filter, Phone, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

import { Point, TowerStat, IntelligenceSummary, AnalysisResult, HistoryItem } from './types';
import { cn, formatDuration } from './lib/utils';
import { saveToHistory, getHistory, deleteFromHistory } from './lib/db';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { IntelligenceSummaryPanel } from './components/IntelligenceSummaryPanel';
import { MapViewer } from './components/MapViewer';
import { TowerTable } from './components/TowerTable';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'path' | 'cluster' | 'towers' | 'intelligence'>('heatmap');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mapHeight, setMapHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = Math.max(300, Math.min(window.innerHeight - 100, e.clientY - (mapContainerRef.current?.getBoundingClientRect().top || 0)));
      setMapHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const trimmed = dateStr.trim();
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) return trimmed;

    try {
      // Try standard parsing first
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        // Check if the year is reasonable (not 1970 or 2001 default)
        if (year > 1970) return `${year}-${month}-${day}`;
      }

      // Manual parsing for common formats
      const separators = ['/', '-', '.'];
      for (const sep of separators) {
        if (trimmed.includes(sep)) {
          const parts = trimmed.split(sep);
          if (parts.length === 3) {
            let day, month, year;
            if (parts[0].length === 4) { // YYYY/MM/DD
              [year, month, day] = parts;
            } else if (parseInt(parts[0]) > 12) { // DD/MM/YYYY
              [day, month, year] = parts;
            } else if (parseInt(parts[1]) > 12) { // MM/DD/YYYY
              [month, day, year] = parts;
            } else {
              // Ambiguous, assume DD/MM/YYYY
              [day, month, year] = parts;
            }
            
            // Ensure year is 4 digits
            if (year.length === 2) year = (parseInt(year) > 50 ? "19" : "20") + year;
            
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
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

  const filteredPoints = React.useMemo(() => {
    if (!result) return [];
    return result.points.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.cellId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lat.toString().includes(searchQuery) ||
        p.lon.toString().includes(searchQuery);
      
      const pointDate = normalizeDate(p.date);
      const matchesDate = filterDate === '' || pointDate === filterDate;
      
      const pointTime = normalizeTime(p.time);
      let matchesTime = true;
      if (filterStartTime || filterEndTime) {
        if (filterStartTime && pointTime < filterStartTime) matchesTime = false;
        if (filterEndTime && pointTime > filterEndTime) matchesTime = false;
      }
      
      return matchesSearch && matchesDate && matchesTime;
    });
  }, [result, searchQuery, filterDate, filterStartTime, filterEndTime]);

  const filteredTowerAnalysis = React.useMemo(() => {
    if (!filteredPoints.length) return [];
    const towerStats: any = {};
    filteredPoints.forEach(p => {
      if (!p.cellId) return;
      if (!towerStats[p.cellId]) {
        towerStats[p.cellId] = { id: p.cellId, count: 0, lats: [], lons: [] };
      }
      towerStats[p.cellId].count++;
      towerStats[p.cellId].lats.push(p.lat);
      towerStats[p.cellId].lons.push(p.lon);
    });

    return Object.values(towerStats).map((t: any) => ({
      "CELL ID": t.id,
      "FREQUENCY": t.count,
      "AVG LATITUDE": t.lats.reduce((a: any, b: any) => a + b, 0) / t.lats.length,
      "AVG LONGITUDE": t.lons.reduce((a: any, b: any) => a + b, 0) / t.lons.length
    })).sort((a: any, b: any) => b.FREQUENCY - a.FREQUENCY);
  }, [filteredPoints]);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const handleHistoryDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteFromHistory(id);
      await loadHistory();
    } catch (err) {
      console.error("Failed to delete history item", err);
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
    
    // Small delay to allow UI to show loading state before heavy processing
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
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during processing.");
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    if (!result || result.points.length === 0) return;
    const center = result.points[0];
    const url = `https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lon}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Activity className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">GEOTEL INTEL</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Browser-Only Engine</p>
          </div>
        </div>
        
        {result && (
          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Points</p>
              <p className="text-sm font-mono">{result.summary.totalPoints}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Unique Towers</p>
              <p className="text-sm font-mono">{result.summary.uniqueTowers}</p>
            </div>
          </div>
        )}
      </header>

      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
        {!result ? (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-bold tracking-tighter sm:text-7xl">
                Trace the <span className="text-white/40 italic">Invisible.</span>
              </h2>
              <p className="text-white/60 text-lg max-w-lg mx-auto leading-relaxed">
                Upload your telecom Excel data to generate advanced geospatial intelligence. 100% private, browser-side processing.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <Card className="p-8">
              <div className="flex items-center gap-2 mb-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                <Info className="w-3 h-3" />
                <span>Map Data: OpenStreetMap (via CARTO) • Free Tier</span>
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed border-white/10 rounded-xl p-12 text-center cursor-pointer transition-all hover:border-white/20 hover:bg-white/[0.02]",
                  file && "border-white/40 bg-white/[0.05]"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".xlsx,.xls,.csv"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white/60" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">{file ? file.name : "Select Excel File"}</p>
                    <p className="text-sm text-white/40">XLSX, XLS or CSV supported</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || loading} 
                  className="w-full h-14 text-lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Analyzing...
                    </div>
                  ) : (
                    <>
                      Generate Intelligence
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {history.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                  <Clock className="w-3 h-3" />
                  <span>Recent Intelligence</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setResult(item.result)}
                      className="group bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <HistoryIcon className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/80 group-hover:text-white">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-white/30 font-mono">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </p>
                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                            <p className="text-[10px] text-white/30 font-mono">
                              {item.result.summary.totalPoints.toLocaleString()} points
                            </p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleHistoryDelete(e, item.id)}
                        className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters Section */}
            <Card className="p-4 bg-white/[0.02]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input 
                    type="text" 
                    placeholder="Search Cell ID or Coords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input 
                      type="time" 
                      value={filterStartTime}
                      onChange={(e) => setFilterStartTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <span className="text-white/20">to</span>
                  <div className="relative flex-1">
                    <input 
                      type="time" 
                      value={filterEndTime}
                      onChange={(e) => setFilterEndTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1 py-2 h-full"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterDate('');
                      setFilterStartTime('');
                      setFilterEndTime('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
              {[
                { id: 'intelligence', label: 'Intelligence', icon: TrendingUp },
                { id: 'heatmap', label: 'Heatmap', icon: MapIcon },
                { id: 'path', label: 'Path', icon: Activity },
                { id: 'cluster', label: 'Clusters', icon: Layers },
                { id: 'towers', label: 'Towers', icon: Tower },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    activeTab === tab.id 
                      ? "bg-white text-black" 
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-4">
                <div 
                  ref={mapContainerRef}
                  className={cn(
                    "relative bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all",
                    isFullScreen ? "fixed inset-0 z-[100] rounded-none border-none" : ""
                  )}
                  style={{ height: isFullScreen ? '100vh' : `${mapHeight}px` }}
                >
                  {activeTab === 'intelligence' ? (
                    <div className="p-6 h-full overflow-y-auto bg-black/40 backdrop-blur-sm">
                      <IntelligenceSummaryPanel summary={result.intelligenceSummary} />
                    </div>
                  ) : activeTab !== 'towers' ? (
                    <MapViewer type={activeTab} points={filteredPoints} />
                  ) : (
                    <TowerTable data={filteredTowerAnalysis} />
                  )}
                  
                  {/* Map Controls Overlay */}
                  <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                    <button 
                      onClick={toggleFullScreen}
                      className="p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white shadow-xl"
                      title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                      {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Resize Handle */}
                  {!isFullScreen && activeTab !== 'towers' && (
                    <div 
                      onMouseDown={startResizing}
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 transition-colors flex items-center justify-center group z-[1000]"
                    >
                      <div className="w-12 h-1 bg-white/10 rounded-full group-hover:bg-white/40 transition-colors" />
                    </div>
                  )}
                </div>
                
                {/* Mobile Stats (Visible only on mobile) */}
                <div className="lg:hidden grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-white/5 border-none">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Filtered Points</p>
                    <p className="text-lg font-mono">{filteredPoints.length.toLocaleString()}</p>
                  </Card>
                  <Card className="p-4 bg-white/5 border-none">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Filtered Towers</p>
                    <p className="text-lg font-mono">{filteredTowerAnalysis.length.toLocaleString()}</p>
                  </Card>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">Actions</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    <Button variant="primary" className="w-full justify-start py-2.5 px-4" onClick={openInGoogleMaps}>
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm">Google Maps</span>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-400 py-2.5 px-4" onClick={() => {
                      setResult(null);
                      setSearchQuery('');
                      setFilterDate('');
                      setFilterStartTime('');
                      setFilterEndTime('');
                    }}>
                      <X className="w-4 h-4" />
                      <span className="text-sm">Reset</span>
                    </Button>
                  </div>
                </Card>

                <Card className="hidden lg:block p-6 bg-white/5 border-none">
                  <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">Intelligence Stats</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-white/40">Date Range</p>
                      <p className="text-sm font-medium">{result.summary.dateRange}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Filtered Records</p>
                      <p className="text-sm font-mono">{filteredPoints.length.toLocaleString()} / {result.summary.totalPoints.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Filtered Towers</p>
                      <p className="text-sm font-mono">{filteredTowerAnalysis.length.toLocaleString()} / {result.summary.uniqueTowers.toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PWA Install Prompt */}
      <AnimatePresence>
        {!result && deferredPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <div className="bg-white text-black p-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Activity className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Install App</p>
                <p className="text-[10px] opacity-60">Optimized for AMOLED</p>
              </div>
              <Button onClick={handleInstall} className="h-10 px-4 text-xs">Install</Button>
              <button onClick={() => setDeferredPrompt(null)} className="p-2 hover:bg-black/5 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components removed (moved to separate files) ---
