import type { LucideIcon } from "lucide-react-native";
import { forwardRef, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "@/theme/colors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon: Icon, multiline, containerClassName = "", onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const border = error ? "border-red-400" : focused ? "border-turquoise" : "border-navy-100";

  return (
    <View className={`w-full ${containerClassName}`}>
      {label && <Text className="mb-1.5 text-sm font-semibold text-navy">{label}</Text>}
      <View
        className={`flex-row rounded-2xl border-2 bg-white px-4 ${border} ${
          multiline ? "min-h-[110px] items-start py-3" : "h-12 items-center"
        }`}
      >
        {Icon && (
          <View className={multiline ? "mr-2 pt-0.5" : "mr-2"}>
            <Icon size={18} color={focused ? colors.turquoise600 : colors.soft} />
          </View>
        )}
        <TextInput
          ref={ref}
          multiline={multiline}
          placeholderTextColor={colors.soft}
          textAlignVertical={multiline ? "top" : "center"}
          accessibilityLabel={label}
          className="flex-1 text-base text-ink"
          style={{ outlineStyle: "none" } as object}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error ? (
        <Text className="mt-1 text-xs font-medium text-red-600">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-ink-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
