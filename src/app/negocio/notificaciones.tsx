import { NotificationList } from "@/components/Notifications";
import { Screen } from "@/components/Screen";
import { useCurrentBusiness } from "@/store/AppStore";

export default function NotificacionesNegocio() {
  const { notifications } = useCurrentBusiness();
  return (
    <Screen back title="Notificaciones" subtitle="Toca una notificación para ver el detalle">
      <NotificationList notifications={notifications} />
    </Screen>
  );
}
