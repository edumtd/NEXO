import { useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import type { BusinessMapProps } from "@/components/BusinessMap.types";
import { colors } from "@/theme/colors";

export type { BusinessMapProps, MapMarker } from "@/components/BusinessMap.types";

const DELTA = { latitudeDelta: 0.03, longitudeDelta: 0.03 };

/** Mapa nativo: Google Maps en Android y Apple Maps en iOS (react-native-maps). */
export function BusinessMap({
  markers,
  selectedId,
  onMarkerPress,
  center,
  userLocation,
  onMapPress,
  height = 360,
}: BusinessMapProps) {
  const ref = useRef<MapView>(null);

  useEffect(() => {
    ref.current?.animateToRegion({ ...center, ...DELTA }, 400);
  }, [center.latitude, center.longitude]);

  return (
    <View style={{ height, borderRadius: 24, overflow: "hidden" }}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        initialRegion={{ ...center, ...DELTA }}
        onPress={onMapPress ? (e) => onMapPress(e.nativeEvent.coordinate) : undefined}
        showsUserLocation={!!userLocation}
        accessibilityLabel="Mapa de negocios"
      >
        {markers.map((m) => {
          const selected = m.id === selectedId;
          const size = selected ? 26 : 20;
          return (
            <Marker
              key={m.id}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.title}
              onPress={() => onMarkerPress?.(m.id)}
              tracksViewChanges={false}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: m.color,
                  borderWidth: 3,
                  borderColor: selected ? colors.navy : colors.white,
                }}
              />
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}
