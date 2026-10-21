import { CircleDollarSign, Laptop, MapPin, Tag } from "lucide-react-native";
import { Text, View } from "react-native";

import { AcademicStatusBadge } from "@/components/StatusBadges";
import { Avatar, Card } from "@/components/ui";
import { RATE_PERIOD_LABELS, SERVICE_CATEGORY_LABELS, SERVICE_MODALITY_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { colors } from "@/theme/colors";
import type { PublicStudent, ServiceOffer } from "@/types";

export function formatRate(offer: Pick<ServiceOffer, "rate" | "ratePeriod">): string {
  return `${formatMoney(offer.rate)} / ${RATE_PERIOD_LABELS[offer.ratePeriod]}`;
}

export function formatModality(offer: Pick<ServiceOffer, "modality" | "zone">): string {
  return offer.modality === "remoto"
    ? SERVICE_MODALITY_LABELS.remoto
    : `${SERVICE_MODALITY_LABELS[offer.modality]} · ${offer.zone}`;
}

interface ServiceCardProps {
  offer: ServiceOffer;
  student: PublicStudent;
  onPress?: () => void;
}

export function ServiceCard({ offer, student, onPress }: ServiceCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={`Servicio ${offer.title} de ${student.fullName}`}>
      <View className="flex-row items-center gap-3">
        <Avatar name={student.fullName} />
        <View className="flex-1">
          <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
            {student.fullName}
          </Text>
          <Text className="text-sm text-ink-muted" numberOfLines={1}>
            {student.career}
          </Text>
        </View>
        <AcademicStatusBadge status={student.academicStatus} />
      </View>

      <Text className="mt-3 text-lg font-extrabold leading-6 text-navy">{offer.title}</Text>

      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1.5">
        <Meta icon={Tag} text={SERVICE_CATEGORY_LABELS[offer.category]} />
        <Meta icon={offer.modality === "remoto" ? Laptop : MapPin} text={formatModality(offer)} />
        <Meta icon={CircleDollarSign} text={formatRate(offer)} strong />
      </View>
    </Card>
  );
}

function Meta({ icon: Icon, text, strong }: { icon: typeof Tag; text: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center gap-1">
      <Icon size={15} color={colors.muted} />
      <Text className={`text-sm ${strong ? "font-bold text-ink" : "text-ink-muted"}`}>{text}</Text>
    </View>
  );
}
