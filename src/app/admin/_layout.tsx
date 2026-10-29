import { Redirect, Stack, router } from "expo-router";
import { Monitor } from "lucide-react-native";
import { View } from "react-native";

import { Screen } from "@/components/Screen";
import { SideNav } from "@/components/SideNav";
import { Button, EmptyState, LoadingState } from "@/components/ui";
import { useAdmin, useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import { ADMIN_LINKS, useIsWideWeb } from "@/theme/navigation";

/**
 * Panel de administración: solo web desde 768px. Quien no es administrador vuelve a "/".
 * La app solo decide qué mostrar; los permisos reales los aplica Supabase (is_admin()).
 */
export default function AdminLayout() {
  const { session, authReady, logout } = useApp();
  const { reports, verifications } = useAdmin();
  const wide = useIsWideWeb();

  if (!authReady) return <LoadingState message="Cargando tu sesión…" />;
  if (!session || session.role !== "admin") return <Redirect href="/" />;

  if (!wide) {
    return (
      <Screen title="Panel de administración" subtitle="NEXO">
        <EmptyState
          icon={Monitor}
          title="Abre el panel desde una computadora"
          description="El panel de administración funciona en el navegador con una pantalla de al menos 768 px de ancho."
        />
        <View className="mt-4">
          <Button
            title="Cerrar sesión"
            variant="outline"
            onPress={() => {
              logout();
              router.replace("/");
            }}
          />
        </View>
      </Screen>
    );
  }

  const pending = reports.filter((r) => r.status === "nuevo").length;
  return (
    <View className="flex-1 flex-row bg-surface">
      <SideNav links={ADMIN_LINKS} title="Administración" subtitle="Panel de NEXO" counts={{ reportes: pending, verificaciones: verifications.filter((v) => v.status === "en_revision").length }} />
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
      </View>
    </View>
  );
}
