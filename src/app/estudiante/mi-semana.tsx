import { router } from "expo-router";
import { Briefcase, CalendarPlus, ChevronRight, Lock, Sparkles } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Screen, SectionTitle } from "@/components/Screen";
import { Card, EmptyState } from "@/components/ui";
import { useStudentWeek } from "@/hooks/useStudentWeek";
import { mergeBlocks, type WeeklyCommitment } from "@/lib/compatibility";
import { DAYS } from "@/lib/constants";
import { formatDays, formatRange } from "@/lib/format";
import { useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";

const TIMELINE_START = 6 * 60;
const TIMELINE_END = 24 * 60;
const SPAN = TIMELINE_END - TIMELINE_START;

/** Posición horizontal (en %) de un intervalo dentro de la línea de tiempo 06:00–24:00. */
function segment(start: number, end: number) {
  const s = Math.max(start, TIMELINE_START);
  const e = Math.min(end, TIMELINE_END);
  return { left: `${((s - TIMELINE_START) / SPAN) * 100}%` as const, width: `${(Math.max(e - s, 0) / SPAN) * 100}%` as const };
}

export default function MiSemana() {
  const { blocks } = useCurrentStudent();
  const { commitments, freeHours, committedHours, maxWeeklyHours, remainingHours } = useStudentWeek();
  const over = maxWeeklyHours !== undefined && committedHours > maxWeeklyHours;

  return (
    <Screen back title="Mi semana" subtitle="Tus bloques libres y lo que ya te comprometiste a cubrir">
      <View className="flex-row gap-3">
        <Stat label="Horas libres" value={`${freeHours} h`} className="bg-turquoise-50" />
        <Stat label="Ocupadas" value={`${committedHours} h`} className="bg-navy-50" />
        <Stat
          label={maxWeeklyHours ? `Restantes de ${maxWeeklyHours} h` : "Límite semanal"}
          value={remainingHours !== null ? `${remainingHours} h` : "Sin límite"}
          className={over ? "bg-red-50" : "bg-coral-50"}
        />
      </View>
      {!maxWeeklyHours && (
        <Pressable onPress={() => router.push("/estudiante/perfil")} accessibilityRole="link" className="mt-2 self-start">
          <Text className="text-sm font-bold text-coral">Definir mi límite semanal</Text>
        </Pressable>
      )}

      <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-2">
        <Legend className="bg-turquoise-100" label="Libre" />
        <Legend className="bg-navy" label="Turno aceptado" />
        <Legend className="bg-coral" label="Servicio presencial" />
      </View>

      <SectionTitle title="Semana" />
      {blocks.length === 0 && commitments.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Tu semana está vacía"
          description="Registra tu disponibilidad para ver aquí tus bloques libres y tus compromisos."
          actionLabel="Registrar disponibilidad"
          onAction={() => router.push("/estudiante/disponibilidad")}
        />
      ) : (
        <Card>
          {DAYS.map(({ value, short }) => {
            const free = mergeBlocks(blocks, value);
            const dayCommitments = commitments.filter((c) => c.days.includes(value));
            return (
              <View key={value} className={`py-3 ${value > 0 ? "border-t border-navy-50" : ""}`}>
                <View className="flex-row items-center gap-3">
                  <Text className="w-10 text-sm font-bold text-navy">{short}</Text>
                  <View className="h-5 flex-1 overflow-hidden rounded-full bg-navy-50/60">
                    {free.map(([s, e]) => (
                      <View key={`f-${s}`} className="absolute h-5 rounded-full bg-turquoise-100" style={segment(s, e)} />
                    ))}
                    {dayCommitments.map((c) => (
                      <View
                        key={`${c.source}-${c.refId}`}
                        className={`absolute top-1 h-3 rounded-full ${c.source === "vacante" ? "bg-navy" : "bg-coral"}`}
                        style={segment(c.start, c.end)}
                      />
                    ))}
                  </View>
                </View>
                {dayCommitments.length > 0 && (
                  <View className="ml-[52px] mt-2 gap-1">
                    {dayCommitments.map((c) => (
                      <Text key={`t-${c.source}-${c.refId}`} className="text-xs text-ink-muted" numberOfLines={1}>
                        {formatRange(c.start, c.end)} · {c.title}
                      </Text>
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

      <SectionTitle title="Tus compromisos" />
      {commitments.length === 0 ? (
        <Text className="text-sm text-ink-muted">Aún no tienes turnos aceptados ni servicios presenciales activos.</Text>
      ) : (
        <View className="gap-3">
          {commitments.map((c) => (
            <CommitmentCard key={`${c.source}-${c.refId}`} commitment={c} />
          ))}
        </View>
      )}

      <View className="mt-6 flex-row items-start gap-3 rounded-3xl bg-navy-50 p-4">
        <Lock size={18} color={colors.navy} />
        <Text className="flex-1 text-sm leading-5 text-navy">
          Mi semana es privada. Los negocios no ven tus bloques, tus compromisos ni tu límite semanal.
        </Text>
      </View>
    </Screen>
  );
}

function CommitmentCard({ commitment: c }: { commitment: WeeklyCommitment }) {
  const isVacancy = c.source === "vacante";
  const Icon = isVacancy ? Briefcase : Sparkles;
  return (
    <Card
      onPress={() => router.push(isVacancy ? `/estudiante/vacante/${c.refId}` : `/estudiante/solicitud/${c.refId}`)}
      accessibilityLabel={`${c.title}, ${formatDays(c.days)} ${formatRange(c.start, c.end)}`}
    >
      <View className="flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-xl ${isVacancy ? "bg-navy-50" : "bg-coral-50"}`}>
          <Icon size={18} color={isVacancy ? colors.navy : colors.coral} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink" numberOfLines={1}>
            {c.title}
          </Text>
          <Text className="text-sm text-ink-muted">
            {isVacancy ? "Turno aceptado" : "Servicio presencial"} · {formatDays(c.days)} · {formatRange(c.start, c.end)}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.soft} />
      </View>
    </Card>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <View className={`flex-1 rounded-3xl p-3 ${className}`}>
      <Text className="text-2xl font-extrabold text-navy">{value}</Text>
      <Text className="text-xs font-medium text-ink-muted">{label}</Text>
    </View>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-3 w-6 rounded-full ${className}`} />
      <Text className="text-xs text-ink-muted">{label}</Text>
    </View>
  );
}
