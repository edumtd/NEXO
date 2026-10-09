import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { colors } from "@/theme/colors";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "coral";

const toneClass: Record<BadgeTone, { box: string; text: string; icon: string }> = {
  success: { box: "bg-turquoise-50", text: "text-turquoise-700", icon: colors.turquoise600 },
  warning: { box: "bg-amber-50", text: "text-amber-700", icon: colors.amber },
  danger: { box: "bg-red-50", text: "text-red-700", icon: colors.danger },
  info: { box: "bg-navy-50", text: "text-navy", icon: colors.navy },
  neutral: { box: "bg-gray-100", text: "text-gray-600", icon: colors.muted },
  coral: { box: "bg-coral-50", text: "text-coral-600", icon: colors.coral },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
}

export function Badge({ label, tone = "neutral", icon: Icon, className = "" }: BadgeProps) {
  const t = toneClass[tone];
  return (
    <View className={`flex-row items-center self-start rounded-full px-3 py-1 ${t.box} ${className}`}>
      {Icon && (
        <View className="mr-1">
          <Icon size={13} color={t.icon} />
        </View>
      )}
      <Text className={`text-xs font-bold ${t.text}`}>{label}</Text>
    </View>
  );
}
