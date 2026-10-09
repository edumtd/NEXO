import { Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Input } from "@/components/ui";
import { colors } from "@/theme/colors";

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  error?: string;
}

export function TagInput({ label, value, onChange, placeholder, suggestions = [], error }: TagInputProps) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim();
    if (tag && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setText("");
  };
  const pending = suggestions.filter((s) => !value.includes(s));

  return (
    <View>
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Input
            label={label}
            placeholder={placeholder}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => add(text)}
            returnKeyType="done"
            error={error}
          />
        </View>
        <Pressable
          onPress={() => add(text)}
          accessibilityRole="button"
          accessibilityLabel={`Agregar ${label}`}
          className={`h-12 w-12 items-center justify-center rounded-2xl bg-navy active:bg-navy-700 ${error ? "mb-5" : ""}`}
        >
          <Plus size={20} color={colors.white} />
        </Pressable>
      </View>
      {value.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {value.map((t) => (
            <Pressable
              key={t}
              onPress={() => onChange(value.filter((x) => x !== t))}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${t}`}
              className="flex-row items-center gap-1 rounded-full bg-navy py-1.5 pl-3 pr-2"
            >
              <Text className="text-xs font-semibold text-white">{t}</Text>
              <X size={14} color={colors.white} />
            </Pressable>
          ))}
        </View>
      )}
      {pending.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {pending.map((s) => (
            <Pressable
              key={s}
              onPress={() => add(s)}
              accessibilityRole="button"
              className="rounded-full border border-dashed border-navy-100 px-3 py-1.5 active:bg-navy-50"
            >
              <Text className="text-xs font-semibold text-ink-muted">+ {s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
