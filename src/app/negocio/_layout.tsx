import { Redirect, Tabs } from "expo-router";

import { SideNav } from "@/components/SideNav";
import { tabIcon } from "@/components/TabBarIcon";
import { LoadingState } from "@/components/ui";
import { useApp, useCurrentBusiness } from "@/store/AppStore";
import { HIDDEN_TAB_OPTIONS, BUSINESS_HIDDEN_ROUTES, BUSINESS_LINKS, useIsWideWeb, useTabBarOptions } from "@/theme/navigation";

export default function NegocioLayout() {
  const { session, authReady } = useApp();
  const { profile, notifications } = useCurrentBusiness();
  const unread = notifications.filter((n) => !n.read).length;
  const tabBarOptions = useTabBarOptions();
  const wide = useIsWideWeb();
  if (!authReady) return <LoadingState message="Cargando tu sesión…" />;
  if (!session) return <Redirect href="/" />;
  if (session.role !== "negocio") return <Redirect href="/estudiante/inicio" />;

  return (
    <Tabs
      screenOptions={tabBarOptions}
      tabBar={
        wide
          ? () => (
              <SideNav
                links={BUSINESS_LINKS}
                title={profile?.name ?? "Mi negocio"}
                subtitle="Negocio"
                counts={{ notificaciones: unread }}
              />
            )
          : undefined
      }
    >
      {BUSINESS_LINKS.map((link) => (
        <Tabs.Screen
          key={link.name}
          name={link.name}
          options={{
            title: link.tabLabel ?? link.label,
            tabBarIcon: tabIcon(link.icon),
            ...(link.inTabBar ? null : HIDDEN_TAB_OPTIONS),
          }}
        />
      ))}
      {BUSINESS_HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={HIDDEN_TAB_OPTIONS} />
      ))}
    </Tabs>
  );
}
