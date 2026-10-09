import { router } from "expo-router";
import { Briefcase, Pause, Pencil, Play, Plus, Users, XCircle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { VacancyStatusBadge } from "@/components/StatusBadges";
import { Button, Card, Chip, EmptyState } from "@/components/ui";
import { VACANCY_STATUS_LABELS } from "@/lib/constants";
import { formatDays, formatRange, formatSalary } from "@/lib/format";
import { useApp, useCurrentBusiness } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { Vacancy, VacancyStatus } from "@/types";

const STATUSES = Object.keys(VACANCY_STATUS_LABELS) as VacancyStatus[];

export default function NegocioVacantes() {
  const { vacancies, applications } = useCurrentBusiness();
  const [filter, setFilter] = useState<VacancyStatus>("activa");
  const list = vacancies.filter((v) => v.status === filter);

  return (
    <Screen
      title="Mis vacantes"
      subtitle="Edita, pausa o cierra tus publicaciones"
      right={
        <Pressable
          onPress={() => router.push("/negocio/publicar-vacante")}
          accessibilityRole="button"
          accessibilityLabel="Publicar vacante"
          className="h-10 w-10 items-center justify-center rounded-full bg-coral active:bg-coral-600"
        >
          <Plus size={22} color={colors.white} />
        </Pressable>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-2 px-5">
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={`${VACANCY_STATUS_LABELS[s]} (${vacancies.filter((v) => v.status === s).length})`}
            selected={filter === s}
            onPress={() => setFilter(s)}
          />
        ))}
      </ScrollView>

      <View className="mt-5 gap-3">
        {list.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={`Sin vacantes ${VACANCY_STATUS_LABELS[filter].toLowerCase()}s`}
            description={filter === "activa" ? "Publica una vacante con todos sus datos para recibir postulaciones." : undefined}
            actionLabel={filter === "activa" ? "Publicar vacante" : undefined}
            onAction={() => router.push("/negocio/publicar-vacante")}
          />
        ) : (
          list.map((v) => (
            <VacancyManageCard
              key={v.id}
              vacancy={v}
              applicants={applications.filter((a) => a.vacancyId === v.id).length}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function VacancyManageCard({ vacancy: v, applicants }: { vacancy: Vacancy; applicants: number }) {
  const { setVacancyStatus } = useApp();
  const [confirmClose, setConfirmClose] = useState(false);

  return (
    <Card>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ink">{v.title}</Text>
          <Text className="text-sm text-ink-muted">
            {formatDays(v.days)} · {formatRange(v.start, v.end)}
          </Text>
          <Text className="mt-0.5 text-sm font-bold text-ink">{formatSalary(v.salary, v.salaryPeriod)}</Text>
        </View>
        <VacancyStatusBadge status={v.status} />
      </View>

      <Pressable
        onPress={() => router.push({ pathname: "/negocio/postulaciones", params: { vacancy: v.id } })}
        accessibilityRole="button"
        className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-navy-50 px-3 py-1.5"
      >
        <Users size={14} color={colors.navy} />
        <Text className="text-xs font-bold text-navy">
          {applicants} {applicants === 1 ? "postulación" : "postulaciones"} · {v.openings}{" "}
          {v.openings === 1 ? "lugar" : "lugares"}
        </Text>
      </Pressable>

      {v.status !== "cerrada" &&
        (confirmClose ? (
          <View className="mt-4 rounded-2xl bg-red-50 p-3">
            <Text className="mb-3 text-sm font-semibold text-red-700">
              ¿Cerrar esta vacante? Ya no aparecerá a estudiantes.
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button title="Cancelar" size="sm" variant="outline" onPress={() => setConfirmClose(false)} />
              </View>
              <View className="flex-1">
                <Button title="Sí, cerrar" size="sm" variant="danger" onPress={() => setVacancyStatus(v.id, "cerrada")} />
              </View>
            </View>
          </View>
        ) : (
          <View className="mt-4 flex-row gap-2">
            <View className="flex-1">
              <Button
                title="Editar"
                size="sm"
                variant="outline"
                icon={Pencil}
                onPress={() => router.push({ pathname: "/negocio/publicar-vacante", params: { id: v.id } })}
              />
            </View>
            <View className="flex-1">
              <Button
                title={v.status === "activa" ? "Pausar" : "Reanudar"}
                size="sm"
                variant="outline"
                icon={v.status === "activa" ? Pause : Play}
                onPress={() => setVacancyStatus(v.id, v.status === "activa" ? "pausada" : "activa")}
              />
            </View>
            <View className="flex-1">
              <Button title="Cerrar" size="sm" variant="danger" icon={XCircle} onPress={() => setConfirmClose(true)} />
            </View>
          </View>
        ))}
    </Card>
  );
}
