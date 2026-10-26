import { ScrollText } from "lucide-react-native";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { EmptyState } from "@/components/ui";
import { ADMIN_ACTION_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useAdmin } from "@/store/AppStore";

/** Bitácora de administración: quién hizo qué y cuándo. No se puede editar ni borrar. */
export default function AdminBitacora() {
  const { actions } = useAdmin();

  return (
    <Screen title="Bitácora" subtitle="Acciones de administración, de la más reciente a la más antigua">
      {actions.length === 0 ? (
        <EmptyState icon={ScrollText} title="Sin acciones todavía" description="Cada revisión y acción de moderación quedará registrada aquí." />
      ) : (
        <View className="rounded-3xl border border-navy-50 bg-white px-4">
          {actions.map((a, i) => (
            <View key={a.id} className={`py-3 ${i > 0 ? "border-t border-navy-50" : ""}`}>
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-base font-bold text-ink">{ADMIN_ACTION_LABELS[a.action]}</Text>
                <Text className="text-xs text-ink-soft">{formatDate(a.createdAt)}</Text>
              </View>
              {a.note ? <Text className="mt-1 text-sm leading-5 text-ink">{a.note}</Text> : null}
              <Text className="mt-1 text-xs text-ink-muted">
                {a.adminEmail ?? "Administración"} · {a.targetType} {a.targetId.slice(0, 8)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
