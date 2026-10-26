import { router } from "expo-router";
import { Bookmark, CalendarClock, Search, SlidersHorizontal, X } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyMap } from "@/components/VacancyMap";
import { Chip, EmptyState, Input } from "@/components/ui";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useSavedVacancies, useStudentVacancies, type StudentVacancyItem } from "@/hooks/useStudentVacancies";
import { compareCompatibility } from "@/lib/compatibility";
import {
  CATEGORY_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  MIN_HOURLY_OPTIONS,
  SHIFT_SLOTS,
  START_WITHIN_DAYS,
  START_WITHIN_LABELS,
  VACANCY_SORT_LABELS,
  ZONES,
  type StartWithin,
  type VacancySort,
} from "@/lib/constants";
import { addDaysISO, hourlyRate, matchesQuery, todayISO } from "@/lib/format";
import { distanceKm, hasLocation, type GeoPoint } from "@/lib/geo";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { BusinessCategory, EmploymentType } from "@/types";

type SlotKey = (typeof SHIFT_SLOTS)[number]["key"];
/** "cercania" no se guarda: necesita la ubicación, que nunca se almacena. */
type StoredSort = Exclude<VacancySort, "cercania">;

const DEFAULT_FILTERS = {
  query: "",
  onlySaved: false,
  onlyCompatible: false,
  onlyWithinLimit: false,
  onlyVerified: false,
  zone: null as string | null,
  slot: null as SlotKey | null,
  type: null as EmploymentType | null,
  category: null as BusinessCategory | null,
  startWithin: "cualquiera" as StartWithin,
  minHourly: 0,
  sort: "recientes" as StoredSort,
};

// Lo guardado en el dispositivo se valida: un valor desconocido vuelve al de por defecto.
const pick = <T extends string>(value: string | null, allowed: Record<string, unknown>): T | null =>
  value !== null && value in allowed ? (value as T) : null;

