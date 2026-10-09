import { router } from "expo-router";
import { CalendarDays, ChevronRight, Inbox, Plus, Settings, ShieldAlert, Users, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Screen, SectionTitle } from "@/components/Screen";
import { CompatibilityBadge } from "@/components/StatusBadges";
import { Avatar, Card, EmptyState } from "@/components/ui";
import { useBusinessApplicants } from "@/hooks/useBusinessApplicants";
import { useCurrentBusiness } from "@/store/AppStore";
import { colors } from "@/theme/colors";

export default function NegocioInicio() {
  const { profile, vacancies } = useCurrentBusiness();
  const applicants = useBusinessApplicants();
  if (!profile) return null;

  const active = vacancies.filter((v) => v.status === "activa").length;
  const fresh = applicants.filter((a) => a.application.status === "recibida");
  const profileIncomplete = !profile.address || !profile.description || !profile.contactPhone;

  return (
    <Screen
      eyebrow="Modo negocio"
      title={profile.name}
      right={
        <Pressable
          onPress={() => router.push("/negocio/perfil")}
          accessibilityRole="button"
          accessibilityLabel="Configuración del negocio"
          className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <Settings size={22} color={colors.white} />
        </Pressable>
      }
    >
      <Pressable
        onPress={() => router.push("/negocio/publicar-vacante")}
        accessibilityRole="button"
        className="items-center rounded-3xl bg-coral px-5 py-6 active:bg-coral-600"
      >
        <View className="mb-2 h-11 w-11 items-center justify-center rounded-full bg-white/20">
          <Plus size={26} color={colors.white} strokeWidth={3} />
        </View>
        <Text className="text-lg font-extrabold text-white">Publicar nueva vacante</Text>
        <Text className="mt-0.5 text-sm text-white/90">Sueldo, horario y actividades claras desde el inicio</Text>
      </Pressable>

      <View className="mt-4 flex-row gap-3">
        <StatCard icon={CalendarDays} label="Vacantes activas" value={active} onPress={() => router.push("/negocio/vacantes")} />
        <StatCard icon={Inbox} label="Postulaciones nuevas" value={fresh.length} onPress={() => router.push("/negocio/postulaciones")} />
      </View>

      {(!profile.verified || profileIncomplete) && (
        <Card className="mt-4" onPress={() => router.push("/negocio/perfil")}>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-50">
              <ShieldAlert size={22} color={colors.amber} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-navy">
                {profileIncomplete ? "Completa el perfil del negocio" : "Verificación básica pendiente"}
              </Text>
              <Text className="text-sm text-ink-muted">
                Los estudiantes confían más en negocios con datos completos.
              </Text>
            </View>
            <ChevronRight size={20} color={colors.soft} />
          </View>
        </Card>
      )}

      <SectionTitle
        title="Nuevos postulantes"
        actionLabel="Ver todos"
        onAction={() => router.push("/negocio/postulaciones")}
      />
      {fresh.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin postulaciones nuevas"
          description="Cuando un estudiante se postule a tus vacantes aparecerá aquí, ordenado por compatibilidad."
        />
      ) : (
        <Card className="py-1">
          {fresh.slice(0, 3).map((a, i) => (
            <Pressable
              key={a.application.id}
              onPress={() => router.push({ pathname: "/negocio/postulaciones", params: { vacancy: a.vacancy.id } })}
              accessibilityRole="button"
              className={`flex-row items-center gap-3 py-3 ${i > 0 ? "border-t border-navy-50" : ""}`}
            >
              <Avatar name={a.student.fullName} />
              <View className="flex-1">
                <Text className="text-base font-bold text-ink" numberOfLines={1}>
                  {a.student.fullName}
                </Text>
                <Text className="mb-1 text-sm text-ink-muted" numberOfLines={1}>
                  {a.vacancy.title}
                </Text>
                <CompatibilityBadge level={a.compatibility.level} />
              </View>
              <ChevronRight size={20} color={colors.soft} />
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Card className="flex-1" onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 text-sm font-bold text-navy">{label}</Text>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-turquoise-50">
          <Icon size={20} color={colors.turquoise600} />
        </View>
      </View>
      <Text className="mt-1 text-4xl font-extrabold text-navy">{value}</Text>
    </Card>
  );
}
