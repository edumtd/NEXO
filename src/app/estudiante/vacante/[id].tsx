import { router, useLocalSearchParams } from "expo-router";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  CircleDollarSign,
  Clock,
  FileQuestion,
  Flag,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { Screen } from "@/components/Screen";
import { ApplicationStatusBadge, CompatibilityBadge } from "@/components/StatusBadges";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { StudentInterviewPanel } from "@/components/Interview";
import { ReportForm } from "@/components/ReportForm";
import { LimitBadge } from "@/components/VacancyCard";
import { useStudentVacancies } from "@/hooks/useStudentVacancies";
import { CATEGORY_LABELS, DAYS, EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import {
  formatDate,
  formatDays,
  formatMoney,
  formatRange,
  formatSalary,
  hourlyRate,
  weeklyHours,
} from "@/lib/format";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";

export default function VacanteDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { applyToVacancy, toggleSavedVacancy } = useApp();
  const { profile, blocks, interviews } = useCurrentStudent();
  const item = useStudentVacancies().find((i) => i.vacancy.id === id);
  const [applying, setApplying] = useState(false);

  if (!item) {
    return (
      <Screen back title="Vacante">
        <EmptyState
          icon={FileQuestion}
          title="Vacante no disponible"
          description="Es posible que el negocio la haya pausado o cerrado."
          actionLabel="Ver vacantes"
          onAction={() => router.replace("/estudiante/vacantes")}
        />
      </Screen>
    );
  }

  const { vacancy: v, business, compatibility, application, exceedsLimit, saved } = item;
  const proposal = application ? interviews.find((p) => p.applicationId === application.id) : undefined;

  const apply = async () => {
    setApplying(true);
    await applyToVacancy(v.id);
    setApplying(false);
  };

  return (
    <Screen
      back
      title={v.title}
      subtitle={EMPLOYMENT_TYPE_LABELS[v.type]}
      right={
        <Pressable
          onPress={() => toggleSavedVacancy(v.id)}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Quitar de guardadas" : "Guardar vacante"}
          accessibilityState={{ selected: saved }}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <Bookmark size={20} color={saved ? colors.coral : colors.white} fill={saved ? colors.coral : "none"} />
        </Pressable>
      }
      footer={
        application ? (
          <View className="flex-row items-center justify-between rounded-2xl bg-navy-50 px-4 py-3">
            <Text className="text-base font-semibold text-navy">Ya te postulaste</Text>
            <ApplicationStatusBadge status={application.status} />
          </View>
        ) : (
          <View>
            <Button title="Postularme" size="lg" loading={applying} onPress={apply} />
            <Text className="mt-2 text-center text-xs text-ink-muted">
              Postularte no garantiza contratación. El negocio verá tu perfil, no tus bloques de disponibilidad.
            </Text>
          </View>
        )
      }
    >
      {proposal && (
        <View className="mb-4">
          <StudentInterviewPanel proposal={proposal} blocks={blocks} />
        </View>
      )}

      <Card>
        <View className="flex-row items-center gap-3">
          <BusinessIcon category={business?.category ?? "comercio"} size="lg" />
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
                {business?.name}
              </Text>
              {business?.verified && <BadgeCheck size={18} color={colors.turquoise600} />}
            </View>
            <Text className="text-sm text-ink-muted">
              {business ? CATEGORY_LABELS[business.category] : ""}
              {business?.verified ? " · Verificación básica" : " · Verificación pendiente"}
            </Text>
          </View>
        </View>
        {business?.description ? (
          <Text className="mt-3 text-sm leading-5 text-ink-muted">{business.description}</Text>
        ) : null}
      </Card>

      <Card className="mt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-navy">Compatibilidad</Text>
          <View className="ml-3 flex-1 flex-row flex-wrap justify-end gap-2">
            <CompatibilityBadge level={compatibility.level} />
            {exceedsLimit && profile?.maxWeeklyHours ? <LimitBadge hours={profile.maxWeeklyHours} /> : null}
          </View>
        </View>
        <View className="flex-row gap-1.5">
          {compatibility.days.map((d) => (
            <View key={d.day} className="flex-1 items-center">
              <View
                className={`h-11 w-full items-center justify-center rounded-xl ${
                  d.coverage >= 1 ? "bg-turquoise" : d.coverage > 0 ? "bg-amber-100" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    d.coverage >= 1 ? "text-white" : d.coverage > 0 ? "text-amber-700" : "text-gray-500"
                  }`}
                >
                  {DAYS[d.day].short}
                </Text>
              </View>
              <Text className="mt-1 text-[11px] text-ink-muted">{Math.round(d.coverage * 100)}%</Text>
            </View>
          ))}
        </View>
        <Text className="mt-3 text-sm leading-5 text-ink-muted">
          Cubres el turno completo en {compatibility.fullyCoveredDays} de {compatibility.days.length}{" "}
          {compatibility.days.length === 1 ? "día" : "días"} según tu disponibilidad registrada.
        </Text>
      </Card>

      <View className="mt-4 flex-row flex-wrap gap-3">
        <InfoTile
          icon={CircleDollarSign}
          label="Sueldo"
          value={formatSalary(v.salary, v.salaryPeriod)}
          note={v.salaryPeriod !== "hora" ? `≈ ${formatMoney(hourlyRate(v))} por hora` : undefined}
        />
        <InfoTile icon={Clock} label="Horario" value={formatRange(v.start, v.end)} note={`${weeklyHours(v)} h por semana`} />
        <InfoTile icon={CalendarDays} label="Días" value={formatDays(v.days)} />
        <InfoTile icon={Flag} label="Inicio" value={formatDate(v.startDate)} />
        <InfoTile icon={MapPin} label="Ubicación" value={v.zone} note={v.address} />
        <InfoTile icon={Users} label="Vacantes" value={`${v.openings} ${v.openings === 1 ? "lugar" : "lugares"}`} />
      </View>

      <ListCard title="Actividades" items={v.activities} />
      <ListCard title="Requisitos" items={v.requirements} />

      <View className="mt-4">
        <Badge label="Postularte en NEXO no tiene costo" tone="success" />
      </View>

      {business && <ReportForm vacancyId={v.id} businessId={business.id} businessName={business.name} />}
    </Screen>
  );
}

function InfoTile({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-3xl border border-navy-50 bg-white p-4">
      <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-turquoise-50">
        <Icon size={18} color={colors.turquoise600} />
      </View>
      <Text className="text-xs font-semibold uppercase text-ink-soft">{label}</Text>
      <Text className="text-base font-bold text-ink">{value}</Text>
      {note && <Text className="mt-0.5 text-xs text-ink-muted">{note}</Text>}
    </View>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="mt-4">
      <Text className="mb-2 text-base font-extrabold text-navy">{title}</Text>
      {items.map((it) => (
        <View key={it} className="flex-row gap-2 py-1">
          <View className="mt-2 h-1.5 w-1.5 rounded-full bg-coral" />
          <Text className="flex-1 text-sm leading-5 text-ink">{it}</Text>
        </View>
      ))}
    </Card>
  );
}
