import { Redirect, Tabs } from "expo-router";

import { SideNav } from "@/components/SideNav";
import { tabIcon } from "@/components/TabBarIcon";
import { ACADEMIC_STATUS_LABELS } from "@/lib/constants";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { STUDENT_HIDDEN_ROUTES, STUDENT_LINKS, useIsWideWeb, useTabBarOptions } from "@/theme/navigation";

export default function EstudianteLayout() {
  const { session } = useApp();
  const { profile, notifications } = useCurrentStudent();
  const unread = notifications.filter((n) => !n.read).length;
  const tabBarOptions = useTabBarOptions();
  const wide = useIsWideWeb();
  if (!session) return <Redirect href="/" />;
  if (session.role !== "estudiante") return <Redirect href="/negocio/inicio" />;

  return (
    <Tabs
      screenOptions={tabBarOptions}
      tabBar={
        wide
          ? () => (
              <SideNav
                links={STUDENT_LINKS}
                title={profile?.fullName ?? "Estudiante"}
                subtitle={profile ? ACADEMIC_STATUS_LABELS[profile.academicStatus] : "Estudiante"}
                counts={{ notificaciones: unread }}
              />
            )
          : undefined
      }
    >
      {STUDENT_LINKS.map((link) => (
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
      {STUDENT_HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
