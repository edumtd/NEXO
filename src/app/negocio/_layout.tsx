import { Redirect, Tabs } from "expo-router";
import { Briefcase, LayoutDashboard, Store, Users } from "lucide-react-native";

import { tabIcon } from "@/components/TabBarIcon";
import { useApp } from "@/store/AppStore";
import { useTabBarOptions } from "@/theme/navigation";

export default function NegocioLayout() {
  const { session } = useApp();
  const tabBarOptions = useTabBarOptions();
  if (!session) return <Redirect href="/" />;
  if (session.role !== "negocio") return <Redirect href="/estudiante/inicio" />;

  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen name="inicio" options={{ title: "Panel", tabBarIcon: tabIcon(LayoutDashboard) }} />
      <Tabs.Screen name="vacantes" options={{ title: "Vacantes", tabBarIcon: tabIcon(Briefcase) }} />
      <Tabs.Screen name="postulaciones" options={{ title: "Postulantes", tabBarIcon: tabIcon(Users) }} />
      <Tabs.Screen name="perfil" options={{ title: "Negocio", tabBarIcon: tabIcon(Store) }} />
      <Tabs.Screen name="publicar-vacante" options={{ href: null }} />
    </Tabs>
  );
}
