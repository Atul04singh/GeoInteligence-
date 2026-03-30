import React, { useRef, useEffect } from 'react';
import { Point } from '../types';

export const MapViewer = ({ type, points }: { type: string; points: Point[] }) => {
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
          radius: 12,
          fillColor: '#ff4444',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
          className: 'clickable-marker',
          title: `Cell ID: ${p.cellId} | ${p.date} ${p.time}`, // Native tooltip on hover
          pane: 'markerPane', // Ensure markers are on top of paths/heatmaps
          bubblingMouseEvents: false // Prevent events from propagating to the map
        }).addTo(leafletMap.current);
        
        // Add hover effect
        marker.on('mouseover', function(this: any) {
          this.setStyle({
            radius: 15,
            fillOpacity: 1,
            weight: 4
          });
        });
        
        marker.on('mouseout', function(this: any) {
          this.setStyle({
            radius: 12,
            fillOpacity: 0.9,
            weight: 3
          });
        });
        
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
              <p class="text-[10px] text-white/40 uppercase font-bold tracking-wider">Metadata</p>
              <p class="text-xs flex justify-between"><span>ID:</span> <span class="text-white font-mono">${p.cellId}</span></p>
              <p class="text-xs flex justify-between"><span>Date:</span> <span class="text-white font-mono">${p.date}</span></p>
              <p class="text-xs flex justify-between"><span>Time:</span> <span class="text-white font-mono">${p.time}</span></p>
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
    };

    if (type === 'heatmap' && L.heatLayer) {
      const heatData = points.map(p => [p.lat, p.lon, 0.5]);
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

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [type, points]);

  return <div ref={mapRef} className="w-full h-full" />;
};
