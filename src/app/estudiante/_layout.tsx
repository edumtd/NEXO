import { Redirect, Tabs } from "expo-router";
import { ClipboardList, Home, Search, User } from "lucide-react-native";

import { tabIcon } from "@/components/TabBarIcon";
import { useApp } from "@/store/AppStore";
import { useTabBarOptions } from "@/theme/navigation";

export default function EstudianteLayout() {
  const { session } = useApp();
  const tabBarOptions = useTabBarOptions();
  if (!session) return <Redirect href="/" />;
  if (session.role !== "estudiante") return <Redirect href="/negocio/inicio" />;

  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen name="inicio" options={{ title: "Inicio", tabBarIcon: tabIcon(Home) }} />
      <Tabs.Screen name="vacantes" options={{ title: "Buscar", tabBarIcon: tabIcon(Search) }} />
      <Tabs.Screen
        name="postulaciones"
        options={{ title: "Mis Postulaciones", tabBarIcon: tabIcon(ClipboardList) }}
      />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: tabIcon(User) }} />
      <Tabs.Screen name="disponibilidad" options={{ href: null }} />
      <Tabs.Screen name="vacante/[id]" options={{ href: null }} />
    </Tabs>
  );
}
