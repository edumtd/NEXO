import { CircleCheck, CircleDashed, CircleSlash } from "lucide-react-native";

import { Badge, type BadgeTone } from "@/components/ui";
import { APPLICATION_STATUS_LABELS, VACANCY_STATUS_LABELS } from "@/lib/constants";
import { COMPATIBILITY_LABELS, type CompatibilityLevel } from "@/lib/compatibility";
import type { ApplicationStatus, VacancyStatus } from "@/types";

const compatibilityTone: Record<CompatibilityLevel, BadgeTone> = {
  compatible: "success",
  parcial: "warning",
  no_compatible: "neutral",
};

const compatibilityIcon = {
  compatible: CircleCheck,
  parcial: CircleDashed,
  no_compatible: CircleSlash,
};

export function CompatibilityBadge({ level }: { level: CompatibilityLevel }) {
  return (
    <Badge
      label={COMPATIBILITY_LABELS[level]}
      tone={compatibilityTone[level]}
      icon={compatibilityIcon[level]}
    />
  );
}

const applicationTone: Record<ApplicationStatus, BadgeTone> = {
  recibida: "info",
  entrevista: "warning",
  aceptada: "success",
  rechazada: "danger",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge label={APPLICATION_STATUS_LABELS[status]} tone={applicationTone[status]} />;
}

const vacancyTone: Record<VacancyStatus, BadgeTone> = {
  activa: "success",
  pausada: "warning",
  cerrada: "neutral",
};

export function VacancyStatusBadge({ status }: { status: VacancyStatus }) {
  return <Badge label={VACANCY_STATUS_LABELS[status]} tone={vacancyTone[status]} />;
}
