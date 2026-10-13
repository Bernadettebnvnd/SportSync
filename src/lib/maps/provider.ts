/**
 * Map, Geocoding, and Place Provider Abstractions for SportSync
 * Decouples frontend components from specific vendor implementations (OpenStreetMap, Leaflet, Google Places).
 */

import { SportType, DiscoveredFacility } from '@/types';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface VenueMapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sport: string;
  sportDisplayName: string;
  pricePerHrCents?: number;
  rating?: number;
  address: string;
  image?: string;
}

export interface GeocodingResult {
  placeId: string;
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
}

export interface PlaceRatingInfo {
  rating?: number;
  reviewCount: number;
  source: 'first_party' | 'google_places' | 'none';
  isVerified: boolean;
}

export interface IGeocodingProvider {
  search(query: string): Promise<GeocodingResult[]>;
}

export interface IPlaceDataProvider {
  getPlaceRating(venueId: string, placeId?: string): Promise<PlaceRatingInfo>;
}

/**
 * OpenStreetMap Nominatim Geocoding Provider
 * Geocodes city and place queries within the Philippines.
 */
interface NominatimResponseItem {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
}

export class OsmNominatimProvider implements IGeocodingProvider {
  private endpoint = 'https://nominatim.openstreetmap.org/search';

  async search(query: string): Promise<GeocodingResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `${this.endpoint}?format=json&q=${encodeURIComponent(
        query.trim()
      )}&countrycodes=ph&limit=5`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
      });

      if (!res.ok) return [];
      const data: NominatimResponseItem[] = await res.json();

      return data.map((item: NominatimResponseItem) => ({
        placeId: String(item.place_id),
        displayName: item.display_name,
        shortName: item.display_name.split(',')[0],
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));
    } catch (err) {
      console.warn('Geocoding search failed:', err);
      return [];
    }
  }
}

/**
 * First-Party Verified Place Data Provider
 * Gracefully provides ratings without fabricating Google data.
 */
export class VerifiedPlaceDataProvider implements IPlaceDataProvider {
  async getPlaceRating(_venueId: string, _placeId?: string): Promise<PlaceRatingInfo> {
    void _venueId;
    void _placeId;
    return {
      rating: undefined,
      reviewCount: 0,
      source: 'none',
      isVerified: true,
    };
  }
}

export const defaultGeocodingProvider = new OsmNominatimProvider();
export const defaultPlaceDataProvider = new VerifiedPlaceDataProvider();

/**
 * Real-Time Sports Court Discovery via OpenStreetMap Nominatim
 * Dynamically queries OSM for sports facilities and courts in the Philippines.
 */
export async function searchDiscoveredCourts(
  sport: SportType | 'all',
  queryOrCity?: string
): Promise<DiscoveredFacility[]> {
  const sportTerm = sport === 'all' ? 'sports complex' : `${sport} court`;
  const locationTerm = queryOrCity && queryOrCity.trim().length > 1 ? queryOrCity.trim() : 'Philippines';
  const query = `${sportTerm} ${locationTerm}`;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&countrycodes=ph&limit=15`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'SportSync/1.0 (sports-facility-discovery)',
      },
    });

    if (!res.ok) return [];
    const data: Array<{
      place_id: string | number;
      display_name: string;
      lat: string;
      lon: string;
      class?: string;
      type?: string;
    }> = await res.json();

    const resolvedSport: SportType = sport === 'all' ? 'pickleball' : (sport as SportType);

    return data.map((item) => {
      const parts = item.display_name.split(',').map((p) => p.trim());
      const name = parts[0] || `${sport} Court`;
      const city = parts.length > 2 ? parts[1] : undefined;

      return {
        id: `osm-${item.place_id}`,
        name,
        sport: resolvedSport,
        address: item.display_name,
        city,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        is_platform: false,
        source: 'openstreetmap',
        category: item.type || item.class || 'pitch',
      };
    });
  } catch (err) {
    console.warn('OSM Court discovery error:', err);
    return [];
  }
}

