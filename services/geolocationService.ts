import { Geolocation } from '@capacitor/geolocation';
import { platformService } from './platformService';
import { appBackend } from './appBackend';

export interface NearbyStudio {
  id: string;
  fantasyName: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  distance: number;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const geolocationService = {
  async requestPermission(): Promise<boolean> {
    try {
      const status = await Geolocation.requestPermissions();
      return status.location === 'granted';
    } catch {
      return false;
    }
  },

  async getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  },

  async getNearbyStudios(maxDistanceKm: number = 50): Promise<NearbyStudio[]> {
    const position = await this.getCurrentPosition();
    if (!position) return [];

    try {
      const { data: studios } = await appBackend.client
        .from('crm_partner_studios')
        .select('id, fantasy_name, address, city, state, phone, email, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!studios) return [];

      return studios
        .map((s: any) => ({
          id: s.id,
          fantasyName: s.fantasy_name,
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          phone: s.phone || '',
          email: s.email || '',
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          distance: haversineDistance(position.lat, position.lng, Number(s.latitude), Number(s.longitude)),
        }))
        .filter((s: NearbyStudio) => s.distance <= maxDistanceKm)
        .sort((a: NearbyStudio, b: NearbyStudio) => a.distance - b.distance);
    } catch {
      return [];
    }
  },
};
