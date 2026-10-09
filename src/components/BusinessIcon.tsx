import {
  BookOpen,
  Coffee,
  PartyPopper,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import { View } from "react-native";

import type { BusinessCategory } from "@/types";

const config: Record<BusinessCategory, { icon: LucideIcon; bg: string; color: string }> = {
  cafeteria: { icon: Coffee, bg: "bg-amber-50", color: "#B45309" },
  restaurante: { icon: UtensilsCrossed, bg: "bg-coral-50", color: "#E0551F" },
  comercio: { icon: ShoppingBag, bg: "bg-navy-50", color: "#14306A" },
  eventos: { icon: PartyPopper, bg: "bg-purple-50", color: "#7C3AED" },
  libreria: { icon: BookOpen, bg: "bg-turquoise-50", color: "#0D9488" },
};

export function BusinessIcon({ category, size = "md" }: { category: BusinessCategory; size?: "md" | "lg" }) {
  const { icon: Icon, bg, color } = config[category];
  const box = size === "lg" ? "h-16 w-16 rounded-3xl" : "h-14 w-14 rounded-2xl";
  return (
    <View className={`items-center justify-center ${box} ${bg}`}>
      <Icon size={size === "lg" ? 30 : 26} color={color} />
    </View>
  );
}
