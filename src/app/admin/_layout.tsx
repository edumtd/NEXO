import { Redirect, Tabs } from "expo-router";

import { SideNav } from "@/components/SideNav";
import { tabIcon } from "@/components/TabBarIcon";
import { LoadingState } from "@/components/ui";
import { useAdmin, useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import { ADMIN_HIDDEN_ROUTES, ADMIN_LINKS, HIDDEN_TAB_OPTIONS, useIsWideWeb, useTabBarOptions } from "@/theme/navigation";

/**
 * Panel de administración: barra lateral en web ancha y barra inferior en celular o pantallas angostas.
 * Quien no es administrador vuelve a "/". La app solo decide qué mostrar; los permisos reales los aplica
 * Supabase (is_admin()).
 */
export default function AdminLayout() {
  const { session, authReady } = useApp();
  const { reports, verifications } = useAdmin();
  const tabBarOptions = useTabBarOptions();
  const wide = useIsWideWeb();

  if (!authReady) return <LoadingState message="Cargando tu sesión…" />;
  if (!session || session.role !== "admin") return <Redirect href="/" />;

  const counts: Record<string, number> = {
    reportes: reports.filter((r) => r.status === "nuevo").length,
    verificaciones: verifications.filter((v) => v.status === "en_revision").length,
  };

  return (
    <Tabs
      screenOptions={tabBarOptions}
      tabBar={wide ? () => <SideNav links={ADMIN_LINKS} title="Administración" subtitle="Panel de NEXO" counts={counts} /> : undefined}
    >
      {ADMIN_LINKS.map((link) => (
        <Tabs.Screen
          key={link.name}
          name={link.name}
          options={{
            title: link.tabLabel ?? link.label,
            tabBarIcon: tabIcon(link.icon),
            // En la barra inferior el contador de pendientes va como globo sobre el ícono.
            tabBarBadge: counts[link.name] ? counts[link.name] : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.coral, color: colors.white, fontSize: 10 },
          }}
        />
      ))}
      {ADMIN_HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={HIDDEN_TAB_OPTIONS} />
      ))}
    </Tabs>
  );
}
