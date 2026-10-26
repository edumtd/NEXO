import * as Location from "expo-location";
import { useCallback, useState } from "react";

import type { GeoPoint } from "@/lib/geo";

/**
 * Ubicación del estudiante, solo cuando la pide con un toque ("Cerca de mí", "Más cercanas").
 * Vive únicamente en el estado del componente que usa el hook: nunca va al store,
 * al almacenamiento del dispositivo ni a Supabase.
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<GeoPoint | null> => {
    setLocating(true);
    setError(null);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setError("Sin permiso de ubicación. Puedes seguir usando NEXO sin ella.");
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLocation(here);
      return here;
    } catch {
      setError("No pudimos obtener tu ubicación.");
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  return { location, locating, error, locate };
}
