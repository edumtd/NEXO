import { GraduationCap, Store, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import type { Role } from "@/types";

const options: { value: Role; label: string; description: string; icon: LucideIcon }[] = [
  { value: "estudiante", label: "Estudiante", description: "Busco empleo de medio tiempo", icon: GraduationCap },
  { value: "negocio", label: "Negocio", description: "Quiero cubrir turnos", icon: Store },
];

export function RoleSelector({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <View className="flex-row gap-3" accessibilityRole="radiogroup">
      {options.map(({ value: v, label, description, icon: Icon }) => {
        const selected = value === v;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`flex-1 rounded-3xl border-2 p-4 ${
              selected ? "border-coral bg-coral-50" : "border-navy-100 bg-white active:bg-navy-50"
            }`}
          >
            <View
              className={`mb-3 h-11 w-11 items-center justify-center rounded-2xl ${
                selected ? "bg-coral" : "bg-navy-50"
              }`}
            >
              <Icon size={22} color={selected ? colors.white : colors.navy} />
            </View>
            <Text className="text-base font-extrabold text-navy">{label}</Text>
            <Text className="mt-0.5 text-xs leading-4 text-ink-muted">{description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
