import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "@/theme/colors";

export function LoadingState({ message = "Cargando…" }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface p-8" accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.turquoise} />
      <Text className="mt-3 text-sm font-medium text-ink-muted">{message}</Text>
    </View>
  );
}
