import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { BadgeX, CircleOff, Flag, PauseCircle, Save } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { Screen, SectionTitle } from "@/components/Screen";
import { ReportStatusBadge, VacancyStatusBadge } from "@/components/StatusBadges";
import { Badge, Button, Card, Chip, EmptyState, Input } from "@/components/ui";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_TARGET_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { adminReasonSchema, adminReviewSchema, type AdminReasonValues, type AdminReviewValues } from "@/lib/schemas";
import { useAdmin, useApp } from "@/store/AppStore";
import type { AdminReport, ReportStatus } from "@/types";

/** Detalle de un reporte: revisión (estado y nota interna) y acciones de moderación. */
export default function AdminReporte() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reports } = useAdmin();
  const report = reports.find((r) => r.id === id);

  if (!report) {
    return (
      <Screen back title="Reporte">
        <EmptyState
          icon={Flag}
          title="No encontramos este reporte"
          actionLabel="Volver a la bandeja"
          onAction={() => router.replace("/admin/reportes")}
        />
      </Screen>
    );
  }

  return (
    <Screen back title={REPORT_REASON_LABELS[report.reason]} subtitle={`Reporte del ${formatDate(report.createdAt)}`}>
      <Card>
        <View className="flex-row flex-wrap items-center gap-2">
          <ReportStatusBadge status={report.status} />
          <Badge label={REPORT_TARGET_LABELS[report.targetType]} tone="info" />
        </View>
        <Text className="mt-3 text-sm font-bold text-navy">Descripción de quien reporta</Text>
        <Text className="mt-1 text-base leading-6 text-ink">{report.description}</Text>
        {report.reviewedAt ? <Text className="mt-3 text-xs text-ink-soft">Última revisión: {formatDate(report.reviewedAt)}</Text> : null}
      </Card>

      <SectionTitle title="Lo reportado" />
      <Card>
        <Row label={REPORT_TARGET_LABELS[report.targetType]}>
          <Text className="text-base font-bold text-ink">{report.targetTitle ?? "Ya no existe"}</Text>
        </Row>
        {report.targetType === "vacante" && report.targetStatus ? (
          <Row label="Estado">
            <VacancyStatusBadge status={report.targetStatus} />
          </Row>
        ) : null}
        {report.ownerName ? (
          <Row label="Negocio">
            <Text className="text-base text-ink">{report.ownerName}</Text>
          </Row>
        ) : null}
        <Row label="Verificación">
          <Text className="text-base text-ink">{report.ownerVerified ? "Verificado" : "Sin verificar"}</Text>
        </Row>
        <Row label="Reportes de este objetivo">
          <Text className="text-base font-bold text-ink">{report.targetReportCount}</Text>
        </Row>
      </Card>

      <SectionTitle title="Revisión" />
      <ReviewForm report={report} />

      <SectionTitle title="Acciones de moderación" />
      <ModerationActions report={report} />
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-navy-50 py-2.5 last:border-b-0">
      <Text className="text-sm text-ink-muted">{label}</Text>
      <View className="flex-shrink items-end">{children}</View>
    </View>
  );
}

/** Estado del reporte y nota interna. Al cerrarlo, el reportante recibe un aviso genérico. */
function ReviewForm({ report }: { report: AdminReport }) {
  const { adminUpdateReport } = useApp();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AdminReviewValues>({
    resolver: zodResolver(adminReviewSchema),
    defaultValues: { status: report.status, note: report.adminNote ?? "" },
  });
  const status = watch("status");
  const closing = (status === "resuelto" || status === "descartado") && report.status !== status;

  return (
    <Card>
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(REPORT_STATUS_LABELS) as ReportStatus[]).map((s) => (
              <Chip key={s} size="sm" label={REPORT_STATUS_LABELS[s]} selected={field.value === s} onPress={() => field.onChange(s)} />
            ))}
          </View>
        )}
      />
      <View className="mt-4">
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <Input
              label="Nota interna"
              multiline
              placeholder="Qué revisaste y qué decidiste. Solo la ve administración."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.note?.message}
            />
          )}
        />
      </View>
      {closing ? (
        <Text className="mt-2 text-xs text-ink-muted">
          Quien reportó recibirá: "Revisamos tu reporte. Gracias por ayudar a mantener NEXO seguro." Sin detalles.
        </Text>
      ) : null}
      <View className="mt-4">
        <Button
          title="Guardar revisión"
          icon={Save}
          disabled={!isDirty}
          loading={isSubmitting}
          onPress={handleSubmit(async (v) => {
            await adminUpdateReport(report.id, v.status, v.note);
          })}
        />
      </View>
    </Card>
  );
}

/** Acciones sobre lo reportado. El dueño recibe una notificación con el motivo. */
function ModerationActions({ report }: { report: AdminReport }) {
  const { adminSetVacancyStatus, adminRevokeVerification } = useApp();
  const [pending, setPending] = useState<"pausar" | "cerrar" | "verificacion" | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminReasonValues>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: "" } });

  const isVacancy = report.targetType === "vacante" && !!report.targetStatus;
  const canPause = isVacancy && report.targetStatus === "activa";
  const canClose = isVacancy && report.targetStatus !== "cerrada";
  const canRevoke = !!report.ownerId && report.ownerVerified;

  if (!canPause && !canClose && !canRevoke) {
    return (
      <Card>
        <Text className="text-sm text-ink-muted">No hay acciones disponibles para lo reportado en su estado actual.</Text>
      </Card>
    );
  }

  const run = (kind: NonNullable<typeof pending>) =>
    handleSubmit(async ({ reason }) => {
      setPending(kind);
      const result =
        kind === "verificacion"
          ? await adminRevokeVerification(report.ownerId!, reason)
          : await adminSetVacancyStatus(report.targetId, kind === "pausar" ? "pausada" : "cerrada", reason);
      setPending(null);
      if (!result.error) reset({ reason: "" });
    })();

  return (
    <Card>
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <Input
            label="Motivo"
            multiline
            placeholder="El dueño recibirá este motivo en su notificación."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.reason?.message}
          />
        )}
      />
      <View className="mt-4 gap-2">
        {canPause ? (
          <Button title="Pausar vacante" icon={PauseCircle} variant="outline" loading={pending === "pausar"} disabled={pending !== null} onPress={() => run("pausar")} />
        ) : null}
        {canClose ? (
          <Button title="Cerrar vacante" icon={CircleOff} variant="danger" loading={pending === "cerrar"} disabled={pending !== null} onPress={() => run("cerrar")} />
        ) : null}
        {canRevoke ? (
          <Button
            title="Quitar verificación del negocio"
            icon={BadgeX}
            variant="danger"
            loading={pending === "verificacion"}
            disabled={pending !== null}
            onPress={() => run("verificacion")}
          />
        ) : null}
      </View>
    </Card>
  );
}
