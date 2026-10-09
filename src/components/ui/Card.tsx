import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
}

const base = "rounded-3xl border border-navy-50 bg-white p-4 shadow-sm shadow-navy/10";

export function Card({ children, onPress, className = "", accessibilityLabel }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={`${base} active:opacity-90 ${className}`}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={`${base} ${className}`}>{children}</View>;
}
