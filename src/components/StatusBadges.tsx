import { CircleCheck, CircleDashed, CircleSlash, GraduationCap } from "lucide-react-native";

import { Badge, type BadgeTone } from "@/components/ui";
import {
  ACADEMIC_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  SERVICE_OFFER_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_LABELS,
  VACANCY_STATUS_LABELS,
} from "@/lib/constants";
import { COMPATIBILITY_LABELS, type CompatibilityLevel } from "@/lib/compatibility";
import type {
  AcademicStatus,
  ApplicationStatus,
  ReportStatus,
  ServiceOfferStatus,
  ServiceRequestStatus,
  VacancyStatus,
} from "@/types";

export function AcademicStatusBadge({ status }: { status: AcademicStatus }) {
  return (
    <Badge
      label={ACADEMIC_STATUS_LABELS[status]}
      tone={status === "egresado" ? "coral" : "info"}
      icon={GraduationCap}
    />
  );
}

const requestTone: Record<ServiceRequestStatus, BadgeTone> = {
  enviada: "neutral",
  aceptada: "info",
  en_proceso: "coral",
  entregada: "warning",
  completada: "success",
  rechazada: "danger",
  cancelada: "danger",
};

export function ServiceRequestStatusBadge({ status }: { status: ServiceRequestStatus }) {
  return <Badge label={SERVICE_REQUEST_STATUS_LABELS[status]} tone={requestTone[status]} />;
}

export function ServiceOfferStatusBadge({ status }: { status: ServiceOfferStatus }) {
  return (
    <Badge label={SERVICE_OFFER_STATUS_LABELS[status]} tone={status === "activo" ? "success" : "warning"} />
  );
}

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

const reportTone: Record<ReportStatus, BadgeTone> = {
  nuevo: "coral",
  en_revision: "warning",
  resuelto: "success",
  descartado: "neutral",
};

/** Estado de un reporte (solo en el panel de administración). */
export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge label={REPORT_STATUS_LABELS[status]} tone={reportTone[status]} />;
}
