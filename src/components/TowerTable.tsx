import React from 'react';
import { ExternalLink } from 'lucide-react';
import { TowerStat } from '../types';

export const TowerTable = ({ data }: { data: TowerStat[] }) => (
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
