import React, { useRef, useEffect } from 'react';
import { Point } from '../types';
import { formatDate } from '../lib/utils';

interface MapViewerProps {
  type: string;
  points: Point[];
  selectedPoint?: Point | null;
  mapStyle?: 'default' | 'satellite';
}

export const MapViewer = ({ 
  type, 
  points, 
  selectedPoint,
  mapStyle = 'default',
}: MapViewerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current || !(window as any).L) return;

    const L = (window as any).L;
    const center = points.length > 0 ? [points[0].lat, points[0].lon] : [0, 0];
    leafletMap.current = L.map(mapRef.current, { 
      zoomControl: false
    }).setView(center, 13);
    
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

    // Initial tile layer
    const tileUrl = mapStyle === 'satellite' 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    
    const attribution = mapStyle === 'satellite'
      ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution,
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(leafletMap.current);

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update tile layer when mapStyle changes
  useEffect(() => {
    if (!leafletMap.current || !tileLayerRef.current) return;
    const L = (window as any).L;

    const tileUrl = mapStyle === 'satellite' 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    
    const attribution = mapStyle === 'satellite'
      ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    tileLayerRef.current.setUrl(tileUrl);
    leafletMap.current.attributionControl.removeAttribution(tileLayerRef.current.options.attribution);
    tileLayerRef.current.options.attribution = attribution;
    leafletMap.current.attributionControl.addAttribution(attribution);
  }, [mapStyle]);

  // Zoom to selected point
  useEffect(() => {
    if (leafletMap.current && selectedPoint) {
      leafletMap.current.setView([selectedPoint.lat, selectedPoint.lon], 16, {
        animate: true,
        duration: 1
      });
    }
  }, [selectedPoint]);

  useEffect(() => {
    if (!leafletMap.current) return;
    const L = (window as any).L;

    // Clear existing layers
    layersRef.current.forEach(layer => leafletMap.current.removeLayer(layer));
    layersRef.current = [];

    const addMarkers = () => {
      // Group points by coordinate to handle large datasets (5k+) efficiently
      const coordGroups = new Map<string, { points: Point[], count: number }>();
      
      points.forEach(p => {
        const key = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
        if (!coordGroups.has(key)) {
          coordGroups.set(key, { points: [], count: 0 });
        }
        const group = coordGroups.get(key)!;
        group.points.push(p);
        group.count++;
      });

      const maxCount = Math.max(...Array.from(coordGroups.values()).map(g => g.count));

      coordGroups.forEach((group, key) => {
        const [lat, lon] = key.split(',').map(Number);
        const p = group.points[0];
        const intensity = group.count / maxCount;
        
        // Dynamic ring color based on activity
        // Low: White, Medium: Orange, High: Red
        const ringColor = intensity > 0.8 ? '#ff0000' : intensity > 0.3 ? '#ffaa00' : '#ffffff';
        const ringWeight = 2 + (intensity * 4); // Thicker ring for high activity
        
        const marker = L.circleMarker([lat, lon], {
          radius: 10 + (intensity * 5),
          fillColor: '#ff4444',
          color: ringColor,
          weight: ringWeight,
          opacity: 1,
          fillOpacity: 0.9,
          className: 'activity-marker',
          pane: 'markerPane',
          bubblingMouseEvents: false
        }).addTo(leafletMap.current);
        
        // Add hover effect
        marker.on('mouseover', function(this: any) {
          this.setStyle({
            radius: 18,
            fillOpacity: 1,
            weight: ringWeight + 2
          });
        });
        
        marker.on('mouseout', function(this: any) {
          this.setStyle({
            radius: 10 + (intensity * 5),
            fillOpacity: 0.9,
            weight: ringWeight
          });
        });
        
        const popupContent = `
          <div class="p-2 space-y-3 min-w-[220px] bg-[#121212] text-white rounded-xl">
            <div class="flex justify-between items-center">
              <p class="text-[10px] font-bold tracking-widest text-white/40 uppercase">Location Intel</p>
              <span class="px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold text-white/60">${group.count} HITS</span>
            </div>
            <div class="space-y-1">
              <p class="text-xs text-white/60">Lat: <span class="text-white font-mono">${lat.toFixed(6)}</span></p>
              <p class="text-xs text-white/60">Lon: <span class="text-white font-mono">${lon.toFixed(6)}</span></p>
            </div>
            <div class="space-y-1">
              <p class="text-[10px] text-white/40 uppercase font-bold tracking-wider">Latest Activity</p>
              <p class="text-xs flex justify-between"><span>ID:</span> <span class="text-white font-mono">${p.cellId}</span></p>
              <p class="text-xs flex justify-between"><span>Date:</span> <span class="text-white font-mono">${formatDate(p.date)}</span></p>
              <p class="text-xs flex justify-between"><span>Time:</span> <span class="text-white font-mono">${p.time}</span></p>
            </div>
            <div class="pt-2 flex flex-col gap-2">
              <button onclick="window.copyToClipboard('${lat}, ${lon}')" class="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold transition-all">COPY COORDS</button>
              <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" class="w-full py-2 bg-white text-black rounded-lg text-[10px] font-bold text-center transition-all">GOOGLE MAPS</a>
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
    };

    if (type === 'heatmap') {
      // Alternative to canvas-based heatmap: Density Circles
      const densityMap = new Map<string, number>();
      points.forEach(p => {
        const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
        densityMap.set(key, (densityMap.get(key) || 0) + 1);
      });

      const maxDensity = Math.max(...Array.from(densityMap.values()));

      densityMap.forEach((count, key) => {
        const [lat, lon] = key.split(',').map(Number);
        const intensity = count / maxDensity;
        
        const circle = L.circle([lat, lon], {
          radius: 200 + (intensity * 300),
          fillColor: intensity > 0.7 ? '#ff4444' : intensity > 0.4 ? '#ffaa00' : '#4444ff',
          color: 'transparent',
          fillOpacity: 0.2 + (intensity * 0.3),
          interactive: false
        }).addTo(leafletMap.current);
        layersRef.current.push(circle);
      });
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

      // Add numbering and arrows
      points.forEach((p, idx) => {
        if (idx < points.length - 1) {
          const nextP = points[idx + 1];
          const midLat = (p.lat + nextP.lat) / 2;
          const midLon = (p.lon + nextP.lon) / 2;
          
          // Calculate angle for the arrow
          const angle = Math.atan2(nextP.lat - p.lat, nextP.lon - p.lon) * (180 / Math.PI);
          
          const arrowIcon = L.divIcon({
            className: 'custom-arrow-icon',
            html: `
              <div style="transform: rotate(${angle}deg); color: white; font-size: 14px; font-weight: bold; text-shadow: 0 0 4px black;">
                ➤
              </div>
              <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); color: #ffaa00; font-size: 10px; font-weight: bold; background: black; padding: 1px 4px; border-radius: 4px;">
                ${idx + 1}
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          const arrowMarker = L.marker([midLat, midLon], { icon: arrowIcon, interactive: false }).addTo(leafletMap.current);
          layersRef.current.push(arrowMarker);
        }
      });

      addMarkers();
    } else if (type === 'cluster') {
      points.forEach(p => {
        const circle = L.circle([p.lat, p.lon], {
          color: 'white',
          fillColor: 'transparent',
          fillOpacity: 0,
          radius: 60,
          weight: 1.5
        }).addTo(leafletMap.current);
        layersRef.current.push(circle);
      });
      addMarkers();
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [type, points]);

  return <div ref={mapRef} className="w-full h-full" />;
};
