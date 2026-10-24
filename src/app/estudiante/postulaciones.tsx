import { router } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { Screen } from "@/components/Screen";
import { InterviewHint } from "@/components/Interview";
import { ApplicationStatusBadge } from "@/components/StatusBadges";
import { Card, Chip, EmptyState } from "@/components/ui";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDays, formatRange } from "@/lib/format";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import type { ApplicationStatus } from "@/types";

const STATUSES = Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[];

export default function Postulaciones() {
  const { vacancies, businesses } = useApp();
  const { applications, interviews } = useCurrentStudent();
  const [filter, setFilter] = useState<ApplicationStatus | null>(null);

  const list = applications
    .filter((a) => !filter || a.status === filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Screen title="Mis postulaciones" subtitle="Sigue el estado de cada vacante">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-2 px-5">
        <Chip label={`Todas (${applications.length})`} selected={!filter} onPress={() => setFilter(null)} />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={APPLICATION_STATUS_LABELS[s]}
            selected={filter === s}
            onPress={() => setFilter(filter === s ? null : s)}
          />
        ))}
      </ScrollView>

      <View className="mt-5 gap-3">
        {list.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={filter ? "Sin postulaciones en este estado" : "Aún no te postulas"}
            description="Explora vacantes compatibles con tu disponibilidad."
            actionLabel="Buscar vacantes"
            onAction={() => router.push("/estudiante/vacantes")}
          />
        ) : (
          list.map((a) => {
            const v = vacancies.find((x) => x.id === a.vacancyId);
            const b = businesses.find((x) => x.id === v?.businessId);
            if (!v) return null;
            return (
              <Card key={a.id} onPress={() => router.push(`/estudiante/vacante/${v.id}`)}>
                <View className="flex-row items-center gap-3">
                  <BusinessIcon category={b?.category ?? "comercio"} />
                  <View className="flex-1">
                    <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
                      {v.title}
                    </Text>
                    <Text className="text-sm text-ink-muted" numberOfLines={1}>
                      {b?.name}
                    </Text>
                  </View>
                  <ApplicationStatusBadge status={a.status} />
                </View>
                <Text className="mt-3 text-sm text-ink-muted">
                  {formatDays(v.days)} · {formatRange(v.start, v.end)}
                </Text>
                <StatusTrack status={a.status} />
                <Text className="mt-2 text-xs text-ink-soft">
                  Postulación: {formatDate(a.createdAt)} · Actualizada: {formatDate(a.updatedAt)}
                </Text>
                {interviews.find((p) => p.applicationId === a.id) ? (
                  <InterviewHint proposal={interviews.find((p) => p.applicationId === a.id)!} />
                ) : null}
                {v.status !== "activa" && (
                  <Text className="mt-1 text-xs font-semibold text-amber-700">
                    El negocio {v.status === "pausada" ? "pausó" : "cerró"} esta vacante.
                  </Text>
                )}
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function StatusTrack({ status }: { status: ApplicationStatus }) {
  const steps = ["Recibida", "Entrevista", status === "rechazada" ? "Rechazada" : "Aceptada"];
  const reached = status === "recibida" ? 1 : status === "entrevista" ? 2 : 3;
  const finalColor = status === "rechazada" ? "bg-red-400" : "bg-turquoise";
  return (
    <View className="mt-4 flex-row gap-1.5">
      {steps.map((label, i) => (
        <View key={label} className="flex-1">
          <View className={`h-1.5 rounded-full ${i < reached ? (i === 2 ? finalColor : "bg-turquoise") : "bg-navy-50"}`} />
          <Text className={`mt-1 text-[11px] ${i < reached ? "font-bold text-navy" : "text-ink-soft"}`}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
