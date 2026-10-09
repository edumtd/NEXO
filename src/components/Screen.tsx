import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

interface ScreenProps {
  title?: string;
  /** Texto pequeño sobre el título (p. ej. "Modo Negocio"). */
  eyebrow?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  /** Contenido adicional dentro de la cabecera azul. */
  header?: ReactNode;
  /** Barra fija inferior (p. ej. botón "Postularme"). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Plantilla base: cabecera azul marino y hoja blanca redondeada que se superpone,
 * igual que en el diseño de referencia.
 */
export function Screen({ title, eyebrow, subtitle, back, right, header, footer, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-navy"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pb-12" style={{ paddingTop: insets.top + 12 }}>
          {(back || right) && (
            <View className="mb-3 flex-row items-center justify-between">
              {back ? (
                <Pressable
                  onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                  accessibilityRole="button"
                  accessibilityLabel="Regresar"
                  hitSlop={12}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
                >
                  <ChevronLeft size={24} color={colors.white} />
                </Pressable>
              ) : (
                <View />
              )}
              {right}
            </View>
          )}
          {eyebrow && (
            <Text className="text-sm font-semibold uppercase tracking-wider text-turquoise">{eyebrow}</Text>
          )}
          {title && (
            <Text accessibilityRole="header" className="text-3xl font-extrabold text-white">
              {title}
            </Text>
          )}
          {subtitle && <Text className="mt-1 text-base text-navy-100">{subtitle}</Text>}
          {header}
        </View>
        <View className="-mt-7 flex-1 rounded-t-[32px] bg-surface px-5 pb-10 pt-6">
          <View className="w-full max-w-[720px] self-center">{children}</View>
        </View>
      </ScrollView>
      {footer && (
        <View
          className="border-t border-navy-50 bg-white px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="w-full max-w-[720px] self-center">{footer}</View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text accessibilityRole="header" className="text-xl font-extrabold text-navy">
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link">
          <Text className="text-base font-bold text-coral">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
