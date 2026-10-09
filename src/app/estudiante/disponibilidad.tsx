import { router } from "expo-router";
import { CalendarPlus, Lock, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { DayPicker, TimeStepper } from "@/components/Pickers";
import { Screen, SectionTitle } from "@/components/Screen";
import { Button, Card, Chip, EmptyState, Input } from "@/components/ui";
import { mergeBlocks, totalWeeklyMinutes } from "@/lib/compatibility";
import { DAYS } from "@/lib/constants";
import { formatRange, uid } from "@/lib/format";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { AvailabilityBlock, DayIndex } from "@/types";

const TIMELINE_START = 6 * 60;
const TIMELINE_END = 24 * 60;
const PERIOD_SUGGESTIONS = ["Primavera 2027", "Verano 2027", "Otoño 2026", "Intersemestral"];

export default function Disponibilidad() {
  const { setAvailability } = useApp();
  const { profile, blocks: saved } = useCurrentStudent();
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(saved);
  const [period, setPeriod] = useState(profile?.availabilityPeriod ?? "");
  const [days, setDays] = useState<DayIndex[]>([]);
  const [start, setStart] = useState(16 * 60);
  const [end, setEnd] = useState(20 * 60);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hours = Math.round((totalWeeklyMinutes(blocks) / 60) * 10) / 10;

  const addBlocks = () => {
    if (days.length === 0) return setFormError("Selecciona al menos un día.");
    if (end <= start) return setFormError("La hora final debe ser posterior a la inicial.");
    setFormError(null);
    setBlocks((prev) => [...prev, ...days.map((day) => ({ id: uid("blk"), day, start, end }))]);
    setDays([]);
  };

  const removeBlock = (day: DayIndex, s: number, e: number) =>
    // Quita los bloques originales que forman el intervalo fusionado mostrado.
    setBlocks((prev) => prev.filter((b) => !(b.day === day && b.start >= s && b.end <= e)));

  const save = async () => {
    setSaving(true);
    // Guardamos bloques ya fusionados para evitar traslapes.
    const normalized: AvailabilityBlock[] = DAYS.flatMap(({ value }) =>
      mergeBlocks(blocks, value).map(([s, e]) => ({ id: uid("blk"), day: value, start: s, end: e }))
    );
    await setAvailability(normalized, period.trim());
    setSaving(false);
    router.back();
  };

  return (
    <Screen
      back
      title="Disponibilidad"
      subtitle="Bloques libres por semana, no tu horario completo"
      footer={<Button title={`Guardar disponibilidad · ${hours} h`} size="lg" loading={saving} onPress={save} />}
    >
      <View className="flex-row items-start gap-3 rounded-3xl bg-turquoise-50 p-4">
        <Lock size={18} color={colors.turquoise600} />
        <Text className="flex-1 text-sm leading-5 text-turquoise-700">
          Tu disponibilidad es privada. Solo se usa para calcular compatibilidad; los negocios únicamente ven la
          etiqueta, nunca tus bloques.
        </Text>
      </View>

      <SectionTitle title="Periodo académico" />
      <Input
        placeholder="Ej. Primavera 2027"
        value={period}
        onChangeText={setPeriod}
        hint="Actualiza tus bloques cada vez que cambie tu horario."
      />
      <View className="mt-3 flex-row flex-wrap gap-2">
        {PERIOD_SUGGESTIONS.map((p) => (
          <Chip key={p} size="sm" label={p} selected={period === p} onPress={() => setPeriod(p)} />
        ))}
      </View>

      <SectionTitle title="Agregar bloque" />
      <Card>
        <Text className="mb-2 text-sm font-semibold text-navy">Días</Text>
        <DayPicker value={days} onChange={setDays} />
        <View className="mt-4 flex-row gap-3">
          <TimeStepper label="Desde" value={start} onChange={setStart} max={23 * 60 + 30} />
          <TimeStepper label="Hasta" value={end} onChange={setEnd} min={6 * 60 + 30} />
        </View>
        {formError && <Text className="mt-2 text-xs font-medium text-red-600">{formError}</Text>}
        <View className="mt-4">
          <Button title="Agregar bloque" icon={Plus} variant="secondary" onPress={addBlocks} />
        </View>
      </Card>

      <SectionTitle title="Tu semana" />
      {blocks.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Aún no tienes bloques"
          description="Agrega los horarios en los que podrías trabajar, considerando traslados y tiempo de estudio."
        />
      ) : (
        <Card>
          {DAYS.map(({ value, short }) => {
            const merged = mergeBlocks(blocks, value);
            return (
              <View key={value} className="border-b border-navy-50 py-3 last:border-b-0">
                <View className="flex-row items-center gap-3">
                  <Text className="w-10 text-sm font-bold text-navy">{short}</Text>
                  <View className="h-3 flex-1 overflow-hidden rounded-full bg-navy-50">
                    {merged.map(([s, e]) => (
                      <View
                        key={s}
                        className="absolute h-3 rounded-full bg-turquoise"
                        style={{
                          left: `${((s - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100}%`,
                          width: `${((e - s) / (TIMELINE_END - TIMELINE_START)) * 100}%`,
                        }}
                      />
                    ))}
                  </View>
                </View>
                {merged.length > 0 && (
                  <View className="ml-[52px] mt-2 flex-row flex-wrap gap-2">
                    {merged.map(([s, e]) => (
                      <Pressable
                        key={s}
                        onPress={() => removeBlock(value, s, e)}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar bloque ${short} ${formatRange(s, e)}`}
                        className="flex-row items-center gap-1 rounded-full bg-turquoise-50 py-1 pl-3 pr-2 active:bg-turquoise-100"
                      >
                        <Text className="text-xs font-bold text-turquoise-700">{formatRange(s, e)}</Text>
                        <X size={14} color={colors.turquoise600} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          <View className="ml-[52px] mt-2 flex-row justify-between">
            <Text className="text-[11px] text-ink-soft">06:00</Text>
            <Text className="text-[11px] text-ink-soft">15:00</Text>
            <Text className="text-[11px] text-ink-soft">24:00</Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}
