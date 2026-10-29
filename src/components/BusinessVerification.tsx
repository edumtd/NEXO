import * as DocumentPicker from "expo-document-picker";
import { BadgeCheck, Clock, FileText, ShieldAlert, Upload, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui";
import { VERIFICATION_MAX_BYTES, VERIFICATION_MIME_TYPES, VERIFICATION_RETRY_DAYS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useApp, useCurrentBusiness, type VerificationFile } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { VerificationMime } from "@/types";

const retryDate = (reviewedAt: string) => {
  const d = new Date(reviewedAt);
  d.setDate(d.getDate() + VERIFICATION_RETRY_DAYS);
  return d;
};

/**
 * Verificación básica del negocio: sube un comprobante de domicilio (PDF, JPG o PNG, hasta 5 MB) que
 * revisa administración. El archivo va a un almacenamiento privado y se borra al resolver.
 */
export function BusinessVerification() {
  const { profile, verificationRequests } = useCurrentBusiness();
  const { requestBusinessVerification } = useApp();
  const [file, setFile] = useState<VerificationFile | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!profile) return null;
  const latest = verificationRequests[0];

  if (profile.verified) {
    return (
      <Panel
        tone="success"
        icon={<BadgeCheck size={20} color={colors.turquoise600} />}
        title="Verificación básica completada"
        message="Los estudiantes ven la insignia de verificación en tus vacantes y en el mapa."
      />
    );
  }

  if (latest?.status === "en_revision") {
    return (
      <Panel
        tone="info"
        icon={<Clock size={20} color={colors.navy} />}
        title="Verificación en revisión"
        message={`Recibimos tu comprobante el ${formatDate(latest.createdAt)}. Te avisaremos cuando terminemos de revisarlo.`}
      />
    );
  }

  const rejected = latest?.status === "rechazado" ? latest : undefined;
  const blockedUntil = rejected?.reviewedAt && retryDate(rejected.reviewedAt) > new Date() ? retryDate(rejected.reviewedAt) : null;
  const message = [
    rejected?.rejectReason ? `Motivo: ${rejected.rejectReason}` : null,
    blockedUntil
      ? `Podrás enviar un nuevo comprobante a partir del ${formatDate(blockedUntil.toISOString())}.`
      : "Sube un comprobante de domicilio del negocio (recibo de luz, agua o teléfono). Solo lo ve administración y se borra al terminar la revisión.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const pick = async () => {
    setPickError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: VERIFICATION_MIME_TYPES, copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    const mime = (a.mimeType ?? "") as VerificationMime;
    if (!VERIFICATION_MIME_TYPES.includes(mime)) return setPickError("Sube un PDF, JPG o PNG.");
    if (!a.size || a.size > VERIFICATION_MAX_BYTES) return setPickError("El archivo debe pesar menos de 5 MB.");
    setFile({ uri: a.uri, name: a.name, mimeType: mime, size: a.size, file: a.file });
  };

  const send = async () => {
    if (!file) return;
    setSending(true);
    const result = await requestBusinessVerification(file);
    setSending(false);
    if (!result.error) setFile(null);
  };

  return (
    <Panel
      tone="warning"
      icon={<ShieldAlert size={20} color={colors.amber} />}
      title={rejected ? "Verificación no aprobada" : "Verificación básica pendiente"}
      message={message}
    >
      {!blockedUntil && (
        <View className="mt-3 gap-2">
          {file ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-white p-3">
              <FileText size={18} color={colors.navy} />
              <Text className="flex-1 text-sm text-ink" numberOfLines={1}>
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </Text>
              <Pressable onPress={() => setFile(null)} accessibilityRole="button" accessibilityLabel="Quitar archivo" hitSlop={8}>
                <X size={18} color={colors.soft} />
              </Pressable>
            </View>
          ) : null}
          {pickError ? <Text className="text-xs font-medium text-red-600">{pickError}</Text> : null}
          {file ? (
            <Button title="Enviar a revisión" icon={Upload} loading={sending} onPress={send} />
          ) : (
            <Button title="Elegir comprobante" icon={FileText} variant="outline" onPress={pick} />
          )}
          <Text className="text-xs text-amber-700">PDF, JPG o PNG de hasta 5 MB.</Text>
        </View>
      )}
    </Panel>
  );
}

const PANEL_TONES = {
  success: { box: "bg-turquoise-50", text: "text-turquoise-700" },
  info: { box: "bg-navy-50", text: "text-navy" },
  warning: { box: "bg-amber-50", text: "text-amber-700" },
} as const;

function Panel({
  tone,
  icon,
  title,
  message,
  children,
}: {
  tone: keyof typeof PANEL_TONES;
  icon: ReactNode;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  const t = PANEL_TONES[tone];
  return (
    <View className={`flex-row items-start gap-3 rounded-3xl p-4 ${t.box}`}>
      {icon}
      <View className="flex-1">
        <Text className={`text-sm font-bold ${t.text}`}>{title}</Text>
        <Text className={`text-sm leading-5 ${t.text}`}>{message}</Text>
        {children}
      </View>
    </View>
  );
}
