import { CircleAlert, X } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";

/** Aviso global con el último error de una acción (guardar, enviar, cambiar estado…). */
export function ErrorBanner() {
  const { lastError, clearError } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!lastError) return;
    const t = setTimeout(clearError, 7000);
    return () => clearTimeout(t);
  }, [lastError, clearError]);

  if (!lastError) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center px-4"
      style={{ bottom: insets.bottom + 80 }}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        className="w-full max-w-[560px] flex-row items-start gap-3 rounded-2xl bg-red-700 p-4 shadow-lg"
      >
        <CircleAlert size={20} color={colors.white} />
        <Text className="flex-1 text-sm leading-5 text-white">{lastError}</Text>
        <Pressable onPress={clearError} accessibilityRole="button" accessibilityLabel="Cerrar aviso" hitSlop={10}>
          <X size={18} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}
