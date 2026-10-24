import { router } from "expo-router";
import { Bookmark, CalendarClock, Search, SlidersHorizontal, X } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyMap } from "@/components/VacancyMap";
import { Chip, EmptyState, Input } from "@/components/ui";
import { useSavedVacancies, useStudentVacancies } from "@/hooks/useStudentVacancies";
import { EMPLOYMENT_TYPE_LABELS, MIN_HOURLY_OPTIONS, SHIFT_SLOTS, ZONES } from "@/lib/constants";
import { hourlyRate, todayISO } from "@/lib/format";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { EmploymentType } from "@/types";

type SlotKey = (typeof SHIFT_SLOTS)[number]["key"];

export default function Vacantes() {
  const activeItems = useStudentVacancies();
  const savedItems = useSavedVacancies();
  const { toggleSavedVacancy } = useApp();
  const { profile } = useCurrentStudent();
  const limit = profile?.maxWeeklyHours;
  const periodExpired = !!profile?.periodEndDate && todayISO() > profile.periodEndDate;
  const [onlySaved, setOnlySaved] = useState(false);
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [onlyWithinLimit, setOnlyWithinLimit] = useState(false);
  const items = onlySaved ? savedItems : activeItems;
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [zone, setZone] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotKey | null>(null);
  const [type, setType] = useState<EmploymentType | null>(null);
  const [minHourly, setMinHourly] = useState<number>(0);

  const activeFilters = [zone, slot, type, minHourly > 0 ? minHourly : null].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const slotRange = SHIFT_SLOTS.find((s) => s.key === slot);
    return items.filter(({ vacancy: v, business, compatibility, exceedsLimit }) => {
      if (onlyCompatible && compatibility.level !== "compatible") return false;
      if (onlyWithinLimit && exceedsLimit) return false;
      if (zone && v.zone !== zone) return false;
      if (type && v.type !== type) return false;
      if (slotRange && (v.start < slotRange.from || v.start >= slotRange.to)) return false;
      if (minHourly && hourlyRate(v) < minHourly) return false;
      if (q && !`${v.title} ${business?.name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, onlyCompatible, onlyWithinLimit, zone, slot, type, minHourly]);

  const clear = () => {
    setZone(null);
    setSlot(null);
    setType(null);
    setMinHourly(0);
  };

  return (
    <Screen title="Buscar vacantes" subtitle="Ordenadas por compatibilidad con tu disponibilidad">
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
            value={query}
            onChangeText={setQuery}
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
        <Chip label={`Guardadas (${savedItems.length})`} selected={onlySaved} onPress={() => setOnlySaved((v) => !v)} />
        <Chip label="Solo compatibles" selected={onlyCompatible} onPress={() => setOnlyCompatible((v) => !v)} />
        {limit ? (
          <Chip label="Dentro de mi límite" selected={onlyWithinLimit} onPress={() => setOnlyWithinLimit((v) => !v)} />
        ) : null}
        {SHIFT_SLOTS.map((s) => (
          <Chip key={s.key} label={s.label} selected={slot === s.key} onPress={() => setSlot(slot === s.key ? null : s.key)} />
        ))}
      </ScrollView>

      {showFilters && (
        <View className="mt-4 rounded-3xl border border-navy-50 bg-white p-4">
          <FilterGroup title="Zona">
            {ZONES.map((z) => (
              <Chip key={z} size="sm" label={z} selected={zone === z} onPress={() => setZone(zone === z ? null : z)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Tipo de empleo">
            {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((t) => (
              <Chip
                key={t}
                size="sm"
                label={EMPLOYMENT_TYPE_LABELS[t]}
                selected={type === t}
                onPress={() => setType(type === t ? null : t)}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="Sueldo mínimo (equivalente por hora)">
            {MIN_HOURLY_OPTIONS.map((m) => (
              <Chip key={m} size="sm" label={m === 0 ? "Cualquiera" : `$${m}+/h`} selected={minHourly === m} onPress={() => setMinHourly(m)} />
            ))}
          </FilterGroup>
          {activeFilters > 0 && (
            <Pressable onPress={clear} className="mt-1 flex-row items-center gap-1 self-start" accessibilityRole="button">
              <X size={16} color={colors.coral} />
              <Text className="text-sm font-bold text-coral">Limpiar filtros</Text>
            </Pressable>
          )}
        </View>
      )}

      <View className="mb-3 mt-5 flex-row items-center justify-between gap-2">
        <Text className="text-sm font-semibold text-ink-muted">
          {filtered.length} {filtered.length === 1 ? "vacante" : "vacantes"}
        </Text>
        <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel="Vista">
          <Chip size="sm" label="Lista" selected={view === "lista"} onPress={() => setView("lista")} />
          <Chip size="sm" label="Mapa" selected={view === "mapa"} onPress={() => setView("mapa")} />
        </View>
      </View>

      {view === "mapa" && filtered.length > 0 ? (
        <VacancyMap items={filtered} />
      ) : filtered.length === 0 ? (
        onlySaved && savedItems.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Aún no guardas vacantes"
            description="Toca el marcador de una vacante para guardarla y postularte después."
            actionLabel="Ver todas"
            onAction={() => setOnlySaved(false)}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No encontramos vacantes"
            description="Prueba con otros filtros o actualiza tu disponibilidad."
            actionLabel={activeFilters > 0 || onlyCompatible || onlyWithinLimit ? "Quitar filtros" : undefined}
            onAction={() => {
              clear();
              setOnlyCompatible(false);
              setOnlyWithinLimit(false);
            }}
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

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-navy">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}
