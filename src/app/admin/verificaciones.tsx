import { router } from "expo-router";
import { ChevronRight, FileText, Inbox } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AdminSignOut } from "@/components/AdminSignOut";
import { Screen } from "@/components/Screen";
import { VerificationStatusBadge } from "@/components/StatusBadges";
import { Chip, EmptyState } from "@/components/ui";
import { VERIFICATION_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useAdmin } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { VerificationStatus } from "@/types";

/** Solicitudes de verificación de negocios: pendientes primero. */
export default function AdminVerificaciones() {
  const { verifications } = useAdmin();
  const [status, setStatus] = useState<VerificationStatus | null>("en_revision");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of verifications) c[v.status] = (c[v.status] ?? 0) + 1;
    return c;
  }, [verifications]);
  const list = status ? verifications.filter((v) => v.status === status) : verifications;

  return (
    <Screen right={<AdminSignOut />} title="Verificaciones" subtitle="Comprobantes de domicilio de los negocios">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        <Chip label={`Todas (${verifications.length})`} selected={status === null} onPress={() => setStatus(null)} />
        {(Object.keys(VERIFICATION_STATUS_LABELS) as VerificationStatus[]).map((s) => (
          <Chip key={s} label={`${VERIFICATION_STATUS_LABELS[s]} (${counts[s] ?? 0})`} selected={status === s} onPress={() => setStatus(s)} />
        ))}
      </ScrollView>

      <View className="mt-5 gap-3">
        {list.length === 0 ? (
          <EmptyState icon={Inbox} title="No hay solicitudes aquí" description="Cuando un negocio envíe su comprobante, aparecerá en esta lista." />
        ) : (
          list.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => router.push(`/admin/verificacion/${v.id}`)}
              accessibilityRole="link"
              accessibilityLabel={`Verificación de ${v.businessName}`}
              className="flex-row items-center gap-3 rounded-3xl border border-navy-50 bg-white p-4 active:bg-navy-50"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-navy-50">
                <FileText size={18} color={colors.navy} />
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-base font-bold text-ink" numberOfLines={1}>
                    {v.businessName}
                  </Text>
                  <VerificationStatusBadge status={v.status} />
                </View>
                <Text className="text-sm text-ink-muted" numberOfLines={1}>
                  {v.businessAddress || "Sin dirección"} · {v.businessZone || "Sin zona"}
                </Text>
                <Text className="text-xs text-ink-soft">Enviada el {formatDate(v.createdAt)}</Text>
              </View>
              <ChevronRight size={18} color={colors.soft} />
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
