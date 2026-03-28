import React, { useState, useRef, useEffect } from 'react';
import { Upload, Map as MapIcon, Activity, Layers, Radio as Tower, Download, X, ChevronRight, ExternalLink, AlertCircle, Info, History as HistoryIcon, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

// --- DB Utils (IndexedDB for persistent history) ---
const DB_NAME = 'GeoTelHistory';
const STORE_NAME = 'results';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToHistory = async (item: HistoryItem) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const getHistory = async (): Promise<HistoryItem[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
    request.onerror = () => reject(request.error);
  });
};

const deleteFromHistory = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Point {
  lat: number;
  lon: number;
  date: string;
  time: string;
  cellId: string;
  timestamp: number;
}

interface TowerStat {
  "CELL ID": string;
  "FREQUENCY": number;
  "AVG LATITUDE": number;
  "AVG LONGITUDE": number;
}

interface AnalysisResult {
  points: Point[];
  towerAnalysis: TowerStat[];
  summary: {
    totalPoints: number;
    uniqueTowers: number;
    dateRange: string;
  };
}

interface HistoryItem {
  id: string;
  name: string;
  timestamp: number;
  result: AnalysisResult;
}

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl", className)}>
    {children}
  </div>
);

const Button = ({ children, onClick, disabled, variant = 'primary', className }: any) => {
  const variants = {
    primary: "bg-white text-black hover:bg-gray-200",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10",
    outline: "border border-white/20 text-white hover:bg-white/5",
    ghost: "text-white/60 hover:text-white hover:bg-white/5"
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant as keyof typeof variants],
        className
      )}
    >
      {children}
    </button>
  );
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'path' | 'cluster' | 'towers'>('heatmap');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

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
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) throw new Error("The selected Excel file appears to be empty.");

          // Auto-detect columns
          const keys = Object.keys(jsonData[0]);
          const latKey = keys.find(k => k.toUpperCase().includes("LAT"));
          const lonKey = keys.find(k => k.toUpperCase().includes("LON"));
          
          if (!latKey || !lonKey) {
            throw new Error("Could not find Latitude or Longitude columns. Please ensure your Excel file has columns named 'LAT' and 'LON'.");
          }

          const dateKey = keys.find(k => k.toUpperCase().includes("DATE")) || "DATE";
          const timeKey = keys.find(k => k.toUpperCase().includes("TIME")) || "TIME";
          const cellKey = keys.find(k => k.toUpperCase().includes("CELL") || k.toUpperCase().includes("TOWER")) || "CELL ID";

          // Process points
          const points = jsonData.map(row => {
            const lat = parseFloat(row[latKey]);
            const lon = parseFloat(row[lonKey]);
            const dateStr = String(row[dateKey] || "");
            const timeStr = String(row[timeKey] || "");
            
            return {
              lat,
              lon,
              date: dateStr,
              time: timeStr,
              cellId: String(row[cellKey] || "N/A"),
              timestamp: new Date(`${dateStr} ${timeStr}`).getTime()
            };
          }).filter(p => !isNaN(p.lat) && !isNaN(p.lon)).sort((a, b) => a.timestamp - b.timestamp);

          if (points.length === 0) {
            throw new Error("No valid coordinates found in the file. Please check the data format.");
          }

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
            }
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
            {/* Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
              {[
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
              <div className="lg:col-span-3">
                <Card className="aspect-video relative bg-black">
                  {activeTab !== 'towers' ? (
                    <MapViewer type={activeTab} points={result.points} />
                  ) : (
                    <TowerTable data={result.towerAnalysis} />
                  )}
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">Actions</h3>
                  <div className="space-y-2">
                    <Button variant="primary" className="w-full justify-start" onClick={openInGoogleMaps}>
                      <ExternalLink className="w-4 h-4" />
                      View in Google Maps
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-400" onClick={() => setResult(null)}>
                      <X className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 bg-white/5 border-none">
                  <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">Stats</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-white/40">Date Range</p>
                      <p className="text-sm font-medium">{result.summary.dateRange}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Total Records</p>
                      <p className="text-sm font-mono">{result.summary.totalPoints.toLocaleString()}</p>
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

// --- Sub-components ---

const MapViewer = ({ type, points }: { type: string; points: Point[] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current || !(window as any).L) return;

    const L = (window as any).L;
    const center = [points[0].lat, points[0].lon];
    leafletMap.current = L.map(mapRef.current, { 
      zoomControl: false,
      preferCanvas: true 
    }).setView(center, 13);
    
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current) return;
    const L = (window as any).L;

    // Clear existing layers
    layersRef.current.forEach(layer => leafletMap.current.removeLayer(layer));
    layersRef.current = [];

    const addMarkers = () => {
      // Limit markers in heatmap mode or if there are too many points to prevent lag/crashes
      const maxMarkers = type === 'heatmap' ? 100 : 1000;
      const displayPoints = points.length > maxMarkers ? points.slice(0, maxMarkers) : points;

      displayPoints.forEach(p => {
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 4,
          fillColor: '#ff4444',
          color: '#000',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6
        }).addTo(leafletMap.current);
        
        const popupContent = `
          <div class="p-2 space-y-3 min-w-[200px] bg-[#121212] text-white rounded-xl">
            <div class="flex justify-between items-start">
              <p class="text-[10px] font-bold tracking-widest text-white/40 uppercase">Coordinate Details</p>
            </div>
            <div class="space-y-1">
              <p class="text-xs text-white/60">Lat: <span class="text-white font-mono">${p.lat.toFixed(6)}</span></p>
              <p class="text-xs text-white/60">Lon: <span class="text-white font-mono">${p.lon.toFixed(6)}</span></p>
            </div>
            <div class="space-y-1">
              <p class="text-[10px] text-white/40 uppercase">Metadata</p>
              <p class="text-xs">ID: ${p.cellId}</p>
              <p class="text-xs">Time: ${p.date} ${p.time}</p>
            </div>
            <div class="pt-2 flex flex-col gap-2">
              <button onclick="window.copyToClipboard('${p.lat}, ${p.lon}')" class="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold transition-all">COPY COORDS</button>
              <a href="https://www.google.com/maps?q=${p.lat},${p.lon}" target="_blank" class="w-full py-2 bg-white text-black rounded-lg text-[10px] font-bold text-center transition-all">GOOGLE MAPS</a>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent, { 
          className: 'custom-popup',
          maxWidth: 300
        });
        layersRef.current.push(marker);
      });
    };

    // Global helper for popup buttons
    (window as any).copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      // We could add a toast here
    };

    if (type === 'heatmap' && L.heatLayer) {
      const heatData = points.map(p => [p.lat, p.lon, 0.5]);
      // Use a small timeout to ensure the map is ready and avoid blocking the main thread
      const heatTimeout = setTimeout(() => {
        if (!leafletMap.current) return;
        try {
          const heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
          }).addTo(leafletMap.current);
          layersRef.current.push(heatLayer);
          addMarkers();
        } catch (e) {
          console.error("Heatmap failed", e);
          addMarkers();
        }
      }, 0);
      return () => clearTimeout(heatTimeout);
    } else if (type === 'heatmap' && !L.heatLayer) {
      // Fallback to markers if heat layer is not available
      addMarkers();
    } else if (type === 'path') {
      const latlngs = points.map(p => [p.lat, p.lon]);
      const polyline = L.polyline(latlngs, {
        color: 'white',
        weight: 2,
        opacity: 0.5,
        dashArray: '5, 10'
      }).addTo(leafletMap.current);
      layersRef.current.push(polyline);
      addMarkers();
    } else if (type === 'cluster') {
      points.forEach(p => {
        const circle = L.circle([p.lat, p.lon], {
          color: 'white',
          fillColor: 'white',
          fillOpacity: 0.1,
          radius: 100,
          weight: 1
        }).addTo(leafletMap.current);
        layersRef.current.push(circle);
      });
      addMarkers();
    }

    // Adjust bounds
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [type, points]);

  return <div ref={mapRef} className="w-full h-full" />;
};

const TowerTable = ({ data }: { data: TowerStat[] }) => (
  <div className="h-full overflow-y-auto p-6 no-scrollbar">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="text-[10px] text-white/40 uppercase tracking-widest font-bold border-b border-white/10">
          <th className="pb-4">Cell ID</th>
          <th className="pb-4">Frequency</th>
          <th className="pb-4">Avg Location</th>
          <th className="pb-4">GMap</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {data.map((tower, idx) => (
          <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
            <td className="py-4 font-mono text-sm">{tower["CELL ID"]}</td>
            <td className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[100px]">
                  <div 
                    className="h-full bg-white transition-all duration-1000" 
                    style={{ width: `${(tower.FREQUENCY / data[0].FREQUENCY) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono">{tower.FREQUENCY}</span>
              </div>
            </td>
            <td className="py-4 text-xs text-white/40 font-mono">
              {tower["AVG LATITUDE"].toFixed(4)}, {tower["AVG LONGITUDE"].toFixed(4)}
            </td>
            <td className="py-4">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${tower["AVG LATITUDE"]},${tower["AVG LONGITUDE"]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors inline-block"
              >
                <ExternalLink className="w-4 h-4 text-white/60 hover:text-white" />
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
