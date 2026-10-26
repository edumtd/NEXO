import { router } from "expo-router";
import { BadgeCheck, ChevronRight, LocateFixed, MapPin, Navigation } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { BusinessMap, type MapMarker } from "@/components/BusinessMap";
import { CompatibilityBadge } from "@/components/StatusBadges";
import { Button, Card } from "@/components/ui";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import type { StudentVacancyItem } from "@/hooks/useStudentVacancies";
import { compareCompatibility, type CompatibilityLevel } from "@/lib/compatibility";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDays, formatRange, formatSalary } from "@/lib/format";
import { DEFAULT_CENTER, directionsUrl, distanceKm, formatDistance, hasLocation, type GeoPoint } from "@/lib/geo";
import { colors } from "@/theme/colors";
import type { BusinessProfile } from "@/types";

const LEVEL_COLOR: Record<CompatibilityLevel, string> = {
  compatible: colors.turquoise,
  parcial: colors.amber,
  no_compatible: colors.soft,
};

interface BusinessGroup {
  business: BusinessProfile & GeoPoint;
  items: StudentVacancyItem[];
  best: CompatibilityLevel;
}

/**
 * Vista de mapa de Buscar vacantes. Usa exactamente los resultados ya filtrados de la lista.
 * La ubicación del estudiante vive solo en este componente (useCurrentLocation): no se guarda ni se envía a nadie.
 */
