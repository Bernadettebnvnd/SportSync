import { NextRequest, NextResponse } from 'next/server';

// Naga City, Camarines Sur pilot bounding box: [minLat, minLng, maxLat, maxLng]
const NAGA_MIN_LAT = 13.575;
const NAGA_MAX_LAT = 13.685;
const NAGA_MIN_LNG = 123.14;
const NAGA_MAX_LNG = 123.27;

// Nominatim viewbox format: left(minLng),top(maxLat),right(maxLng),bottom(minLat)
const NAGA_VIEWBOX = `${NAGA_MIN_LNG},${NAGA_MAX_LAT},${NAGA_MAX_LNG},${NAGA_MIN_LAT}`;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 250;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const reverseCache = new Map<string, CacheEntry<string>>();
const searchCache = new Map<string, CacheEntry<Array<{
  placeId: string;
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
}>>>();

function pruneCache<T>(cache: Map<string, CacheEntry<T>>) {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (v.expiresAt <= now) cache.delete(k);
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get('mode') || 'reverse').toLowerCase();

  if (mode === 'reverse') {
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Valid lat and lng are required.' }, { status: 400 });
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = reverseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ name: cached.value, cached: true });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5800);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        String(lat)
      )}&lon=${encodeURIComponent(String(lng))}&format=json&zoom=18&addressdetails=1`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'SportSync-Naga/1.0 (https://sportsync.ph)',
        },
        cache: 'no-store',
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json(
          { name: `Pinned Court (${lat.toFixed(4)}, ${lng.toFixed(4)}), Naga City`, fallback: true },
          { status: 200 }
        );
      }

      const data = await res.json();
      const addr = data?.address || {};
      const amenity = addr.amenity || addr.leisure || addr.building || addr.stadium || addr.sports_centre;
      const road = addr.road || addr.pedestrian || addr.street;
      const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.village;
      const city = addr.city || addr.town || 'Naga City';

      let name = '';
      if (amenity && suburb) name = `${amenity}, ${suburb}, ${city}`;
      else if (amenity) name = `${amenity}, ${city}`;
      else if (road && suburb) name = `${road}, ${suburb}, ${city}`;
      else if (road) name = `${road}, ${city}`;
      else if (suburb) name = `${suburb}, ${city}`;
      else if (typeof data?.display_name === 'string' && data.display_name.trim()) {
        name = data.display_name
          .split(',')
          .slice(0, 3)
          .map((s: string) => s.trim())
          .join(', ');
      } else {
        name = `Pinned Court (${lat.toFixed(4)}, ${lng.toFixed(4)}), Naga City`;
      }

      reverseCache.set(cacheKey, { value: name, expiresAt: Date.now() + CACHE_TTL_MS });
      pruneCache(reverseCache);

      return NextResponse.json({ name, cached: false });
    } catch {
      clearTimeout(timeout);
      return NextResponse.json(
        { name: `Pinned Court (${lat.toFixed(4)}, ${lng.toFixed(4)}), Naga City`, fallback: true },
        { status: 200 }
      );
    }
  }

  if (mode === 'search') {
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const cacheKey = q.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ results: cached.value, cached: true });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5800);
    try {
      const searchQuery = q.toLowerCase().includes('naga') ? q : `${q}, Naga City`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&countrycodes=ph&viewbox=${encodeURIComponent(NAGA_VIEWBOX)}&bounded=1&limit=6`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'SportSync-Naga/1.0 (https://sportsync.ph)',
        },
        cache: 'no-store',
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json({ results: [] });
      }

      const data = await res.json();
      const results = Array.isArray(data)
        ? data
            .map((item: { place_id: string | number; display_name: string; lat: string; lon: string }) => ({
              placeId: String(item.place_id),
              displayName: item.display_name,
              shortName: item.display_name.split(',')[0].trim(),
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
            }))
            .filter(
              (r) =>
                Number.isFinite(r.latitude) &&
                Number.isFinite(r.longitude) &&
                r.latitude >= NAGA_MIN_LAT &&
                r.latitude <= NAGA_MAX_LAT &&
                r.longitude >= NAGA_MIN_LNG &&
                r.longitude <= NAGA_MAX_LNG
            )
        : [];

      searchCache.set(cacheKey, { value: results, expiresAt: Date.now() + CACHE_TTL_MS });
      pruneCache(searchCache);

      return NextResponse.json({ results, cached: false });
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({ results: [] });
    }
  }

  return NextResponse.json({ error: 'Unsupported geocode mode.' }, { status: 400 });
}
