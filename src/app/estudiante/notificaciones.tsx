import { NotificationList } from "@/components/Notifications";
import { Screen } from "@/components/Screen";
import { useCurrentStudent } from "@/store/AppStore";

export default function NotificacionesEstudiante() {
  const { notifications } = useCurrentStudent();
  return (
    <Screen back title="Notificaciones" subtitle="Toca una notificación para ver el detalle">
      <NotificationList notifications={notifications} />
    </Screen>
  );
}
