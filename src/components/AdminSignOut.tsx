import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { Pressable } from "react-native";

import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import { useIsWideWeb } from "@/theme/navigation";

/**
 * Botón de cerrar sesión para la cabecera del panel en celular o pantallas angostas.
 * En web ancha no se muestra: la barra lateral ya tiene "Cerrar sesión".
 */
export function AdminSignOut() {
  const { logout } = useApp();
  const wide = useIsWideWeb();
  if (wide) return null;
  return (
    <Pressable
      onPress={() => {
        logout();
        router.replace("/");
      }}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      className="h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
    >
      <LogOut size={20} color={colors.white} />
    </Pressable>
  );
}
