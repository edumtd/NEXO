import { Minus, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { DAYS } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { colors } from "@/theme/colors";
import type { DayIndex } from "@/types";

interface DayPickerProps {
  value: DayIndex[];
  onChange: (days: DayIndex[]) => void;
}

/** Selector de días estilo calendario (Lun–Dom). */
export function DayPicker({ value, onChange }: DayPickerProps) {
  const toggle = (d: DayIndex) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => a - b));
  return (
    <View className="flex-row justify-between gap-1.5">
      {DAYS.map((d) => {
        const selected = value.includes(d.value);
        return (
          <Pressable
            key={d.value}
            onPress={() => toggle(d.value)}
            accessibilityRole="checkbox"
            accessibilityLabel={d.long}
            accessibilityState={{ checked: selected }}
            className={`h-12 flex-1 items-center justify-center rounded-xl ${
              selected ? "bg-navy" : "bg-navy-50 active:bg-navy-100"
            }`}
          >
            <Text className={`text-xs font-bold ${selected ? "text-white" : "text-navy"}`}>{d.short}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface TimeStepperProps {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/** Selector de hora con pasos de 30 min; funciona igual en Android, iOS y web. */
export function TimeStepper({ label, value, onChange, min = 6 * 60, max = 24 * 60, step = 30 }: TimeStepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-sm font-semibold text-navy">{label}</Text>
      <View className="h-12 flex-row items-center justify-between rounded-2xl border-2 border-navy-100 bg-white px-1">
        <StepButton icon="minus" onPress={dec} label={`Restar 30 minutos a ${label}`} disabled={value <= min} />
        <Text className="text-lg font-bold text-ink" accessibilityLabel={`${label} ${formatTime(value)}`}>
          {value >= 24 * 60 ? "24:00" : formatTime(value)}
        </Text>
        <StepButton icon="plus" onPress={inc} label={`Sumar 30 minutos a ${label}`} disabled={value >= max} />
      </View>
    </View>
  );
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 50,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-sm font-semibold text-navy">{label}</Text>
      <View className="h-12 flex-row items-center justify-between rounded-2xl border-2 border-navy-100 bg-white px-1">
        <StepButton icon="minus" onPress={() => onChange(Math.max(min, value - 1))} label="Restar" disabled={value <= min} />
        <Text className="text-lg font-bold text-ink">{value}</Text>
        <StepButton icon="plus" onPress={() => onChange(Math.min(max, value + 1))} label="Sumar" disabled={value >= max} />
      </View>
    </View>
  );
}

function StepButton({
  icon,
  onPress,
  label,
  disabled,
}: {
  icon: "minus" | "plus";
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  const Icon = icon === "minus" ? Minus : Plus;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={`h-9 w-9 items-center justify-center rounded-xl bg-navy-50 active:bg-navy-100 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Icon size={18} color={colors.navy} />
    </Pressable>
  );
}
