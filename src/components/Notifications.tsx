import { router, type Href } from "expo-router";
import { Bell, BellOff, CheckCheck, ChevronRight, ClipboardList, Info, Sparkles, type LucideIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, Chip, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { AppNotification, NotificationKind } from "@/types";

const KIND_ICON: Record<NotificationKind, { icon: LucideIcon; bg: string; color: string }> = {
  postulacion: { icon: ClipboardList, bg: "bg-navy-50", color: colors.navy },
  solicitud_servicio: { icon: Sparkles, bg: "bg-coral-50", color: colors.coral },
  sistema: { icon: Info, bg: "bg-turquoise-50", color: colors.turquoise600 },
};

/** Solo rutas internas de la app: deben empezar con "/" y no ser una URL externa ("//..."). */
export function isInternalLink(link?: string): link is string {
  return !!link && link.startsWith("/") && !link.startsWith("//");
}

/** Más recientes primero; las del mismo día conservan el orden en que se crearon. */
export function sortNotifications(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Estado de la campana. Abrir el panel no marca nada como leído. */
export function useNotificationsToggle(notifications: AppNotification[]) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return { open, toggle: () => setOpen((v) => !v), unread };
}

interface NotificationBellProps {
  unread: number;
  onPress: () => void;
  size?: "md" | "lg";
}

export function NotificationBell({ unread, onPress, size = "lg" }: NotificationBellProps) {
  const box = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  const dot = size === "lg" ? "right-2.5 top-2.5" : "right-2 top-2";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
      className={`${box} items-center justify-center rounded-full bg-white/10 active:bg-white/20`}
    >
      <Bell size={22} color={colors.white} />
      {unread > 0 && <View className={`absolute ${dot} h-2.5 w-2.5 rounded-full bg-coral`} />}
    </Pressable>
  );
}

/** Una notificación: al tocarla se marca como leída y abre su destino, si tiene. */
export function NotificationItem({ notification: n, divider = false }: { notification: AppNotification; divider?: boolean }) {
  const { markNotificationRead } = useApp();
  const { icon: Icon, bg, color } = KIND_ICON[n.kind];
  const hasLink = isInternalLink(n.link);

  const open = () => {
    if (!n.read) markNotificationRead(n.id);
    if (hasLink) router.push(n.link as Href);
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole={hasLink ? "link" : "button"}
      accessibilityLabel={`${n.read ? "" : "Sin leer. "}${n.title}. ${n.body}`}
      className={`flex-row gap-3 rounded-2xl px-2 py-3 active:bg-navy-50 ${divider ? "border-t border-navy-50" : ""}`}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={18} color={color} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className={`flex-1 text-sm text-ink ${n.read ? "font-semibold" : "font-extrabold"}`}>{n.title}</Text>
          {!n.read && <View className="h-2.5 w-2.5 rounded-full bg-coral" accessibilityElementsHidden />}
        </View>
        <Text className="text-sm leading-5 text-ink-muted">{n.body}</Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-xs text-ink-soft">{formatDate(n.createdAt)}</Text>
          {hasLink && (
            <View className="flex-row items-center">
              <Text className="text-xs font-bold text-coral">Ver detalle</Text>
              <ChevronRight size={14} color={colors.coral} />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function MarkAllRead({ visible }: { visible: boolean }) {
  const { markNotificationsRead } = useApp();
  if (!visible) return null;
  return (
    <Pressable
      onPress={markNotificationsRead}
      accessibilityRole="button"
      className="flex-row items-center gap-1 rounded-full px-2 py-1 active:bg-navy-50"
    >
      <CheckCheck size={14} color={colors.turquoise600} />
      <Text className="text-xs font-bold text-turquoise-700">Marcar todas como leídas</Text>
    </Pressable>
  );
}

/** Panel compacto bajo la campana: las 3 más recientes y enlace a la pantalla completa. */
export function NotificationsPanel({ notifications, allHref }: { notifications: AppNotification[]; allHref: Href }) {
  const recent = sortNotifications(notifications).slice(0, 3);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Card className="mb-4">
      <View className="mb-1 flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-base font-extrabold text-navy">Notificaciones</Text>
        <MarkAllRead visible={unread > 0} />
      </View>
      {recent.length === 0 ? (
        <Text className="py-2 text-sm text-ink-muted">No tienes notificaciones.</Text>
      ) : (
        recent.map((n, i) => <NotificationItem key={n.id} notification={n} divider={i > 0} />)
      )}
      <Pressable
        onPress={() => router.push(allHref)}
        accessibilityRole="link"
        className="mt-1 flex-row items-center justify-center gap-1 border-t border-navy-50 pt-3"
      >
        <Text className="text-sm font-bold text-coral">
          Ver todas{notifications.length > 3 ? ` (${notifications.length})` : ""}
        </Text>
        <ChevronRight size={16} color={colors.coral} />
      </Pressable>
    </Card>
  );
}

/** Lista completa con filtro Todas / Sin leer, usada por las pantallas de notificaciones. */
export function NotificationList({ notifications }: { notifications: AppNotification[] }) {
  const [onlyUnread, setOnlyUnread] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const list = useMemo(
    () => sortNotifications(notifications).filter((n) => !onlyUnread || !n.read),
    [notifications, onlyUnread]
  );

  return (
    <View>
      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row gap-2">
          <Chip label={`Todas (${notifications.length})`} selected={!onlyUnread} onPress={() => setOnlyUnread(false)} />
          <Chip label={`Sin leer (${unread})`} selected={onlyUnread} onPress={() => setOnlyUnread(true)} />
        </View>
        <MarkAllRead visible={unread > 0} />
      </View>
      {list.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={onlyUnread ? "Estás al día" : "Sin notificaciones"}
          description={
            onlyUnread
              ? "No tienes notificaciones sin leer."
              : "Aquí verás los cambios en tus postulaciones y solicitudes."
          }
        />
      ) : (
        <Card className="py-1">
          {list.map((n, i) => (
            <NotificationItem key={n.id} notification={n} divider={i > 0} />
          ))}
        </Card>
      )}
    </View>
  );
}
