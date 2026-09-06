'use client';

import React, { useEffect, useRef } from 'react';
import { Venue } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface VenueMapProps {
  venues: Venue[];
  selectedVenueId?: string;
  onSelectVenue?: (venue: Venue) => void;
}

export function VenueMap({ venues, selectedVenueId, onSelectVenue }: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<{ [key: string]: unknown }>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // @ts-expect-error leaflet icon fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const centerLat = venues.length > 0 ? venues[0].latitude : 14.5828;
        const centerLng = venues.length > 0 ? venues[0].longitude : 121.0664;

        const map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 12,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current as L.Map;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker) => {
        (marker as L.Marker).remove();
      });
      markersRef.current = {};

      venues.forEach((venue) => {
        const primarySport = venue.featured_sports[0] || 'badminton';
        const sportLabel = getSportDisplayName(primarySport);

        // Clean modern pin without emojis
        const customHtml = `
          <div style="
            background: #2D724E;
            color: white;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 14px rgba(30, 74, 50, 0.4);
            border: 2px solid #FAF8F5;
            cursor: pointer;
            white-space: nowrap;
          ">
            <span style="color: #E9C46A;">&bull;</span>
            <span>${venue.name.split(' ')[0]}</span>
            <span style="opacity: 0.75; font-size: 9px; font-weight: 600;">(${sportLabel})</span>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-venue-pin',
          iconSize: [96, 30],
          iconAnchor: [48, 15],
        });

        const marker = L.marker([venue.latitude, venue.longitude], { icon }).addTo(map);

        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 max-w-xs';
        popupContent.innerHTML = `
          <h4 style="font-weight: 800; font-size: 13px; margin-bottom: 2px; color: #1A241E;">${venue.name}</h4>
          <p style="font-size: 11px; color: #65756B; margin-bottom: 6px;">${venue.address}</p>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="color: #C87D43; font-weight: 800; font-size: 12px;">★ ${venue.rating}</span>
            <span style="font-size: 10px; color: #2D724E; font-weight: 700; background: #EBF4EE; padding: 2px 6px; border-radius: 6px;">Doubles & Singles</span>
          </div>
          <a href="/venues/${venue.id}" style="
            display: block;
            background: #2D724E;
            color: white;
            padding: 7px 12px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
            text-decoration: none;
          ">Book & Join Queue &rarr;</a>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onSelectVenue) onSelectVenue(venue);
        });

        markersRef.current[venue.id] = marker;
      });
    });

    return () => {
      isMounted = false;
    };
  }, [venues, onSelectVenue]);

  useEffect(() => {
    if (selectedVenueId && mapInstanceRef.current && markersRef.current[selectedVenueId]) {
      const venue = venues.find((v) => v.id === selectedVenueId);
      if (venue) {
        // @ts-expect-error leaflet map instance
        mapInstanceRef.current.flyTo([venue.latitude, venue.longitude], 14, { duration: 1.2 });
        // @ts-expect-error leaflet marker instance
        markersRef.current[selectedVenueId].openPopup();
      }
    }
  }, [selectedVenueId, venues]);

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] rounded-3xl overflow-hidden border border-[#E8E5DF] shadow-sm bg-white">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E8E5DF] shadow-sm text-xs font-bold text-[#1A241E] flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-[#2D724E]" />
        <span>{venues.length} Sports Hubs in Metro Manila</span>
      </div>
    </div>
  );
}
