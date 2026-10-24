import { Platform } from "react-native";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Centro por defecto del mapa (zona de los datos demo). */
export const DEFAULT_CENTER: GeoPoint = { latitude: 19.4318, longitude: -99.1395 };

/** Distancia en línea recta (fórmula de Haversine), en km. NEXO no calcula rutas. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1)} km`;
}

/** Enlace externo para "Cómo llegar": Apple Maps en iOS y Google Maps en Android y web. */
export function directionsUrl(point: GeoPoint): string {
  const dest = `${point.latitude},${point.longitude}`;
  return Platform.OS === "ios"
    ? `https://maps.apple.com/?daddr=${dest}`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

export function hasLocation<T extends { latitude?: number; longitude?: number }>(
  x: T
): x is T & GeoPoint {
  return typeof x.latitude === "number" && typeof x.longitude === "number";
}
