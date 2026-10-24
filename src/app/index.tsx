import { Redirect, router } from "expo-router";
import { CalendarCheck, Eye, ShieldCheck, type LucideIcon } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { Button, LoadingState } from "@/components/ui";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: CalendarCheck,
    title: "Compatible con tus clases",
    text: "Registra bloques libres y ve qué turnos sí puedes cubrir.",
  },
  {
    icon: Eye,
    title: "Vacantes transparentes",
    text: "Sueldo, horario, ubicación y actividades antes de postularte.",
  },
  {
    icon: ShieldCheck,
    title: "Tus datos, protegidos",
    text: "Sin kardex, calificaciones ni horario académico completo.",
  },
];

export default function Welcome() {
  const { session, authReady } = useApp();
  const insets = useSafeAreaInsets();

  if (!authReady) return <LoadingState message="Cargando tu sesión…" />;
  if (session) return <Redirect href={session.role === "estudiante" ? "/estudiante/inicio" : "/negocio/inicio"} />;

  return (
    <ScrollView
      className="flex-1 bg-navy"
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
    >
      <View className="w-full max-w-[520px] flex-1 self-center px-6">
        <Logo />
        <Text className="mt-4 text-3xl font-extrabold leading-9 text-white">
          Empleo de medio tiempo que sí cabe en tu semana.
        </Text>
        <Text className="mt-3 text-base leading-6 text-navy-100">
          NEXO conecta a estudiantes universitarios de cualquier carrera e institución con negocios cercanos
          que necesitan cubrir turnos.
        </Text>

        <View className="mt-8 gap-3">
          {features.map(({ icon: Icon, title, text }) => (
            <View key={title} className="flex-row items-center gap-4 rounded-3xl bg-white/10 p-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-turquoise">
                <Icon size={24} color={colors.white} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">{title}</Text>
                <Text className="text-sm leading-5 text-navy-100">{text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="flex-1" />

        <View className="mt-10 gap-3">
          <Button title="Crear cuenta" size="lg" onPress={() => router.push("/registro")} />
          <Button title="Iniciar sesión" size="lg" variant="light" onPress={() => router.push("/login")} />
        </View>
        <Text className="mt-5 text-center text-xs text-navy-100">
          Prototipo con datos de demostración · NEXO no cobra a estudiantes ni garantiza contratación.
        </Text>
      </View>
    </ScrollView>
  );
}
