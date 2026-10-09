import { router, useLocalSearchParams } from "expo-router";
import { CalendarCheck, Check, Mail, MapPin, School, Users, X } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ApplicationStatusBadge, CompatibilityBadge } from "@/components/StatusBadges";
import { Avatar, Button, Card, Chip, EmptyState } from "@/components/ui";
import { useBusinessApplicants, type ApplicantItem } from "@/hooks/useBusinessApplicants";
import { formatDate } from "@/lib/format";
import { useApp, useCurrentBusiness } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { ApplicationStatus } from "@/types";

export default function NegocioPostulaciones() {
  const params = useLocalSearchParams<{ vacancy?: string }>();
  const { vacancies } = useCurrentBusiness();
  const items = useBusinessApplicants();
  const [vacancyFilter, setVacancyFilter] = useState<string | null>(params.vacancy ?? null);
  const [lastParam, setLastParam] = useState(params.vacancy);

  // Si llegamos desde otra pantalla con un filtro distinto, lo aplicamos.
  if (params.vacancy !== lastParam) {
    setLastParam(params.vacancy);
    setVacancyFilter(params.vacancy ?? null);
  }

  const withApplicants = vacancies.filter((v) => items.some((i) => i.vacancy.id === v.id));
  const list = items.filter((i) => !vacancyFilter || i.vacancy.id === vacancyFilter);

  return (
    <Screen title="Postulantes" subtitle="Ordenados por compatibilidad con el turno">
      {withApplicants.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mb-5" contentContainerClassName="gap-2 px-5">
          <Chip label={`Todas (${items.length})`} selected={!vacancyFilter} onPress={() => setVacancyFilter(null)} />
          {withApplicants.map((v) => (
            <Chip
              key={v.id}
              label={`${v.title} (${items.filter((i) => i.vacancy.id === v.id).length})`}
              selected={vacancyFilter === v.id}
              onPress={() => setVacancyFilter(v.id)}
            />
          ))}
        </ScrollView>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no hay postulaciones"
          description="Solo verás perfiles de estudiantes que se postulen a tus vacantes."
          actionLabel="Ver mis vacantes"
          onAction={() => router.push("/negocio/vacantes")}
        />
      ) : (
        <View className="gap-3">
          {list.map((item) => (
            <ApplicantCard key={item.application.id} item={item} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const ACTIONS: { status: ApplicationStatus; label: string; icon: typeof Check; variant: "secondary" | "outline" | "danger" }[] = [
  { status: "entrevista", label: "Entrevista", icon: CalendarCheck, variant: "outline" },
  { status: "aceptada", label: "Aceptar", icon: Check, variant: "secondary" },
  { status: "rechazada", label: "Rechazar", icon: X, variant: "danger" },
];

function ApplicantCard({ item }: { item: ApplicantItem }) {
  const { setApplicationStatus } = useApp();
  const [pending, setPending] = useState<ApplicationStatus | null>(null);
  const { student: s, vacancy: v, application: a, compatibility } = item;
  // El contacto se muestra solo cuando el negocio decide avanzar con la persona.
  const showContact = a.status === "entrevista" || a.status === "aceptada";

  const change = async (status: ApplicationStatus) => {
    setPending(status);
    await setApplicationStatus(a.id, status);
    setPending(null);
  };

  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <Avatar name={s.fullName} size="lg" />
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
            {s.fullName}
          </Text>
          <Text className="text-sm text-ink-muted" numberOfLines={1}>
            {s.career}
          </Text>
        </View>
        <ApplicationStatusBadge status={a.status} />
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <CompatibilityBadge level={compatibility.level} />
        <Text className="text-xs font-semibold text-ink-muted">
          Cubre {compatibility.fullyCoveredDays}/{compatibility.days.length} días · {v.title}
        </Text>
      </View>

      <View className="mt-3 gap-1.5">
        <Row icon={School} text={s.university} />
        <Row icon={MapPin} text={s.zone} />
        {showContact && <Row icon={Mail} text={s.email} />}
      </View>

      {s.skills.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {s.skills.map((sk) => (
            <View key={sk} className="rounded-full bg-navy-50 px-2.5 py-1">
              <Text className="text-xs font-semibold text-navy">{sk}</Text>
            </View>
          ))}
        </View>
      )}

      <Text className="mt-3 text-xs text-ink-soft">Postulación recibida el {formatDate(a.createdAt)}</Text>

      <View className="mt-3 flex-row gap-2">
        {ACTIONS.map((act) => (
          <View key={act.status} className="flex-1">
            <Button
              title={act.label}
              size="sm"
              variant={act.variant}
              icon={act.icon}
              disabled={a.status === act.status || pending !== null}
              loading={pending === act.status}
              onPress={() => change(act.status)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

function Row({ icon: Icon, text }: { icon: typeof Check; text: string }) {
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={15} color={colors.muted} />
      <Text className="text-sm text-ink">{text}</Text>
    </View>
  );
}
