import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center rounded-3xl border-2 border-dashed border-navy-100 bg-white px-6 py-10">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-turquoise-50">
        <Icon size={30} color={colors.turquoise600} />
      </View>
      <Text className="text-center text-lg font-bold text-navy">{title}</Text>
      {description && (
        <Text className="mt-1 text-center text-sm leading-5 text-ink-muted">{description}</Text>
      )}
      {actionLabel && onAction && (
        <View className="mt-5 w-full max-w-[240px]">
          <Button title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
