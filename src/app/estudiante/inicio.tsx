import { router } from "expo-router";
import { CalendarClock, Search, UserPen } from "lucide-react-native";
import { Text, View } from "react-native";

import { NotificationBell, NotificationsPanel, useNotificationsToggle } from "@/components/Notifications";
import { Screen, SectionTitle } from "@/components/Screen";
import { VacancyCard } from "@/components/VacancyCard";
import { Avatar, Button, Card, EmptyState, ProgressRing } from "@/components/ui";
import { useStudentVacancies } from "@/hooks/useStudentVacancies";
import { totalWeeklyMinutes } from "@/lib/compatibility";
import { useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";

const WEEKLY_HOURS_REFERENCE = 30;

export default function EstudianteInicio() {
  const { profile, blocks, applications, notifications } = useCurrentStudent();
  const items = useStudentVacancies();
  const { open: showNotifications, toggle: toggleNotifications, unread } = useNotificationsToggle(notifications);

  if (!profile) return null;
  const firstName = profile.fullName.split(" ")[0];
  const hours = Math.round((totalWeeklyMinutes(blocks) / 60) * 10) / 10;
  const recommended = items.filter((i) => i.compatibility.level !== "no_compatible" && !i.application).slice(0, 3);
  const profileIncomplete = !profile.career || !profile.university || !profile.zone;

  const count = (s: string) => applications.filter((a) => a.status === s).length;

  return (
    <Screen
      header={
        <>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-3">
              <Avatar name={profile.fullName} ring />
              <View className="flex-1">
                <Text className="text-lg font-bold text-white" numberOfLines={1}>
                  {profile.fullName}
                </Text>
                <Text className="text-sm text-navy-100" numberOfLines={1}>
                  {profile.career || "Completa tu perfil"}
                </Text>
              </View>
            </View>
            <NotificationBell unread={unread} onPress={toggleNotifications} />
          </View>
          <Text className="mt-6 text-3xl font-extrabold text-white">Hola, {firstName} </Text>
        </>
      }
    >
      {showNotifications && <NotificationsPanel notifications={notifications} allHref="/estudiante/notificaciones" />}

      <View className="flex-row items-center gap-4 rounded-3xl border border-turquoise-100 bg-turquoise-50 p-5">
        <View className="flex-1">
          <Text className="text-lg font-extrabold leading-6 text-navy">Actualizar disponibilidad semanal</Text>
          <Text className="mb-4 mt-1 text-sm text-ink-muted">
            {profile.availabilityPeriod ? `Periodo: ${profile.availabilityPeriod}` : "Registra tus bloques libres"}
          </Text>
          <Button
            title="Actualizar"
            icon={CalendarClock}
            fullWidth={false}
            onPress={() => router.push("/estudiante/disponibilidad")}
          />
        </View>
        <ProgressRing progress={hours / WEEKLY_HOURS_REFERENCE}>
          <Text className="text-2xl font-extrabold text-navy">{hours} h</Text>
          <Text className="text-xs text-ink-muted">libres</Text>
        </ProgressRing>
      </View>

      {profileIncomplete && (
        <Card className="mt-4" onPress={() => router.push("/estudiante/perfil")}>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-coral-50">
              <UserPen size={22} color={colors.coral} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-navy">Completa tu perfil</Text>
              <Text className="text-sm text-ink-muted">Carrera, institución, zona y habilidades.</Text>
            </View>
          </View>
        </Card>
      )}

      <SectionTitle
        title="Vacantes para ti"
        actionLabel="Ver todas"
        onAction={() => router.push("/estudiante/vacantes")}
      />
      {recommended.length === 0 ? (
        <EmptyState
          icon={Search}
          title={blocks.length === 0 ? "Agrega tu disponibilidad" : "Sin coincidencias por ahora"}
          description={
            blocks.length === 0
              ? "Con tus bloques libres podemos mostrarte vacantes compatibles."
              : "Explora todas las vacantes o ajusta tus bloques de disponibilidad."
          }
          actionLabel={blocks.length === 0 ? "Registrar disponibilidad" : "Explorar vacantes"}
          onAction={() =>
            router.push(blocks.length === 0 ? "/estudiante/disponibilidad" : "/estudiante/vacantes")
          }
        />
      ) : (
        <View className="gap-3">
          {recommended.map((i) => (
            <VacancyCard
              key={i.vacancy.id}
              vacancy={i.vacancy}
              business={i.business}
              compatibility={i.compatibility.level}
              onPress={() => router.push(`/estudiante/vacante/${i.vacancy.id}`)}
            />
          ))}
        </View>
      )}

      <SectionTitle
        title="Tus postulaciones"
        actionLabel="Ver detalle"
        onAction={() => router.push("/estudiante/postulaciones")}
      />
      <View className="flex-row gap-3">
        <Stat label="Recibidas" value={count("recibida")} className="bg-navy-50" />
        <Stat label="Entrevista" value={count("entrevista")} className="bg-amber-50" />
        <Stat label="Aceptadas" value={count("aceptada")} className="bg-turquoise-50" />
      </View>
    </Screen>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <View className={`flex-1 rounded-3xl p-4 ${className}`}>
      <Text className="text-3xl font-extrabold text-navy">{value}</Text>
      <Text className="text-sm font-medium text-ink-muted">{label}</Text>
    </View>
  );
}
