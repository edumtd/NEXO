import { router } from "expo-router";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ServiceCard } from "@/components/ServiceCard";
import { Chip, EmptyState, Input } from "@/components/ui";
import { useMarketplaceOffers } from "@/hooks/useServiceOffers";
import {
  MAX_RATE_OPTIONS,
  RATE_PERIOD_LABELS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MODALITY_LABELS,
  ZONES,
} from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { colors } from "@/theme/colors";
import type { RatePeriod, ServiceCategory, ServiceModality } from "@/types";

export default function Talento() {
  const items = useMarketplaceOffers();
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [modality, setModality] = useState<ServiceModality | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [ratePeriod, setRatePeriod] = useState<RatePeriod | null>(null);
  const [maxRate, setMaxRate] = useState<number | null>(null);

  const activeFilters = [modality, zone, ratePeriod, maxRate].filter((v) => v !== null).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(({ offer: o, student: s }) => {
      if (category && o.category !== category) return false;
      if (modality && o.modality !== modality) return false;
      // Los servicios remotos no dependen de la zona.
      if (zone && o.modality !== "remoto" && o.zone !== zone) return false;
      if (ratePeriod && o.ratePeriod !== ratePeriod) return false;
      if (ratePeriod && maxRate !== null && o.rate > maxRate) return false;
      if (q && !`${o.title} ${s.fullName} ${s.career}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, category, modality, zone, ratePeriod, maxRate]);

  const clear = () => {
    setModality(null);
    setZone(null);
    setRatePeriod(null);
    setMaxRate(null);
  };

  return (
    <Screen title="Talento" subtitle="Servicios de estudiantes y egresados">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            icon={Search}
            placeholder="Servicio, nombre o carrera"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Buscar talento"
          />
        </View>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Mostrar filtros"
          accessibilityState={{ expanded: showFilters }}
          className={`h-12 w-12 items-center justify-center rounded-2xl ${showFilters ? "bg-navy" : "bg-white border-2 border-navy-100"}`}
        >
          <SlidersHorizontal size={20} color={showFilters ? colors.white : colors.navy} />
          {activeFilters > 0 && (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-coral">
              <Text className="text-[10px] font-bold text-white">{activeFilters}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-3" contentContainerClassName="gap-2 px-5">
        <Chip label="Todas" selected={!category} onPress={() => setCategory(null)} />
        {(Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map((c) => (
          <Chip key={c} label={SERVICE_CATEGORY_LABELS[c]} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
        ))}
      </ScrollView>

      {showFilters && (
        <View className="mt-4 rounded-3xl border border-navy-50 bg-white p-4">
          <FilterGroup title="Modalidad">
            {(Object.keys(SERVICE_MODALITY_LABELS) as ServiceModality[]).map((m) => (
              <Chip key={m} size="sm" label={SERVICE_MODALITY_LABELS[m]} selected={modality === m} onPress={() => setModality(modality === m ? null : m)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Zona">
            {ZONES.map((z) => (
              <Chip key={z} size="sm" label={z} selected={zone === z} onPress={() => setZone(zone === z ? null : z)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Tipo de tarifa">
            {(Object.keys(RATE_PERIOD_LABELS) as RatePeriod[]).map((p) => (
              <Chip
                key={p}
                size="sm"
                label={`Por ${RATE_PERIOD_LABELS[p]}`}
                selected={ratePeriod === p}
                onPress={() => {
                  setRatePeriod(ratePeriod === p ? null : p);
                  setMaxRate(null);
                }}
              />
            ))}
          </FilterGroup>
          {ratePeriod ? (
            <FilterGroup title="Tarifa máxima">
              <Chip size="sm" label="Cualquiera" selected={maxRate === null} onPress={() => setMaxRate(null)} />
              {MAX_RATE_OPTIONS[ratePeriod].map((m) => (
                <Chip
                  key={m}
                  size="sm"
                  label={`Hasta ${formatMoney(m)}`}
                  selected={maxRate === m}
                  onPress={() => setMaxRate(m)}
                />
              ))}
            </FilterGroup>
          ) : (
            <Text className="mb-4 text-xs text-ink-muted">Elige un tipo de tarifa para filtrar por monto máximo.</Text>
          )}
          {activeFilters > 0 && (
            <Pressable onPress={clear} className="flex-row items-center gap-1 self-start" accessibilityRole="button">
              <X size={16} color={colors.coral} />
              <Text className="text-sm font-bold text-coral">Limpiar filtros</Text>
            </Pressable>
          )}
        </View>
      )}

      <Text className="mb-3 mt-5 text-sm font-semibold text-ink-muted">
        {filtered.length} {filtered.length === 1 ? "servicio" : "servicios"}
      </Text>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No encontramos servicios"
          description="Prueba con otra categoría o quita algunos filtros."
          actionLabel={activeFilters > 0 || category ? "Quitar filtros" : undefined}
          onAction={() => {
            clear();
            setCategory(null);
          }}
        />
      ) : (
        <View className="gap-3">
          {filtered.map((i) => (
            <ServiceCard
              key={i.offer.id}
              offer={i.offer}
              student={i.student}
              onPress={() => router.push(`/negocio/talento/${i.offer.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-navy">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}
