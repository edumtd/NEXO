import { router } from "expo-router";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ServiceCard } from "@/components/ServiceCard";
import { Chip, EmptyState, Input } from "@/components/ui";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useMarketplaceOffers } from "@/hooks/useServiceOffers";
import {
  MAX_RATE_OPTIONS,
  RATE_PERIOD_LABELS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MODALITY_LABELS,
  TALENT_SORT_LABELS,
  ZONES,
  type TalentSort,
} from "@/lib/constants";
import { formatMoney, matchesQuery } from "@/lib/format";
import { useCurrentBusiness } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { RatePeriod, ServiceCategory, ServiceModality } from "@/types";

// Talento NUNCA se filtra ni se ordena por compatibilidad: permitiría adivinar la disponibilidad del estudiante.
const DEFAULT_FILTERS = {
  query: "",
  category: null as ServiceCategory | null,
  modality: null as ServiceModality | null,
  zone: null as string | null,
  ratePeriod: null as RatePeriod | null,
  maxRate: null as number | null,
  sort: "recientes" as TalentSort,
};

// Lo guardado en el dispositivo se valida: un valor desconocido vuelve al de por defecto.
const pick = <T extends string>(value: string | null, allowed: Record<string, unknown>): T | null =>
  value !== null && value in allowed ? (value as T) : null;

