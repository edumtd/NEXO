import { AdvancedMarker, APIProvider, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { MapPinOff } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";

import type { BusinessMapProps } from "@/components/BusinessMap.types";
import type { GeoPoint } from "@/lib/geo";
import { colors } from "@/theme/colors";

export type { BusinessMapProps, MapMarker } from "@/components/BusinessMap.types";

const WEB_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY;
// DEMO_MAP_ID es el Map ID de pruebas que documenta Google; en producción usa uno propio.
const MAP_ID = process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/** true si hay clave web; sin ella se muestra un aviso y la lista sigue funcionando. */
export const isWebMapAvailable = Boolean(WEB_KEY);

function Recenter({ center }: { center: GeoPoint }) {
  const map = useMap();
  useEffect(() => {
    map?.panTo({ lat: center.latitude, lng: center.longitude });
  }, [map, center.latitude, center.longitude]);
  return null;
}

/** Mapa web con Google Maps JavaScript API (@vis.gl/react-google-maps). */
export function BusinessMap({
  markers,
  selectedId,
  onMarkerPress,
  center,
  userLocation,
  onMapPress,
  height = 360,
}: BusinessMapProps) {
  if (!WEB_KEY) {
    return (
      <View
        style={{ height }}
        className="items-center justify-center rounded-3xl border-2 border-dashed border-navy-100 bg-white px-6"
      >
        <MapPinOff size={30} color={colors.soft} />
        <Text className="mt-2 text-center text-base font-bold text-navy">Mapa no disponible</Text>
        <Text className="mt-1 text-center text-sm text-ink-muted">
          Falta configurar la clave de Google Maps para la web. La lista de abajo sigue funcionando.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height, borderRadius: 24, overflow: "hidden" }}>
      <APIProvider apiKey={WEB_KEY}>
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultCenter={{ lat: center.latitude, lng: center.longitude }}
          defaultZoom={14}
          mapId={MAP_ID}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          onClick={onMapPress ? (e) => e.detail.latLng && onMapPress({ latitude: e.detail.latLng.lat, longitude: e.detail.latLng.lng }) : undefined}
        >
          <Recenter center={center} />
          {markers.map((m) => {
            const selected = m.id === selectedId;
            return (
              <AdvancedMarker
                key={m.id}
                position={{ lat: m.latitude, lng: m.longitude }}
                title={m.title}
                onClick={() => onMarkerPress?.(m.id)}
                zIndex={selected ? 10 : 1}
              >
                <Pin
                  background={m.color}
                  borderColor={selected ? colors.navy : colors.white}
                  glyphColor={colors.white}
                  scale={selected ? 1.3 : 1}
                />
              </AdvancedMarker>
            );
          })}
          {userLocation && (
            <AdvancedMarker position={{ lat: userLocation.latitude, lng: userLocation.longitude }} title="Tu ubicación">
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: "#2563EB",
                  borderWidth: 3,
                  borderColor: colors.white,
                }}
              />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </View>
  );
}
