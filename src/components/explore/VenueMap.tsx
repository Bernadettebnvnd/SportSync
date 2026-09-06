'use client';

import React, { useEffect, useRef } from 'react';
import { Venue } from '@/types';
import { getSportEmoji } from '@/lib/utils';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';

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

    // Dynamically import Leaflet to prevent SSR window reference error
    let isMounted = true;
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default leaflet marker icon asset URLs
      // @ts-expect-error leaflet icon fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // If map already exists, just update markers
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

      // Add venue markers
      venues.forEach((venue) => {
        const primarySport = venue.featured_sports[0] || 'badminton';
        const emoji = getSportEmoji(primarySport);

        const customHtml = `
          <div style="
            background: #1F9D55;
            color: white;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(31, 157, 85, 0.4);
            border: 2px solid white;
            cursor: pointer;
            white-space: nowrap;
          ">
            <span>${emoji}</span>
            <span>${venue.name.split(' ')[0]}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-venue-pin',
          iconSize: [80, 32],
          iconAnchor: [40, 16],
        });

        const marker = L.marker([venue.latitude, venue.longitude], { icon }).addTo(map);

        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 max-w-xs';
        popupContent.innerHTML = `
          <h4 style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: #171717;">${venue.name}</h4>
          <p style="font-size: 11px; color: #6B7280; margin-bottom: 6px;">${venue.address}</p>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="color: #FF9F43; font-weight: 700; font-size: 12px;">★ ${venue.rating}</span>
            <span style="font-size: 11px; color: #1F9D55; font-weight: 600;">Open Today</span>
          </div>
          <a href="/venues/${venue.id}" style="
            display: inline-block;
            background: #1F9D55;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            text-decoration: none;
          ">Book Court / Queue &rarr;</a>
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

  // Center on selected venue
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
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-[#EBEBE6] shadow-sm bg-white">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating map hint */}
      <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#EBEBE6] shadow-sm text-xs font-semibold text-[#171717] flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-[#1F9D55]" />
        <span>{venues.length} Active Sports Hubs in Metro Manila</span>
      </div>
    </div>
  );
}
