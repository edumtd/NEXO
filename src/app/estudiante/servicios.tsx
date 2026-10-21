import { router } from "expo-router";
import { Check, Inbox, Mail, Pause, Pencil, Play, Plus, Sparkles, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { Screen, SectionTitle } from "@/components/Screen";
import { formatModality, formatRate } from "@/components/ServiceCard";
import { ServiceOfferStatusBadge, ServiceRequestStatusBadge } from "@/components/StatusBadges";
import { Button, Card, EmptyState } from "@/components/ui";
import { useMyServiceOffers } from "@/hooks/useServiceOffers";
import { useStudentServiceRequests, type StudentRequestItem } from "@/hooks/useServiceRequests";
import { SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, formatDays, formatRange } from "@/lib/format";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { ServiceOffer } from "@/types";

export default function MisServicios() {
  const offers = useMyServiceOffers();
  const requests = useStudentServiceRequests();
  const pending = requests.filter((r) => r.request.status === "enviada").length;

  return (
    <Screen
      title="Mis servicios"
      subtitle="Ofrece tus habilidades a negocios cercanos"
      right={
        <Pressable
          onPress={() => router.push("/estudiante/publicar-servicio")}
          accessibilityRole="button"
          accessibilityLabel="Publicar servicio"
          className="h-10 w-10 items-center justify-center rounded-full bg-coral active:bg-coral-600"
        >
          <Plus size={22} color={colors.white} />
        </Pressable>
      }
    >
      <View className="rounded-3xl bg-turquoise-50 p-4">
        <Text className="text-sm leading-5 text-turquoise-700">
          Las tarifas son de referencia: el pago y las condiciones se acuerdan directamente con el negocio, fuera de
          NEXO. Tu correo solo se comparte cuando aceptas una solicitud.
        </Text>
      </View>

      <SectionTitle
        title={pending > 0 ? `Solicitudes (${pending} ${pending === 1 ? "nueva" : "nuevas"})` : "Solicitudes"}
      />
      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aún no recibes solicitudes"
          description="Cuando un negocio se interese en uno de tus servicios, aparecerá aquí."
        />
      ) : (
        <View className="gap-3">
          {requests.map((item) => (
            <RequestCard key={item.request.id} item={item} />
          ))}
        </View>
      )}

      <SectionTitle title="Tus servicios publicados" />
      {offers.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Publica tu primer servicio"
          description="Por ejemplo: manejo de redes sociales, control de inventario o diseño de menús."
          actionLabel="Publicar servicio"
          onAction={() => router.push("/estudiante/publicar-servicio")}
        />
      ) : (
        <View className="gap-3">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function OfferCard({ offer }: { offer: ServiceOffer }) {
  const { setServiceOfferStatus } = useApp();
  const active = offer.status === "activo";
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ink">{offer.title}</Text>
          <Text className="text-sm text-ink-muted">
            {SERVICE_CATEGORY_LABELS[offer.category]} · {formatModality(offer)}
          </Text>
          <Text className="mt-0.5 text-sm font-bold text-ink">{formatRate(offer)}</Text>
        </View>
        <ServiceOfferStatusBadge status={offer.status} />
      </View>
      <View className="mt-4 flex-row gap-2">
        <View className="flex-1">
          <Button
            title="Editar"
            size="sm"
            variant="outline"
            icon={Pencil}
            onPress={() => router.push({ pathname: "/estudiante/publicar-servicio", params: { id: offer.id } })}
          />
        </View>
        <View className="flex-1">
          <Button
            title={active ? "Pausar" : "Reactivar"}
            size="sm"
            variant="outline"
            icon={active ? Pause : Play}
            onPress={() => setServiceOfferStatus(offer.id, active ? "pausado" : "activo")}
          />
        </View>
      </View>
    </Card>
  );
}

function RequestCard({ item }: { item: StudentRequestItem }) {
  const { respondServiceRequest } = useApp();
  const [pending, setPending] = useState<"aceptada" | "rechazada" | null>(null);
  const { request: r, offer, business } = item;
  const showContact = r.status === "aceptada" || r.status === "completada";

  const respond = async (status: "aceptada" | "rechazada") => {
    setPending(status);
    await respondServiceRequest(r.id, status);
    setPending(null);
  };

  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <BusinessIcon category={business?.category ?? "comercio"} />
        <View className="flex-1">
          <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
            {business?.name ?? "Negocio"}
          </Text>
          <Text className="text-sm text-ink-muted" numberOfLines={1}>
            {offer.title}
          </Text>
        </View>
        <ServiceRequestStatusBadge status={r.status} />
      </View>

      <Text className="mt-3 text-sm leading-5 text-ink">“{r.message}”</Text>
      {r.days?.length && r.start !== undefined && r.end !== undefined ? (
        <Text className="mt-2 text-sm font-semibold text-navy">
          Horario propuesto: {formatDays(r.days)} · {formatRange(r.start, r.end)}
        </Text>
      ) : (
        <Text className="mt-2 text-sm text-ink-muted">Trabajo remoto, sin horario fijo.</Text>
      )}
      {showContact && business?.contactEmail ? (
        <View className="mt-2 flex-row items-center gap-2">
          <Mail size={15} color={colors.muted} />
          <Text className="text-sm text-ink">{business.contactEmail}</Text>
        </View>
      ) : null}
      <Text className="mt-2 text-xs text-ink-soft">Recibida el {formatDate(r.createdAt)}</Text>

      {r.status === "enviada" && (
        <View className="mt-3 flex-row gap-2">
          <View className="flex-1">
            <Button
              title="Aceptar"
              size="sm"
              variant="secondary"
              icon={Check}
              loading={pending === "aceptada"}
              disabled={pending !== null}
              onPress={() => respond("aceptada")}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Rechazar"
              size="sm"
              variant="danger"
              icon={X}
              loading={pending === "rechazada"}
              disabled={pending !== null}
              onPress={() => respond("rechazada")}
            />
          </View>
        </View>
      )}
    </Card>
  );
}
