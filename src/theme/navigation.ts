import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "./colors";

type TabsScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>,
  (...args: never[]) => unknown
>;

/** Barra inferior con altura explícita para que ícono y etiqueta quepan en todas las plataformas. */
export function useTabBarOptions(): TabsScreenOptions {
  const { bottom } = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.coral,
    tabBarInactiveTintColor: colors.navy,
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
    tabBarStyle: {
      backgroundColor: colors.white,
      borderTopColor: colors.border,
      height: 64 + bottom,
      paddingTop: 6,
      paddingBottom: Math.max(bottom, 8),
    },
    sceneStyle: { backgroundColor: colors.surface },
  };
}
