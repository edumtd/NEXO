import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  error?: string;
}

export function Checkbox({ checked, onChange, label, error }: CheckboxProps) {
  return (
    <View>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        className="flex-row items-start gap-3"
      >
        <View
          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-lg border-2 ${
            checked ? "border-turquoise bg-turquoise" : error ? "border-red-400 bg-white" : "border-navy-100 bg-white"
          }`}
        >
          {checked && <Check size={16} color={colors.white} strokeWidth={3} />}
        </View>
        <Text className="flex-1 text-sm leading-5 text-ink">{label}</Text>
      </Pressable>
      {error && <Text className="ml-9 mt-1 text-xs font-medium text-red-600">{error}</Text>}
    </View>
  );
}
