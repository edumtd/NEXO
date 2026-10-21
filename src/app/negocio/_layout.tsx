import { Redirect, Tabs } from "expo-router";

import { SideNav } from "@/components/SideNav";
import { tabIcon } from "@/components/TabBarIcon";
import { useApp, useCurrentBusiness } from "@/store/AppStore";
import { BUSINESS_HIDDEN_ROUTES, BUSINESS_LINKS, useIsWideWeb, useTabBarOptions } from "@/theme/navigation";

export default function NegocioLayout() {
  const { session } = useApp();
  const { profile, notifications } = useCurrentBusiness();
  const unread = notifications.filter((n) => !n.read).length;
  const tabBarOptions = useTabBarOptions();
  const wide = useIsWideWeb();
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
            href: link.inTabBar ? undefined : null,
          }}
        />
      ))}
      {BUSINESS_HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
