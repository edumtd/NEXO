import type { Href, Tabs } from "expo-router";
import {
  BadgeCheck,
  Bell,
  Briefcase,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Home,
  LayoutDashboard,
  CirclePlus,
  Flag,
  ScrollText,
  Search,
  Sparkles,
  Store,
  User,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import type { ComponentProps } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "./colors";
import type { SessionRole } from "@/types";

type TabsScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>,
  (...args: never[]) => unknown
>;

export interface NavLink {
  /** Nombre de la ruta dentro del grupo de pestañas (archivo en src/app/<rol>/). */
  name: string;
  href: Href;
  /** Etiqueta en la barra lateral. */
  label: string;
  /** Etiqueta corta para la barra inferior; por defecto `label`. */
  tabLabel?: string;
  icon: LucideIcon;
  /** Si aparece en la barra inferior móvil. La barra lateral muestra todos. */
  inTabBar: boolean;
  /** Rutas adicionales que marcan este enlace como activo (p. ej. pantallas de detalle). */
  match?: string[];
}

// Fuente única de la navegación: la barra inferior y la lateral se generan de estas listas.
export const STUDENT_LINKS: NavLink[] = [
  { name: "inicio", href: "/estudiante/inicio", label: "Inicio", icon: Home, inTabBar: true },
  {
    name: "vacantes",
    href: "/estudiante/vacantes",
    label: "Buscar vacantes",
    tabLabel: "Buscar",
    icon: Search,
    inTabBar: true,
    match: ["/estudiante/vacante/"],
  },
  {
    name: "postulaciones",
    href: "/estudiante/postulaciones",
    label: "Mis postulaciones",
    tabLabel: "Postulaciones",
    icon: ClipboardList,
    inTabBar: true,
  },
  {
    name: "servicios",
    href: "/estudiante/servicios",
    label: "Mis servicios",
    tabLabel: "Servicios",
    icon: Sparkles,
    inTabBar: true,
    match: ["/estudiante/publicar-servicio", "/estudiante/solicitud/"],
  },
  { name: "disponibilidad", href: "/estudiante/disponibilidad", label: "Disponibilidad", icon: CalendarClock, inTabBar: false },
  { name: "mi-semana", href: "/estudiante/mi-semana", label: "Mi semana", icon: CalendarRange, inTabBar: false },
  { name: "notificaciones", href: "/estudiante/notificaciones", label: "Notificaciones", icon: Bell, inTabBar: false },
  { name: "perfil", href: "/estudiante/perfil", label: "Perfil", icon: User, inTabBar: true },
];

/** Rutas de detalle que no aparecen en ninguna barra. */
export const STUDENT_HIDDEN_ROUTES = ["vacante/[id]", "publicar-servicio", "solicitud/[id]"];

export const BUSINESS_LINKS: NavLink[] = [
  { name: "inicio", href: "/negocio/inicio", label: "Panel", icon: LayoutDashboard, inTabBar: true },
  { name: "vacantes", href: "/negocio/vacantes", label: "Mis vacantes", tabLabel: "Vacantes", icon: Briefcase, inTabBar: true },
  { name: "publicar-vacante", href: "/negocio/publicar-vacante", label: "Publicar vacante", icon: CirclePlus, inTabBar: false },
  {
    name: "talento",
    href: "/negocio/talento",
    label: "Talento",
    icon: Sparkles,
    inTabBar: true,
    match: ["/negocio/talento/"],
  },
  { name: "postulaciones", href: "/negocio/postulaciones", label: "Postulantes", icon: Users, inTabBar: true, match: ["/negocio/solicitud/"] },
  { name: "notificaciones", href: "/negocio/notificaciones", label: "Notificaciones", icon: Bell, inTabBar: false },
  { name: "perfil", href: "/negocio/perfil", label: "Perfil del negocio", tabLabel: "Negocio", icon: Store, inTabBar: true },
];

export const BUSINESS_HIDDEN_ROUTES = ["talento/[id]", "solicitud/[id]"];

/**
 * Oculta el botón de una pestaña sin ocultar la pantalla. No uses `href: null`: desde Expo Router 58
 * marca la pantalla como `hidden` y el router redirige a la primera pestaña al intentar abrirla.
 */
export const HIDDEN_TAB_OPTIONS = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: "none" },
} as const;

/** Panel de administración: solo web ancha. No forma parte de la navegación de estudiantes ni negocios. */
export const ADMIN_LINKS: NavLink[] = [
  { name: "reportes", href: "/admin/reportes", label: "Reportes", icon: Flag, inTabBar: false, match: ["/admin/reporte/"] },
  { name: "verificaciones", href: "/admin/verificaciones", label: "Verificaciones", icon: BadgeCheck, inTabBar: false, match: ["/admin/verificacion/"] },
  { name: "bitacora", href: "/admin/bitacora", label: "Bitácora", icon: ScrollText, inTabBar: false },
];

/** Pantalla de inicio de cada tipo de sesión. */
export function homeFor(role: SessionRole): Href {
  if (role === "admin") return "/admin/reportes";
  return role === "estudiante" ? "/estudiante/inicio" : "/negocio/inicio";
}

export const SIDEBAR_BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 260;

/** true en web con ventana de al menos 768px. Se recalcula al cambiar el tamaño de la ventana. */
export function useIsWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= SIDEBAR_BREAKPOINT;
}

/**
 * Opciones de las pestañas. En web ancha, la barra va a la izquierda (`tabBarPosition: "left"`)
 * y el layout la reemplaza por <SideNav />; en el resto, barra inferior con altura explícita
 * para que ícono y etiqueta quepan en todas las plataformas.
 */
export function useTabBarOptions(): TabsScreenOptions {
  const { bottom } = useSafeAreaInsets();
  const wide = useIsWideWeb();
  return {
    headerShown: false,
    tabBarPosition: wide ? "left" : "bottom",
    tabBarActiveTintColor: colors.coral,
    tabBarInactiveTintColor: colors.navy,
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
    tabBarStyle: wide
      ? undefined
      : {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64 + bottom,
          paddingTop: 6,
          paddingBottom: Math.max(bottom, 8),
        },
    sceneStyle: { backgroundColor: colors.surface },
  };
}
