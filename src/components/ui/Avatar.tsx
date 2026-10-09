import { Text, View } from "react-native";

import { initials } from "@/lib/format";

const palettes = [
  "bg-turquoise-100 text-turquoise-700",
  "bg-coral-100 text-coral-600",
  "bg-navy-100 text-navy",
  "bg-amber-100 text-amber-700",
];

const sizes = {
  sm: { box: "h-10 w-10", text: "text-sm" },
  md: { box: "h-12 w-12", text: "text-base" },
  lg: { box: "h-16 w-16", text: "text-xl" },
  xl: { box: "h-24 w-24", text: "text-3xl" },
};

interface AvatarProps {
  name: string;
  size?: keyof typeof sizes;
  ring?: boolean;
}

/** Avatar con iniciales. No se usan fotografías para evitar sesgos por apariencia. */
export function Avatar({ name, size = "md", ring = false }: AvatarProps) {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const [bg, fg] = palettes[hash % palettes.length].split(" ");
  return (
    <View
      className={`items-center justify-center rounded-full ${sizes[size].box} ${bg} ${
        ring ? "border-[3px] border-white" : ""
      }`}
      accessibilityLabel={`Avatar de ${name}`}
    >
      <Text className={`font-extrabold ${sizes[size].text} ${fg}`}>{initials(name) || "?"}</Text>
    </View>
  );
}
