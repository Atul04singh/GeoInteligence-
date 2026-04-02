import React from 'react';
import { 
  Upload, 
  ChevronRight, 
  AlertCircle, 
  Info, 
  FileText, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Layers 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface UploadViewProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  file: File | null;
  loading: boolean;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const UploadView = ({ 
  onFileChange, 
  onUpload, 
  file, 
  loading, 
  error, 
  fileInputRef 
}: UploadViewProps) => {
  const features = [
    { icon: ShieldCheck, label: '100% Private', desc: 'Browser-side processing' },
    { icon: Zap, label: 'Instant Intel', desc: 'Real-time data parsing' },
    { icon: Layers, label: 'Multi-Layer', desc: 'Heatmaps & path analysis' },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-24 sm:pb-8">
      <div className="max-w-3xl w-full space-y-6 sm:space-y-8 lg:space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6">
          <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 rounded-full border border-white/10 mb-1 sm:mb-2 lg:mb-4">
            <Activity size={12} className="sm:w-[14px] sm:h-[14px] text-white/60" />
            <p className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest font-bold">Next-Gen Telecom Intelligence</p>
          </div>
          <h2 className="text-3xl sm:text-6xl lg:text-8xl font-bold tracking-tighter leading-tight">
            Trace the <span className="text-white/40 italic">Invisible.</span>
          </h2>
          <p className="text-white/60 text-xs sm:text-sm lg:text-lg max-w-xl mx-auto leading-relaxed px-4">
            Upload your telecom Excel data to generate advanced geospatial intelligence. 
            No data ever leaves your browser.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {features.map((f, idx) => (
            <div key={idx} className="flex flex-row xs:flex-col items-center text-left xs:text-center gap-3 sm:gap-2 lg:gap-3 p-3 sm:p-4 lg:p-6 bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl">
              <div className="p-2 lg:p-3 bg-white/5 rounded-lg sm:rounded-xl text-white/60 shrink-0">
                <f.icon size={16} className="sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-white uppercase tracking-widest">{f.label}</p>
                <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-white/30 mt-0.5 sm:mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Card */}
        <Card className="p-4 sm:p-6 lg:p-8 bg-white/[0.03] border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 sm:p-8 lg:p-12 opacity-5 group-hover:opacity-10 transition-opacity">
            <Upload size={80} className="sm:w-[120px] sm:h-[120px] lg:w-40 lg:h-40" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 lg:p-4 flex items-center gap-3 mb-4 lg:mb-6 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-500 w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
              <p className="text-[11px] sm:text-xs lg:text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10">
            <div className="flex items-center gap-2 text-[8px] sm:text-[9px] lg:text-[10px] text-white/40 uppercase tracking-widest font-bold">
              <Info className="w-3 h-3" />
              <span>Supported formats: .xlsx, .xls, .csv</span>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-16 text-center cursor-pointer transition-all hover:border-white/20 hover:bg-white/[0.02]",
                file && "border-white/40 bg-white/[0.05]"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileChange} 
                className="hidden" 
                accept=".xlsx,.xls,.csv"
              />
              <div className="flex flex-col items-center gap-3 sm:gap-4 lg:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-white/5 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white/60" />
                </div>
                <div>
                  <p className="text-base sm:text-lg lg:text-xl font-medium text-white px-2 truncate max-w-[250px] sm:max-w-none">{file ? file.name : "Select Target Data"}</p>
                  <p className="text-[10px] sm:text-xs lg:text-sm text-white/40 mt-1">Click or drag and drop to begin analysis</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={onUpload} 
              disabled={!file || loading} 
              className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold tracking-tight rounded-xl sm:rounded-2xl"
            >
              {loading ? (
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Processing Intelligence...
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  Generate Intelligence
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              )}
            </Button>
          </div>
        </Card>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold flex items-center justify-center gap-3">
            <ShieldCheck size={12} />
            Secure Browser-Side Engine • No Server Uploads
          </p>
        </div>
      </div>
    </div>
  );
};
