import { Link, router, usePathname } from "expo-router";
import { LogOut } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Logo } from "@/components/Logo";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import { SIDEBAR_WIDTH, type NavLink } from "@/theme/navigation";

interface SideNavProps {
  links: NavLink[];
  /** Nombre del usuario o del negocio. */
  title: string;
  /** Rol visible, p. ej. "Estudiante activo" o "Negocio". */
  subtitle: string;
  /** Contadores opcionales por nombre de enlace (p. ej. { notificaciones: 3 }). */
  counts?: Record<string, number>;
}

function isActive(pathname: string, link: NavLink): boolean {
  const href = String(link.href);
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (link.match ?? []).some((m) => pathname.startsWith(m))
  );
}

/** Barra lateral para web en pantallas anchas. Muestra todas las opciones del rol. */
export function SideNav({ links, title, subtitle, counts = {} }: SideNavProps) {
  const pathname = usePathname();
  const { logout } = useApp();

  return (
    <View className="h-full bg-navy" style={{ width: SIDEBAR_WIDTH }} role="navigation" aria-label="Navegación principal">
      <ScrollView contentContainerClassName="flex-grow px-4 py-6">
        <View className="px-3">
          <Logo size="md" />
          <Text className="mt-4 text-base font-bold text-white" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-sm text-navy-100" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View className="mt-8 gap-1">
          {links.map((link) => {
            const active = isActive(pathname, link);
            const Icon = link.icon;
            const count = counts[link.name] ?? 0;
            return (
              <Link key={link.name} href={link.href} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={count > 0 ? `${link.label}, ${count} pendientes` : link.label}
                  accessibilityState={{ selected: active }}
                  aria-current={active ? "page" : undefined}
                  className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 ${
                    active ? "bg-coral" : "hover:bg-white/10 active:bg-white/15"
                  }`}
                >
                  <Icon size={20} color={colors.white} strokeWidth={active ? 2.5 : 2} />
                  <Text className={`flex-1 text-base text-white ${active ? "font-bold" : "font-medium"}`}>{link.label}</Text>
                  {count > 0 && (
                    <View className={`min-w-[22px] items-center rounded-full px-1.5 py-0.5 ${active ? "bg-white" : "bg-coral"}`}>
                      <Text className={`text-xs font-bold ${active ? "text-coral" : "text-white"}`}>
                        {count > 99 ? "99+" : count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </Link>
            );
          })}
        </View>

        <View className="flex-1" />

        <Pressable
          onPress={() => {
            logout();
            router.replace("/");
          }}
          accessibilityRole="button"
          className="mt-8 flex-row items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/10 active:bg-white/15"
        >
          <LogOut size={20} color={colors.navy100} />
          <Text className="text-base font-medium text-navy-100">Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