export function VacancyMap({ items }: { items: StudentVacancyItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { location: userLocation, locating, error: locationError, locate: requestLocation } = useCurrentLocation();
  const [center, setCenter] = useState<GeoPoint>(DEFAULT_CENTER);

  const { groups, withoutPin } = useMemo(() => {
    const map = new Map<string, BusinessGroup>();
    const missing = new Set<string>();
    for (const item of items) {
      const b = item.business;
      if (!b) continue;
      if (!hasLocation(b)) {
        missing.add(b.id);
        continue;
      }
      const g = map.get(b.id) ?? { business: b, items: [], best: "no_compatible" as CompatibilityLevel };
      g.items.push(item);
      if (compareCompatibility(item.compatibility, { level: g.best, score: 0, days: [], fullyCoveredDays: 0 }) < 0) {
        g.best = item.compatibility.level;
      }
      map.set(b.id, g);
    }
    const list = [...map.values()];
    if (userLocation) {
      list.sort((a, b) => distanceKm(userLocation, a.business) - distanceKm(userLocation, b.business));
    }
    return { groups: list, withoutPin: missing.size };
  }, [items, userLocation]);

  const markers: MapMarker[] = groups.map((g) => ({
    id: g.business.id,
    title: g.business.name,
    latitude: g.business.latitude,
    longitude: g.business.longitude,
    color: LEVEL_COLOR[g.best],
  }));
  const selected = groups.find((g) => g.business.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    const g = groups.find((x) => x.business.id === id);
    if (g) setCenter({ latitude: g.business.latitude, longitude: g.business.longitude });
  };

  // El permiso se pide solo al tocar "Cerca de mí".
  const locate = async () => {
    const here = await requestLocation();
    if (here) setCenter(here);
  };

  return (
    <View>
      <BusinessMap
        markers={markers}
        selectedId={selectedId}
        onMarkerPress={select}
        center={center}
        userLocation={userLocation}
      />

      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
        <Legend color={LEVEL_COLOR.compatible} label="Compatible" />
        <Legend color={LEVEL_COLOR.parcial} label="Parcial" />
        <Legend color={LEVEL_COLOR.no_compatible} label="No compatible" />
      </View>

      <View className="mt-3">
        <Button
          title={userLocation ? "Ubicación activa · actualizar" : "Cerca de mí"}
          icon={LocateFixed}
          variant="outline"
          size="sm"
          fullWidth={false}
          loading={locating}
          onPress={locate}
        />
        {locationError ? (
          <Text className="mt-1 text-xs text-amber-700">{locationError}</Text>
        ) : (
          <Text className="mt-1 text-xs text-ink-soft">Tu ubicación no se guarda ni se comparte. Distancias en línea recta.</Text>
        )}
      </View>

      {selected ? (
        <SelectedBusiness group={selected} userLocation={userLocation} />
      ) : (
        <Text className="mt-4 text-sm text-ink-muted">Toca un marcador o un negocio de la lista para ver sus vacantes.</Text>
      )}

      <Text className="mb-2 mt-5 text-sm font-semibold text-ink-muted">
        {groups.length} {groups.length === 1 ? "negocio en el mapa" : "negocios en el mapa"}
        {withoutPin > 0 ? ` · ${withoutPin} sin ubicación (solo en la lista)` : ""}
      </Text>
      <View className="gap-2">
        {groups.map((g) => (
          <Pressable
            key={g.business.id}
            onPress={() => select(g.business.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: g.business.id === selectedId }}
            className={`flex-row items-center gap-3 rounded-2xl border-2 bg-white p-3 ${
              g.business.id === selectedId ? "border-coral" : "border-navy-50 active:bg-navy-50"
            }`}
          >
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: LEVEL_COLOR[g.best] }} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-ink" numberOfLines={1}>
                {g.business.name}
              </Text>
              <Text className="text-xs text-ink-muted">
                {g.items.length} {g.items.length === 1 ? "vacante" : "vacantes"}
                {userLocation ? ` · ${formatDistance(distanceKm(userLocation, g.business))}` : ""}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.soft} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SelectedBusiness({ group, userLocation }: { group: BusinessGroup; userLocation: GeoPoint | null }) {
  const b = group.business;
  return (
    <Card className="mt-4">
      <View className="flex-row items-center gap-3">
        <BusinessIcon category={b.category} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-shrink text-base font-extrabold text-ink" numberOfLines={1}>
              {b.name}
            </Text>
            {b.verified && <BadgeCheck size={16} color={colors.turquoise600} />}
          </View>
          <Text className="text-sm text-ink-muted">
            {CATEGORY_LABELS[b.category]} · {b.verified ? "Verificación básica" : "Verificación pendiente"}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center gap-1.5">
        <MapPin size={14} color={colors.muted} />
        <Text className="flex-1 text-sm text-ink">
          {b.address}
          {userLocation ? ` · ${formatDistance(distanceKm(userLocation, b))}` : ""}
        </Text>
      </View>
      {b.description ? <Text className="mt-2 text-sm leading-5 text-ink-muted">{b.description}</Text> : null}

      <View className="mt-3">
        <Button
          title="Cómo llegar"
          icon={Navigation}
          size="sm"
          variant="secondary"
          fullWidth={false}
          onPress={() => Linking.openURL(directionsUrl(b))}
        />
      </View>

      <Text className="mb-1 mt-4 text-sm font-bold text-navy">Vacantes</Text>
      {group.items.map((i) => (
        <Pressable
          key={i.vacancy.id}
          onPress={() => router.push(`/estudiante/vacante/${i.vacancy.id}`)}
          accessibilityRole="link"
          className="flex-row items-center gap-3 border-t border-navy-50 py-3 active:bg-navy-50"
        >
          <View className="flex-1">
            <Text className="text-sm font-bold text-ink">{i.vacancy.title}</Text>
            <Text className="text-xs text-ink-muted">
              {formatSalary(i.vacancy.salary, i.vacancy.salaryPeriod)} · {formatDays(i.vacancy.days)} ·{" "}
              {formatRange(i.vacancy.start, i.vacancy.end)}
            </Text>
            <View className="mt-1.5">
              <CompatibilityBadge level={i.compatibility.level} />
            </View>
          </View>
          <ChevronRight size={18} color={colors.soft} />
        </Pressable>
      ))}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text className="text-xs text-ink-muted">{label}</Text>
    </View>
  );
}
