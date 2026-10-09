import { CircleDollarSign, Clock, MapPin } from "lucide-react-native";
import { Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { CompatibilityBadge } from "@/components/StatusBadges";
import { Card } from "@/components/ui";
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
}

export function VacancyCard({ vacancy, business, compatibility, onPress, className = "" }: VacancyCardProps) {
  return (
    <Card onPress={onPress} className={className} accessibilityLabel={`Vacante ${vacancy.title}`}>
      <View className="flex-row gap-3">
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

      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1.5">
        <Meta icon={CircleDollarSign} text={formatSalary(vacancy.salary, vacancy.salaryPeriod)} strong />
        <Meta icon={MapPin} text={vacancy.zone} />
        <Meta icon={Clock} text={`${formatDays(vacancy.days)} · ${formatRange(vacancy.start, vacancy.end)}`} />
      </View>

      {compatibility && (
        <View className="mt-3">
          <CompatibilityBadge level={compatibility} />
        </View>
      )}
    </Card>
  );
}

function Meta({ icon: Icon, text, strong }: { icon: typeof Clock; text: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center gap-1">
      <Icon size={15} color={colors.muted} />
      <Text className={`text-sm ${strong ? "font-bold text-ink" : "text-ink-muted"}`}>{text}</Text>
    </View>
  );
}
