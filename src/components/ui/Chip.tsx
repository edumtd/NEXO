import { Pressable, Text } from "react-native";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
}

export function Chip({ label, selected = false, onPress, size = "md" }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      className={`rounded-full border-2 ${size === "sm" ? "px-3 py-1" : "px-4 py-2"} ${
        selected ? "border-navy bg-navy" : "border-navy-100 bg-white active:bg-navy-50"
      }`}
    >
      <Text
        className={`${size === "sm" ? "text-xs" : "text-sm"} font-semibold ${
          selected ? "text-white" : "text-navy"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
