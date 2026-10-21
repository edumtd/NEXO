import { router, useLocalSearchParams } from "expo-router";
import {
  CalendarCheck,
  Check,
  ChevronRight,
  CircleDollarSign,
  Mail,
  MapPin,
  School,
  Sparkles,
  Users,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { formatRate } from "@/components/ServiceCard";
import { ServiceProgress } from "@/components/ServiceProgress";
import {
  AcademicStatusBadge,
  ApplicationStatusBadge,
  CompatibilityBadge,
  ServiceRequestStatusBadge,
} from "@/components/StatusBadges";
import { Avatar, Button, Card, Chip, EmptyState } from "@/components/ui";
import { useBusinessApplicants, type ApplicantItem } from "@/hooks/useBusinessApplicants";
import { hasSchedule, useBusinessServiceRequests, type BusinessRequestItem } from "@/hooks/useServiceRequests";
import { formatDate, formatDays, formatRange } from "@/lib/format";
import { useApp, useCurrentBusiness } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { ApplicationStatus } from "@/types";

type Section = "vacantes" | "servicios";

export default function NegocioPostulaciones() {
  const params = useLocalSearchParams<{ vacancy?: string; tipo?: string }>();
  const { vacancies } = useCurrentBusiness();
  const items = useBusinessApplicants();
  const requests = useBusinessServiceRequests();
  const sectionFromParams: Section = params.tipo === "servicios" ? "servicios" : "vacantes";
  const [section, setSection] = useState<Section>(sectionFromParams);
  const [vacancyFilter, setVacancyFilter] = useState<string | null>(params.vacancy ?? null);
  const [lastParams, setLastParams] = useState(`${params.vacancy}|${params.tipo}`);

  // Si llegamos desde otra pantalla con un filtro distinto, lo aplicamos.
  if (`${params.vacancy}|${params.tipo}` !== lastParams) {
    setLastParams(`${params.vacancy}|${params.tipo}`);
    setVacancyFilter(params.vacancy ?? null);
    setSection(params.vacancy ? "vacantes" : sectionFromParams);
  }

  const withApplicants = vacancies.filter((v) => items.some((i) => i.vacancy.id === v.id));
  const list = items.filter((i) => !vacancyFilter || i.vacancy.id === vacancyFilter);

  return (
    <Screen
      title="Postulantes"
      subtitle={
        section === "vacantes"
          ? "Ordenados por compatibilidad con el turno"
          : "Solicitudes que enviaste en Talento"
      }
    >
      <View className="mb-5 flex-row gap-2">
        <Chip label={`Vacantes (${items.length})`} selected={section === "vacantes"} onPress={() => setSection("vacantes")} />
        <Chip label={`Servicios (${requests.length})`} selected={section === "servicios"} onPress={() => setSection("servicios")} />
      </View>

      {section === "servicios" ? (
        <ServiceRequestList items={requests} />
      ) : (
        <>
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
        </>
      )}
    </Screen>
  );
}

function ServiceRequestList({ items }: { items: BusinessRequestItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Aún no envías solicitudes"
        description="Busca servicios de marketing, administración, diseño y más en Talento."
        actionLabel="Ir a Talento"
        onAction={() => router.push("/negocio/talento")}
      />
    );
  }
  return (
    <View className="gap-3">
      {items.map((item) => (
        <ServiceRequestCard key={item.request.id} item={item} />
      ))}
    </View>
  );
}

/** Tarjeta resumida: las acciones (confirmar, ajustes, cancelar) viven en el detalle. */
function ServiceRequestCard({ item }: { item: BusinessRequestItem }) {
  const { request: r, offer, student, compatibility } = item;
  return (
    <Card
      onPress={() => router.push(`/negocio/solicitud/${r.id}`)}
      accessibilityLabel={`Solicitud a ${student.fullName} para ${offer.title}`}
    >
      <View className="flex-row items-center gap-3">
        <Avatar name={student.fullName} size="lg" />
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
            {student.fullName}
          </Text>
          <Text className="mb-1 text-sm text-ink-muted" numberOfLines={1}>
            {offer.title}
          </Text>
          <AcademicStatusBadge status={student.academicStatus} />
        </View>
        <ServiceRequestStatusBadge status={r.status} />
      </View>

      <View className="mt-4">
        <ServiceProgress request={r} compact />
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {compatibility && <CompatibilityBadge level={compatibility.level} />}
        <Text className="text-xs font-semibold text-ink-muted">
          {hasSchedule(r) ? `${formatDays(r.days!)} · ${formatRange(r.start!, r.end!)}` : "Remoto, sin horario fijo"}
        </Text>
      </View>
      <View className="mt-2">
        <Row icon={CircleDollarSign} text={`${formatRate(offer)} (referencia)`} />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs text-ink-soft">Actualizada el {formatDate(r.updatedAt)}</Text>
        <View className="flex-row items-center">
          <Text className="text-xs font-bold text-coral">
            {r.status === "entregada" ? "Revisar entrega" : "Ver seguimiento"}
          </Text>
          <ChevronRight size={14} color={colors.coral} />
        </View>
      </View>
    </Card>
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
