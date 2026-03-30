export interface Point {
  lat: number;
  lon: number;
  date: string;
  time: string;
  cellId: string;
  timestamp: number;
  aParty?: string;
  bParty?: string;
  duration?: number;
  callType?: string;
  imei?: string;
  imsi?: string;
  address?: string;
  roaming?: string;
}

export interface TowerStat {
  "CELL ID": string;
  "FREQUENCY": number;
  "AVG LATITUDE": number;
  "AVG LONGITUDE": number;
}

export interface IntelligenceSummary {
  contactStats: { 
    number: string; 
    count: number; 
    totalDuration: number; 
    lastDate: string; 
    lastTime: string;
    callTypes: string[];
  }[];
  topLocation: { lat: number; lon: number; count: number } | null;
  longestCall: { duration: number; number: string } | null;
  device: { imei: string; imsi: string } | null;
  activity: { topDay: string; peakHour: string } | null;
  callTypeStats: Record<string, number>;
  isRoaming: boolean;
  topAddress: string | null;
}

export interface AnalysisResult {
  points: Point[];
  towerAnalysis: TowerStat[];
  summary: {
    totalPoints: number;
    uniqueTowers: number;
    dateRange: string;
  };
  intelligenceSummary: IntelligenceSummary;
}

export interface HistoryItem {
  id: string;
  name: string;
  timestamp: number;
  result: AnalysisResult;
}
