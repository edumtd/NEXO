import { Text } from "react-native";

export function Logo({ size = "lg", light = true }: { size?: "md" | "lg"; light?: boolean }) {
  return (
    <Text
      accessibilityLabel="NEXO"
      className={`font-black tracking-tight ${size === "lg" ? "text-5xl" : "text-3xl"} ${
        light ? "text-white" : "text-navy"
      }`}
    >
      NEX<Text className="text-coral">O</Text>
    </Text>
  );
}
