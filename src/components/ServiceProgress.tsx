import { CalendarClock } from "lucide-react-native";
import { Text, View } from "react-native";

import { Badge } from "@/components/ui";
import { SERVICE_REQUEST_STATUS_LABELS } from "@/lib/constants";
import { formatDate, todayISO } from "@/lib/format";
import { colors } from "@/theme/colors";
import type { ServiceRequest, ServiceRequestStatus } from "@/types";

const STEPS: ServiceRequestStatus[] = ["enviada", "aceptada", "en_proceso", "entregada", "completada"];

/** true si ya pasó la fecha estimada y el trabajo todavía no se entrega. */
export function isLate(request: ServiceRequest): boolean {
  return (
    !!request.estimatedDate &&
    (request.status === "aceptada" || request.status === "en_proceso") &&
    todayISO() > request.estimatedDate
  );
}

interface ServiceProgressProps {
  request: ServiceRequest;
  /** Versión compacta para tarjetas: sin la fila de fecha estimada. */
  compact?: boolean;
}

/** Barra de etapas: Enviada → Aceptada → En proceso → Entregada → Finalizada. */
export function ServiceProgress({ request, compact = false }: ServiceProgressProps) {
  const stopped = request.status === "rechazada" || request.status === "cancelada";
  // Al detenerse, se marcan como alcanzadas las etapas previas y la siguiente se pinta en rojo.
  const reached = stopped
    ? request.status === "cancelada" && request.estimatedDate
      ? 2
      : 1
    : STEPS.indexOf(request.status) + 1;
  const steps = stopped ? [...STEPS.slice(0, reached), request.status] : STEPS;
  const late = isLate(request);

  return (
    <View accessibilityLabel={`Estado: ${SERVICE_REQUEST_STATUS_LABELS[request.status]}`}>
      <View className="flex-row gap-1.5">
        {steps.map((step, i) => {
          const isStopStep = stopped && i === steps.length - 1;
          const done = i < reached;
          const current = !stopped && i === reached - 1;
          const bar = isStopStep ? "bg-red-400" : done ? (current ? "bg-coral" : "bg-turquoise") : "bg-navy-50";
          const text = isStopStep
            ? "font-bold text-red-600"
            : current
              ? "font-bold text-coral-600"
              : done
                ? "font-semibold text-navy"
                : "text-ink-soft";
          return (
            <View key={step} className="flex-1">
              <View className={`${compact ? "h-1.5" : "h-2"} rounded-full ${bar}`} />
              <Text className={`mt-1 ${compact ? "text-[10px]" : "text-[11px]"} ${text}`} numberOfLines={1}>
                {SERVICE_REQUEST_STATUS_LABELS[step]}
              </Text>
            </View>
          );
        })}
      </View>

      {!compact && request.estimatedDate && !stopped && (
        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <CalendarClock size={16} color={late ? colors.danger : colors.muted} />
          <Text className={`text-sm ${late ? "font-bold text-red-600" : "text-ink-muted"}`}>
            Entrega estimada: {formatDate(request.estimatedDate)}
          </Text>
          {late && <Badge label="Atrasado" tone="danger" />}
        </View>
      )}
      {compact && late && (
        <View className="mt-2">
          <Badge label="Atrasado" tone="danger" />
        </View>
      )}
    </View>
  );
}