export default function Talento() {
  const items = useMarketplaceOffers();
  const { profile } = useCurrentBusiness();
  const [showFilters, setShowFilters] = useState(false);
  const [f, update, reset] = usePersistentState(profile ? `nexo:filtros:talento:${profile.id}` : null, DEFAULT_FILTERS);

  const category = pick<ServiceCategory>(f.category, SERVICE_CATEGORY_LABELS);
  const modality = pick<ServiceModality>(f.modality, SERVICE_MODALITY_LABELS);
  const zone = f.zone && ZONES.includes(f.zone as (typeof ZONES)[number]) ? f.zone : null;
  const ratePeriod = pick<RatePeriod>(f.ratePeriod, RATE_PERIOD_LABELS);
  const maxRate = ratePeriod && f.maxRate !== null && MAX_RATE_OPTIONS[ratePeriod].includes(f.maxRate) ? f.maxRate : null;
  // El orden por tarifa solo tiene sentido dentro de un mismo tipo de tarifa (por hora o por proyecto).
  const storedSort = pick<TalentSort>(f.sort, TALENT_SORT_LABELS) ?? "recientes";
  const sort: TalentSort = ratePeriod ? storedSort : "recientes";

  const activeFilters = [modality, zone, ratePeriod, maxRate].filter((v) => v !== null).length;
  const isCustomized = activeFilters > 0 || !!category || f.query.trim() !== "" || sort !== "recientes";

  const filtered = useMemo(() => {
    const list = items.filter(({ offer: o, student: s }) => {
      if (category && o.category !== category) return false;
      if (modality && o.modality !== modality) return false;
      // Los servicios remotos no dependen de la zona.
      if (zone && o.modality !== "remoto" && o.zone !== zone) return false;
      if (ratePeriod && o.ratePeriod !== ratePeriod) return false;
      if (ratePeriod && maxRate !== null && o.rate > maxRate) return false;
      if (!matchesQuery(f.query, o.title, s.fullName, s.career)) return false;
      return true;
    });
    const newestFirst = (a: (typeof list)[number], b: (typeof list)[number]) => b.offer.createdAt.localeCompare(a.offer.createdAt);
    return [...list].sort((a, b) => {
      if (sort === "tarifa_asc") return a.offer.rate - b.offer.rate || newestFirst(a, b);
      if (sort === "tarifa_desc") return b.offer.rate - a.offer.rate || newestFirst(a, b);
      return newestFirst(a, b);
    });
  }, [items, f.query, category, modality, zone, ratePeriod, maxRate, sort]);

  return (
    <Screen title="Talento" subtitle="Servicios de estudiantes y egresados">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            icon={Search}
            placeholder="Servicio, nombre o carrera"
            value={f.query}
            onChangeText={(query) => update({ query })}
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
        <Chip label="Todas" selected={!category} onPress={() => update({ category: null })} />
        {(Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map((c) => (
          <Chip key={c} label={SERVICE_CATEGORY_LABELS[c]} selected={category === c} onPress={() => update({ category: category === c ? null : c })} />
        ))}
      </ScrollView>

      {showFilters && (
        <View className="mt-4 rounded-3xl border border-navy-50 bg-white p-4">
          <FilterGroup title="Modalidad">
            {(Object.keys(SERVICE_MODALITY_LABELS) as ServiceModality[]).map((m) => (
              <Chip key={m} size="sm" label={SERVICE_MODALITY_LABELS[m]} selected={modality === m} onPress={() => update({ modality: modality === m ? null : m })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Zona">
            {ZONES.map((z) => (
              <Chip key={z} size="sm" label={z} selected={zone === z} onPress={() => update({ zone: zone === z ? null : z })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Tipo de tarifa">
            {(Object.keys(RATE_PERIOD_LABELS) as RatePeriod[]).map((p) => (
              <Chip
                key={p}
                size="sm"
                label={`Por ${RATE_PERIOD_LABELS[p]}`}
                selected={ratePeriod === p}
                onPress={() => update({ ratePeriod: ratePeriod === p ? null : p, maxRate: null })}
              />
            ))}
          </FilterGroup>
          {ratePeriod ? (
            <FilterGroup title="Tarifa máxima">
              <Chip size="sm" label="Cualquiera" selected={maxRate === null} onPress={() => update({ maxRate: null })} />
              {MAX_RATE_OPTIONS[ratePeriod].map((m) => (
                <Chip key={m} size="sm" label={`Hasta ${formatMoney(m)}`} selected={maxRate === m} onPress={() => update({ maxRate: m })} />
              ))}
            </FilterGroup>
          ) : (
            <Text className="mb-4 text-xs text-ink-muted">Elige un tipo de tarifa para filtrar por monto máximo.</Text>
          )}
        </View>
      )}

      <Text className="mb-2 mt-5 text-sm font-bold text-navy">Ordenar por</Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip size="sm" label={TALENT_SORT_LABELS.recientes} selected={sort === "recientes"} onPress={() => update({ sort: "recientes" })} />
        {ratePeriod ? (
          <>
            <Chip size="sm" label={TALENT_SORT_LABELS.tarifa_asc} selected={sort === "tarifa_asc"} onPress={() => update({ sort: "tarifa_asc" })} />
            <Chip size="sm" label={TALENT_SORT_LABELS.tarifa_desc} selected={sort === "tarifa_desc"} onPress={() => update({ sort: "tarifa_desc" })} />
          </>
        ) : null}
      </View>
      {!ratePeriod && <Text className="mt-1 text-xs text-ink-soft">Elige un tipo de tarifa en los filtros para ordenar por precio.</Text>}

      <View className="mb-3 mt-4 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Text className="text-sm font-semibold text-ink-muted">
          {filtered.length} {filtered.length === 1 ? "servicio" : "servicios"}
        </Text>
        {isCustomized && (
          <Pressable onPress={reset} className="flex-row items-center gap-1" accessibilityRole="button">
            <X size={14} color={colors.coral} />
            <Text className="text-sm font-bold text-coral">Limpiar filtros</Text>
          </Pressable>
        )}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No encontramos servicios"
          description="Prueba con otra categoría o quita algunos filtros."
          actionLabel={isCustomized ? "Limpiar filtros" : undefined}
          onAction={reset}
        />
      ) : (
        <View className="gap-3">
          {filtered.map((i) => (
            <ServiceCard key={i.offer.id} offer={i.offer} student={i.student} onPress={() => router.push(`/negocio/talento/${i.offer.id}`)} />
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
