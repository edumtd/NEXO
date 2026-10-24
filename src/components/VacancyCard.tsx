import { Bookmark, CircleDollarSign, Clock, MapPin } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { CompatibilityBadge } from "@/components/StatusBadges";
import { Badge, Card } from "@/components/ui";
import type { CompatibilityLevel } from "@/lib/compatibility";
import { formatDays, formatRange, formatSalary } from "@/lib/format";
import { colors } from "@/theme/colors";
import type { BusinessProfile, Vacancy } from "@/types";

interface VacancyCardProps {
  vacancy: Vacancy;
  business?: BusinessProfile;
  compatibility?: CompatibilityLevel;
  onPress?: () => void;
  className?: string;
  /** Límite semanal del estudiante; si se pasa, se muestra el aviso "Supera tu límite semanal". */
  exceedsLimitOf?: number;
  /** Si se define, se muestra el botón de guardar. */
  saved?: boolean;
  onToggleSave?: () => void;
  /** Vacante pausada o cerrada (solo en Guardadas). */
  unavailable?: boolean;
}

export function VacancyCard({
  vacancy,
  business,
  compatibility,
  onPress,
  className = "",
  exceedsLimitOf,
  saved,
  onToggleSave,
  unavailable = false,
}: VacancyCardProps) {
  const canSave = onToggleSave !== undefined;
  return (
    // El botón de guardar es hermano del Card presionable (no hijo) para no anidar <button> en web.
    <View className={`relative ${className}`}>
      <Card onPress={unavailable ? undefined : onPress} accessibilityLabel={`Vacante ${vacancy.title}`}>
        <View className={`flex-row gap-3 ${canSave ? "pr-10" : ""} ${unavailable ? "opacity-60" : ""}`}>
          <BusinessIcon category={business?.category ?? "comercio"} />
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
              {vacancy.title}
            </Text>
            <Text className="text-sm text-ink-muted" numberOfLines={1}>
              {business?.name ?? "Negocio"}
            </Text>
          </View>
        </View>

        <View className={`mt-3 flex-row flex-wrap gap-x-4 gap-y-1.5 ${unavailable ? "opacity-60" : ""}`}>
          <Meta icon={CircleDollarSign} text={formatSalary(vacancy.salary, vacancy.salaryPeriod)} strong />
          <Meta icon={MapPin} text={vacancy.zone} />
          <Meta icon={Clock} text={`${formatDays(vacancy.days)} · ${formatRange(vacancy.start, vacancy.end)}`} />
        </View>

        {unavailable ? (
          <View className="mt-3">
            <Badge label="No disponible" tone="neutral" />
          </View>
        ) : compatibility || exceedsLimitOf ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {compatibility && <CompatibilityBadge level={compatibility} />}
            {exceedsLimitOf ? <LimitBadge hours={exceedsLimitOf} /> : null}
          </View>
        ) : null}
      </Card>

      {canSave && (
        <Pressable
          onPress={onToggleSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Quitar ${vacancy.title} de guardadas` : `Guardar ${vacancy.title}`}
          accessibilityState={{ selected: !!saved }}
          hitSlop={8}
          className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white active:bg-navy-50"
        >
          <Bookmark size={20} color={saved ? colors.coral : colors.muted} fill={saved ? colors.coral : "none"} />
        </Pressable>
      )}
    </View>
  );
}

export function LimitBadge({ hours }: { hours: number }) {
  return <Badge label={`Supera tu límite semanal (${hours} h)`} tone="warning" />;
}

function Meta({ icon: Icon, text, strong }: { icon: typeof Clock; text: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center gap-1">
      <Icon size={15} color={colors.muted} />
      <Text className={`text-sm ${strong ? "font-bold text-ink" : "text-ink-muted"}`}>{text}</Text>
    </View>
  );
}
