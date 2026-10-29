import { router } from "expo-router";
import { ChevronRight, Flag, Inbox } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AdminSignOut } from "@/components/AdminSignOut";
import { Screen } from "@/components/Screen";
import { ReportStatusBadge } from "@/components/StatusBadges";
import { Chip, EmptyState } from "@/components/ui";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_TARGET_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useAdmin } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { ReportStatus } from "@/types";

/** Bandeja de reportes: más recientes primero, con filtro por estado. */
export default function AdminReportes() {
  const { reports } = useAdmin();
  const [status, setStatus] = useState<ReportStatus | null>("nuevo");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reports) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [reports]);
  const list = status ? reports.filter((r) => r.status === status) : reports;

  return (
    <Screen right={<AdminSignOut />} title="Reportes" subtitle="Revisa lo que reportan estudiantes y negocios">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        <Chip label={`Todos (${reports.length})`} selected={status === null} onPress={() => setStatus(null)} />
        {(Object.keys(REPORT_STATUS_LABELS) as ReportStatus[]).map((s) => (
          <Chip key={s} label={`${REPORT_STATUS_LABELS[s]} (${counts[s] ?? 0})`} selected={status === s} onPress={() => setStatus(s)} />
        ))}
      </ScrollView>

      <View className="mt-5 gap-3">
        {list.length === 0 ? (
          <EmptyState icon={Inbox} title="No hay reportes aquí" description="Cuando alguien reporte una vacante o un negocio, aparecerá en esta bandeja." />
        ) : (
          list.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/admin/reporte/${r.id}`)}
              accessibilityRole="link"
              accessibilityLabel={`Reporte de ${REPORT_TARGET_LABELS[r.targetType]} ${r.targetTitle ?? ""}`}
              className="flex-row items-center gap-3 rounded-3xl border border-navy-50 bg-white p-4 active:bg-navy-50"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <Flag size={18} color={colors.danger} />
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-base font-bold text-ink" numberOfLines={1}>
                    {REPORT_REASON_LABELS[r.reason]}
                  </Text>
                  <ReportStatusBadge status={r.status} />
                </View>
                <Text className="text-sm text-ink-muted" numberOfLines={1}>
                  {REPORT_TARGET_LABELS[r.targetType]}: {r.targetTitle ?? "Ya no existe"}
                  {r.targetType === "vacante" && r.ownerName ? ` · ${r.ownerName}` : ""}
                </Text>
                <Text className="text-xs text-ink-soft">
                  {formatDate(r.createdAt)}
                  {r.targetReportCount > 1 ? ` · ${r.targetReportCount} reportes de este objetivo` : ""}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.soft} />
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
