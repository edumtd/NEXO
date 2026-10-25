import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";

import { colors } from "@/theme/colors";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "light";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children" | "onPress"> {
  /** Sin evento: así se puede pasar directo handleSubmit(onSubmit) de React Hook Form. */
  onPress?: () => unknown;
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
}

const containerByVariant: Record<Variant, string> = {
  primary: "bg-coral active:bg-coral-600",
  secondary: "bg-navy active:bg-navy-700",
  outline: "border-2 border-navy-100 bg-white active:bg-navy-50",
  ghost: "bg-transparent active:bg-navy-50",
  danger: "border-2 border-red-200 bg-white active:bg-red-50",
  light: "bg-white/15 border border-white/30 active:bg-white/25",
};

const textByVariant: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-white",
  outline: "text-navy",
  ghost: "text-navy",
  danger: "text-red-600",
  light: "text-white",
};

const iconColorByVariant: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.white,
  outline: colors.navy,
  ghost: colors.navy,
  danger: colors.danger,
  light: colors.white,
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3 rounded-xl",
  md: "h-12 px-5 rounded-2xl",
  lg: "h-14 px-6 rounded-2xl",
};

const textSize: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  fullWidth = true,
  disabled,
  className = "",
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${sizeClass[size]} ${containerByVariant[variant]} ${
        fullWidth ? "w-full" : "self-start"
      } ${isDisabled ? "opacity-50" : ""} ${className}`}
      onPress={onPress ? () => void onPress() : undefined}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={iconColorByVariant[variant]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icon && <Icon size={size === "sm" ? 16 : 20} color={iconColorByVariant[variant]} />}
          <Text className={`font-bold ${textSize[size]} ${textByVariant[variant]}`}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
