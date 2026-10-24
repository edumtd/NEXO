import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Flag } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { Button, Chip, Input } from "@/components/ui";
import { REPORT_REASON_LABELS } from "@/lib/constants";
import { reportSchema, type ReportValues } from "@/lib/schemas";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { ReportReason } from "@/types";

interface ReportFormProps {
  vacancyId: string;
  businessId: string;
  businessName: string;
}

/**
 * Reporte de seguridad de una vacante o su negocio. Solo lo revisa administración:
 * no hay contadores públicos ni efecto visible sobre la vacante.
 */
export function ReportForm({ vacancyId, businessId, businessName }: ReportFormProps) {
  const { submitReport } = useApp();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<"ok" | "duplicado" | null>(null);
  const { control, handleSubmit, watch, formState } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { targetType: "vacante", reason: "informacion_falsa", description: "" },
  });
  const targetType = watch("targetType");

  if (result) {
    return (
      <View className="mt-6 flex-row items-start gap-3 rounded-3xl bg-navy-50 p-4">
        <CircleCheck size={18} color={colors.navy} />
        <Text className="flex-1 text-sm leading-5 text-navy">
          {result === "ok"
            ? "Reporte recibido. Administración lo revisará; tu identidad no se comparte con el negocio."
            : "Ya habías reportado esto. Administración lo está revisando."}
        </Text>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="mt-6 flex-row items-center gap-1.5 self-center rounded-full px-3 py-2 active:bg-navy-50"
      >
        <Flag size={14} color={colors.muted} />
        <Text className="text-sm font-semibold text-ink-muted">Reportar vacante o negocio</Text>
      </Pressable>
    );
  }

  return (
    <View className="mt-6 gap-3 rounded-3xl border border-navy-50 bg-white p-4">
      <Text className="text-base font-extrabold text-navy">Reportar</Text>
      <Controller
        control={control}
        name="targetType"
        render={({ field }) => (
          <View className="flex-row flex-wrap gap-2">
            <Chip size="sm" label="Esta vacante" selected={field.value === "vacante"} onPress={() => field.onChange("vacante")} />
            <Chip size="sm" label={businessName} selected={field.value === "negocio"} onPress={() => field.onChange("negocio")} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <View>
            <Text className="mb-2 text-sm font-semibold text-navy">Motivo</Text>
            <View className="flex-row flex-wrap gap-2">
              {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((r) => (
                <Chip key={r} size="sm" label={REPORT_REASON_LABELS[r]} selected={field.value === r} onPress={() => field.onChange(r)} />
              ))}
            </View>
          </View>
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Input
            label="¿Qué pasó?"
            multiline
            placeholder="Describe brevemente el problema."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.description?.message}
          />
        )}
      />
      <Text className="text-xs leading-4 text-ink-soft">
        Solo administración ve los reportes. No se publican ni afectan la vacante de forma visible.
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title="Cancelar" size="sm" variant="ghost" onPress={() => setOpen(false)} />
        </View>
        <View className="flex-1">
          <Button
            title="Enviar reporte"
            size="sm"
            variant="danger"
            icon={Flag}
            loading={formState.isSubmitting}
            onPress={handleSubmit(async (v) => {
              const r = await submitReport({
                targetType: v.targetType,
                targetId: v.targetType === "vacante" ? vacancyId : businessId,
                reason: v.reason,
                description: v.description.trim(),
              });
              if (r !== "error") setResult(r);
            })}
          />
        </View>
      </View>
      {targetType === "negocio" && (
        <Text className="text-xs text-ink-soft">El reporte será sobre {businessName}, no solo sobre esta vacante.</Text>
      )}
    </View>
  );
}
