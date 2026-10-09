import type { LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";

export function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon size={24} color={color as string} strokeWidth={focused ? 2.5 : 2} />;
  };
}
