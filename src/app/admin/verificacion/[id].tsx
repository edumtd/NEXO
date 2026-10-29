import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { BadgeCheck, CircleX, ExternalLink, FileText } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Linking, Platform, Text, View } from "react-native";

import { Screen, SectionTitle } from "@/components/Screen";
import { VerificationStatusBadge } from "@/components/StatusBadges";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { adminReasonSchema, type AdminReasonValues } from "@/lib/schemas";
import { useAdmin, useApp } from "@/store/AppStore";
import type { AdminVerificationRequest } from "@/types";

/** Revisión de un comprobante: compara con los datos del negocio y aprueba o rechaza. */
export default function AdminVerificacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { verifications } = useAdmin();
  const request = verifications.find((v) => v.id === id);

  if (!request) {
    return (
      <Screen back title="Verificación">
        <EmptyState
          icon={FileText}
          title="No encontramos esta solicitud"
          actionLabel="Volver a la lista"
          onAction={() => router.replace("/admin/verificaciones")}
        />
      </Screen>
    );
  }

  return (
    <Screen back title={request.businessName} subtitle={`Solicitud del ${formatDate(request.createdAt)}`}>
      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-navy">Estado</Text>
          <VerificationStatusBadge status={request.status} />
        </View>
        {request.rejectReason ? <Text className="mt-2 text-sm text-ink">Motivo del rechazo: {request.rejectReason}</Text> : null}
        {request.reviewedAt ? <Text className="mt-2 text-xs text-ink-soft">Revisada el {formatDate(request.reviewedAt)}</Text> : null}
      </Card>

      <SectionTitle title="Datos del negocio" />
      <Card>
        <Row label="Nombre" value={request.businessName} />
        <Row label="Dirección" value={request.businessAddress || "Sin dirección"} />
        <Row label="Zona" value={request.businessZone || "Sin zona"} />
        <Row label="Teléfono" value={request.businessPhone || "Sin teléfono"} />
      </Card>

      {request.status === "en_revision" ? <Review request={request} /> : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-navy-50 py-2.5 last:border-b-0">
      <Text className="text-sm text-ink-muted">{label}</Text>
      <Text className="flex-shrink text-right text-base text-ink">{value}</Text>
    </View>
  );
}

function Review({ request }: { request: AdminVerificationRequest }) {
  const { adminResolveVerification, adminVerificationDocumentUrl } = useApp();
  const [opening, setOpening] = useState(false);
  const [pending, setPending] = useState<"aprobar" | "rechazar" | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminReasonValues>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: "" } });

  const openDocument = async () => {
    if (!request.filePath) return;
    setOpening(true);
    const { url } = await adminVerificationDocumentUrl(request.filePath);
    setOpening(false);
    if (!url) return;
    // El enlace dura 60 segundos: sirve para revisar, no para compartir.
    if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank", "noopener");
    else void Linking.openURL(url);
  };

  const approve = async () => {
    setPending("aprobar");
    await adminResolveVerification(request.id, true, "");
    setPending(null);
  };

  const reject = handleSubmit(async ({ reason }) => {
    setPending("rechazar");
    await adminResolveVerification(request.id, false, reason);
    setPending(null);
  });

  return (
    <>
      <SectionTitle title="Comprobante" />
      <Card>
        <Text className="text-sm text-ink-muted">
          {request.mimeType === "application/pdf" ? "PDF" : "Imagen"} · {(request.sizeBytes / 1024 / 1024).toFixed(1)} MB. Revisa que la
          dirección coincida con la del negocio. El archivo se borra al aprobar o rechazar.
        </Text>
        <View className="mt-3">
          <Button title="Ver comprobante" icon={ExternalLink} variant="outline" loading={opening} onPress={openDocument} />
        </View>
      </Card>

      <SectionTitle title="Decisión" />
      <Card>
        <Button title="Aprobar verificación" icon={BadgeCheck} loading={pending === "aprobar"} disabled={pending !== null} onPress={approve} />
        <View className="mt-4">
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <Input
                label="Motivo del rechazo"
                multiline
                placeholder="El negocio lo verá. Ej.: el comprobante es de otra dirección."
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.reason?.message}
              />
            )}
          />
        </View>
        <View className="mt-3">
          <Button title="Rechazar" icon={CircleX} variant="danger" loading={pending === "rechazar"} disabled={pending !== null} onPress={reject} />
        </View>
      </Card>
    </>
  );
}