export default function Vacantes() {
  const activeItems = useStudentVacancies();
  const savedItems = useSavedVacancies();
  const { toggleSavedVacancy } = useApp();
  const { profile } = useCurrentStudent();
  const limit = profile?.maxWeeklyHours;
  const periodExpired = !!profile?.periodEndDate && todayISO() > profile.periodEndDate;
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [showFilters, setShowFilters] = useState(false);
  const [f, update, reset] = usePersistentState(profile ? `nexo:filtros:vacantes:${profile.id}` : null, DEFAULT_FILTERS);
  // Orden por cercanía: solo mientras la pantalla está abierta y con la ubicación pedida en ese momento.
  const [byDistance, setByDistance] = useState(false);
  const { location, locating, error: locationError, locate } = useCurrentLocation();

  const zone = f.zone && ZONES.includes(f.zone as (typeof ZONES)[number]) ? f.zone : null;
  const slot = pick<SlotKey>(f.slot, Object.fromEntries(SHIFT_SLOTS.map((s) => [s.key, true])));
  const type = pick<EmploymentType>(f.type, EMPLOYMENT_TYPE_LABELS);
  const category = pick<BusinessCategory>(f.category, CATEGORY_LABELS);
  const startWithin = pick<StartWithin>(f.startWithin, START_WITHIN_LABELS) ?? "cualquiera";
  const storedSort = pick<StoredSort>(f.sort, VACANCY_SORT_LABELS) ?? "recientes";
  const sort: VacancySort = byDistance && location ? "cercania" : storedSort;
  const items = f.onlySaved ? savedItems : activeItems;

  const activeFilters = [zone, type, category, startWithin !== "cualquiera" ? startWithin : null, f.minHourly > 0 ? f.minHourly : null, f.onlyVerified || null].filter(Boolean).length;
  const isCustomized =
    activeFilters > 0 || !!slot || f.onlySaved || f.onlyCompatible || f.onlyWithinLimit || f.query.trim() !== "" || sort !== "recientes";

  const filtered = useMemo(() => {
    const slotRange = SHIFT_SLOTS.find((s) => s.key === slot);
    const startLimit = startWithin === "cualquiera" ? null : addDaysISO(START_WITHIN_DAYS[startWithin]);
    const list = items.filter(({ vacancy: v, business, compatibility, exceedsLimit }) => {
      if (f.onlyCompatible && compatibility.level !== "compatible") return false;
      if (f.onlyWithinLimit && exceedsLimit) return false;
      if (f.onlyVerified && !business?.verified) return false;
      if (zone && v.zone !== zone) return false;
      if (type && v.type !== type) return false;
      if (category && business?.category !== category) return false;
      if (slotRange && (v.start < slotRange.from || v.start >= slotRange.to)) return false;
      if (startLimit && v.startDate > startLimit) return false;
      if (f.minHourly && hourlyRate(v) < f.minHourly) return false;
      if (!matchesQuery(f.query, v.title, business?.name)) return false;
      return true;
    });
    return sortVacancies(list, sort, location);
  }, [items, f, zone, slot, type, category, startWithin, sort, location]);

  const chooseSort = async (next: VacancySort) => {
    if (next !== "cercania") {
      setByDistance(false);
      update({ sort: next });
      return;
    }
    // El permiso se pide solo al elegir "Más cercanas".
    const here = location ?? (await locate());
    setByDistance(!!here);
  };

  const clearAll = () => {
    reset();
    setByDistance(false);
  };

  return (
    <Screen title="Buscar vacantes" subtitle="Encuentra turnos que caben en tu semana">
      {periodExpired && (
        <Pressable
          onPress={() => router.push("/estudiante/disponibilidad")}
          accessibilityRole="link"
          className="mb-4 flex-row items-center gap-3 rounded-2xl bg-amber-50 p-4 active:opacity-80"
        >
          <CalendarClock size={18} color={colors.amber} />
          <Text className="flex-1 text-sm leading-5 text-amber-700">
            Tu disponibilidad puede estar desactualizada: tu periodo ya terminó. <Text className="font-bold">Actualizar</Text>
          </Text>
        </Pressable>
      )}

      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            icon={Search}
            placeholder="Puesto o negocio"
            value={f.query}
            onChangeText={(query) => update({ query })}
            accessibilityLabel="Buscar vacantes"
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
        <Chip label={`Guardadas (${savedItems.length})`} selected={f.onlySaved} onPress={() => update({ onlySaved: !f.onlySaved })} />
        <Chip label="Solo compatibles" selected={f.onlyCompatible} onPress={() => update({ onlyCompatible: !f.onlyCompatible })} />
        {limit ? (
          <Chip label="Dentro de mi límite" selected={f.onlyWithinLimit} onPress={() => update({ onlyWithinLimit: !f.onlyWithinLimit })} />
        ) : null}
        {SHIFT_SLOTS.map((s) => (
          <Chip key={s.key} label={s.label} selected={slot === s.key} onPress={() => update({ slot: slot === s.key ? null : s.key })} />
        ))}
      </ScrollView>

      {showFilters && (
        <View className="mt-4 rounded-3xl border border-navy-50 bg-white p-4">
          <FilterGroup title="Zona">
            {ZONES.map((z) => (
              <Chip key={z} size="sm" label={z} selected={zone === z} onPress={() => update({ zone: zone === z ? null : z })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Giro del negocio">
            {(Object.keys(CATEGORY_LABELS) as BusinessCategory[]).map((c) => (
              <Chip key={c} size="sm" label={CATEGORY_LABELS[c]} selected={category === c} onPress={() => update({ category: category === c ? null : c })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Tipo de empleo">
            {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((t) => (
              <Chip key={t} size="sm" label={EMPLOYMENT_TYPE_LABELS[t]} selected={type === t} onPress={() => update({ type: type === t ? null : t })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Fecha de inicio">
            {(Object.keys(START_WITHIN_LABELS) as StartWithin[]).map((w) => (
              <Chip key={w} size="sm" label={START_WITHIN_LABELS[w]} selected={startWithin === w} onPress={() => update({ startWithin: w })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Sueldo mínimo (equivalente por hora)">
            {MIN_HOURLY_OPTIONS.map((m) => (
              <Chip key={m} size="sm" label={m === 0 ? "Cualquiera" : `$${m}+/h`} selected={f.minHourly === m} onPress={() => update({ minHourly: m })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Negocio">
            <Chip size="sm" label="Solo negocios verificados" selected={f.onlyVerified} onPress={() => update({ onlyVerified: !f.onlyVerified })} />
          </FilterGroup>
        </View>
      )}

      <Text className="mb-2 mt-5 text-sm font-bold text-navy">Ordenar por</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-2 px-5">
        {(Object.keys(VACANCY_SORT_LABELS) as VacancySort[]).map((s) => (
          <Chip
            key={s}
            size="sm"
            label={s === "cercania" && locating ? "Ubicando…" : VACANCY_SORT_LABELS[s]}
            selected={sort === s}
            onPress={() => void chooseSort(s)}
          />
        ))}
      </ScrollView>
      {sort === "cercania" ? (
        <Text className="mt-1 text-xs text-ink-soft">Distancia en línea recta. Tu ubicación no se guarda ni se comparte.</Text>
      ) : locationError ? (
        <Text className="mt-1 text-xs text-amber-700">{locationError}</Text>
      ) : null}

      <View className="mb-3 mt-4 flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <Text className="text-sm font-semibold text-ink-muted">
            {filtered.length} {filtered.length === 1 ? "vacante" : "vacantes"}
          </Text>
          {isCustomized && (
            <Pressable onPress={clearAll} className="flex-row items-center gap-1" accessibilityRole="button">
              <X size={14} color={colors.coral} />
              <Text className="text-sm font-bold text-coral">Limpiar filtros</Text>
            </Pressable>
          )}
        </View>
        <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel="Vista">
          <Chip size="sm" label="Lista" selected={view === "lista"} onPress={() => setView("lista")} />
          <Chip size="sm" label="Mapa" selected={view === "mapa"} onPress={() => setView("mapa")} />
        </View>
      </View>

      {view === "mapa" && filtered.length > 0 ? (
        <VacancyMap items={filtered} />
      ) : filtered.length === 0 ? (
        f.onlySaved && savedItems.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Aún no guardas vacantes"
            description="Toca el marcador de una vacante para guardarla y postularte después."
            actionLabel="Ver todas"
            onAction={() => update({ onlySaved: false })}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No encontramos vacantes"
            description="Prueba con otros filtros o actualiza tu disponibilidad."
            actionLabel={isCustomized ? "Limpiar filtros" : undefined}
            onAction={clearAll}
          />
        )
      ) : (
        <View className="gap-3">
          {filtered.map((i) => (
            <VacancyCard
              key={i.vacancy.id}
              vacancy={i.vacancy}
              business={i.business}
              compatibility={i.compatibility.level}
              exceedsLimitOf={i.exceedsLimit ? limit : undefined}
              saved={i.saved}
              onToggleSave={() => toggleSavedVacancy(i.vacancy.id)}
              unavailable={!i.available}
              onPress={() => router.push(`/estudiante/vacante/${i.vacancy.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const newestFirst = (a: StudentVacancyItem, b: StudentVacancyItem) => b.vacancy.createdAt.localeCompare(a.vacancy.createdAt);

function sortVacancies(list: StudentVacancyItem[], sort: VacancySort, here: GeoPoint | null): StudentVacancyItem[] {
  // Los negocios sin ubicación en el mapa van al final al ordenar por cercanía.
  const dist = (i: StudentVacancyItem) => (here && i.business && hasLocation(i.business) ? distanceKm(here, i.business) : Infinity);
  const bySort = (a: StudentVacancyItem, b: StudentVacancyItem): number => {
    switch (sort) {
      case "sueldo":
        return hourlyRate(b.vacancy) - hourlyRate(a.vacancy);
      case "compatibilidad":
        return compareCompatibility(a.compatibility, b.compatibility);
      case "cercania":
        return dist(a) - dist(b) || 0;
      default:
        return 0;
    }
  };
  // En Guardadas, las pausadas o cerradas siempre quedan al final.
  return [...list].sort((a, b) => Number(b.available) - Number(a.available) || bySort(a, b) || newestFirst(a, b));
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-navy">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}
