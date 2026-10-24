import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ErrorBanner";
import { AppProvider } from "@/store/AppStore";
import { colors } from "@/theme/colors";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.surface },
            animation: "slide_from_right",
          }}
        />
        <ErrorBanner />
      </AppProvider>
    </SafeAreaProvider>
  );
}
