import type { GeoPoint } from "@/lib/geo";

export interface MapMarker extends GeoPoint {
  id: string;
  title: string;
  /** Color del marcador (hex). */
  color: string;
}

/** Interfaz común de BusinessMap.native.tsx y BusinessMap.web.tsx. */
export interface BusinessMapProps {
  markers: MapMarker[];
  selectedId?: string | null;
  onMarkerPress?: (id: string) => void;
  /** Centro deseado; cuando cambia, el mapa se desplaza. */
  center: GeoPoint;
  /** Ubicación del estudiante (solo en memoria, nunca se guarda). */
  userLocation?: GeoPoint | null;
  /** Toque en el mapa (para colocar un pin). */
  onMapPress?: (point: GeoPoint) => void;
  height?: number;
}
