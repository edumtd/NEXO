import { Redirect, Tabs } from "expo-router";

import { SideNav } from "@/components/SideNav";
import { tabIcon } from "@/components/TabBarIcon";
import { LoadingState } from "@/components/ui";
import { ACADEMIC_STATUS_LABELS } from "@/lib/constants";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { HIDDEN_TAB_OPTIONS, homeFor, STUDENT_HIDDEN_ROUTES, STUDENT_LINKS, useIsWideWeb, useTabBarOptions } from "@/theme/navigation";

export default function EstudianteLayout() {
  const { session, authReady } = useApp();
  const { profile, notifications } = useCurrentStudent();
  const unread = notifications.filter((n) => !n.read).length;
  const tabBarOptions = useTabBarOptions();
  const wide = useIsWideWeb();
  if (!authReady) return <LoadingState message="Cargando tu sesión…" />;
  if (!session) return <Redirect href="/" />;
  if (session.role !== "estudiante") return <Redirect href={homeFor(session.role)} />;

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
            ...(link.inTabBar ? null : HIDDEN_TAB_OPTIONS),
          }}
        />
      ))}
      {STUDENT_HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={HIDDEN_TAB_OPTIONS} />
      ))}
    </Tabs>
  );
}
