import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import {
  CircleDollarSign,
  ExternalLink,
  FileQuestion,
  Laptop,
  MapPin,
  School,
  Send,
  Tag,
  type LucideIcon,
} from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Linking, Pressable, Text, View } from "react-native";

import { DayPicker, TimeStepper } from "@/components/Pickers";
import { Screen, SectionTitle } from "@/components/Screen";
import { formatModality, formatRate } from "@/components/ServiceCard";
import { AcademicStatusBadge, ServiceRequestStatusBadge } from "@/components/StatusBadges";
import { Avatar, Button, Card, EmptyState, Input } from "@/components/ui";
import { useMarketplaceOffers } from "@/hooks/useServiceOffers";
import { useBusinessServiceRequests } from "@/hooks/useServiceRequests";
import { SERVICE_CATEGORY_LABELS, SERVICE_REQUEST_OPEN } from "@/lib/constants";
import { serviceRequestSchema, type ServiceRequestValues } from "@/lib/schemas";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";

export default function TalentoDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useMarketplaceOffers().find((i) => i.offer.id === id);
  const openRequest = useBusinessServiceRequests().find(
    (r) => r.offer.id === id && SERVICE_REQUEST_OPEN.includes(r.request.status)
  );

  if (!item) {
    return (
      <Screen back title="Servicio">
        <EmptyState
          icon={FileQuestion}
          title="Servicio no disponible"
          description="Es posible que la persona lo haya pausado."
          actionLabel="Ver talento"
          onAction={() => router.replace("/negocio/talento")}
        />
      </Screen>
    );
  }

  const { offer, student } = item;

  return (
    <Screen back title={offer.title} subtitle={SERVICE_CATEGORY_LABELS[offer.category]}>
      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar name={student.fullName} size="lg" />
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
              {student.fullName}
            </Text>
            <Text className="mb-1 text-sm text-ink-muted" numberOfLines={1}>
              {student.career}
            </Text>
            <AcademicStatusBadge status={student.academicStatus} />
          </View>
        </View>
        <View className="mt-3 gap-1.5">
          <Row icon={School} text={student.university} />
          <Row icon={offer.modality === "remoto" ? Laptop : MapPin} text={formatModality(offer)} />
          <Row icon={Tag} text={SERVICE_CATEGORY_LABELS[offer.category]} />
        </View>
        {student.skills.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {student.skills.map((sk) => (
              <View key={sk} className="rounded-full bg-navy-50 px-2.5 py-1">
                <Text className="text-xs font-semibold text-navy">{sk}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View className="mt-4 rounded-3xl border border-navy-50 bg-white p-4">
        <View className="flex-row items-center gap-2">
          <CircleDollarSign size={20} color={colors.turquoise600} />
          <Text className="text-lg font-extrabold text-ink">{formatRate(offer)}</Text>
        </View>
        <Text className="mt-1 text-xs leading-4 text-ink-muted">
          Tarifa de referencia. El pago y las condiciones se acuerdan directamente con la persona, fuera de NEXO.
        </Text>
      </View>

      <Card className="mt-4">
        <Text className="mb-2 text-base font-extrabold text-navy">Descripción</Text>
        <Text className="text-sm leading-5 text-ink">{offer.description}</Text>
        <Text className="mb-2 mt-4 text-base font-extrabold text-navy">Entregables</Text>
        {offer.deliverables.map((d) => (
          <View key={d} className="flex-row gap-2 py-1">
            <View className="mt-2 h-1.5 w-1.5 rounded-full bg-coral" />
            <Text className="flex-1 text-sm leading-5 text-ink">{d}</Text>
          </View>
        ))}
        {offer.portfolioUrl ? (
          <Pressable
            onPress={() => Linking.openURL(offer.portfolioUrl!)}
            accessibilityRole="link"
            className="mt-3 flex-row items-center gap-1.5 self-start"
          >
            <ExternalLink size={16} color={colors.coral} />
            <Text className="text-sm font-bold text-coral">Ver portafolio</Text>
          </Pressable>
        ) : null}
      </Card>

      <SectionTitle title="Solicitar este servicio" />
      {openRequest ? (
        <View className="rounded-3xl bg-navy-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-navy">Ya enviaste una solicitud</Text>
            <ServiceRequestStatusBadge status={openRequest.request.status} />
          </View>
          <Pressable
            onPress={() => router.push(`/negocio/solicitud/${openRequest.request.id}`)}
            accessibilityRole="link"
            className="mt-2 self-start"
          >
            <Text className="text-sm font-bold text-coral">Ver seguimiento</Text>
          </Pressable>
        </View>
      ) : (
        <RequestForm offerId={offer.id} needsSchedule={offer.modality !== "remoto"} />
      )}
    </Screen>
  );
}

function RequestForm({ offerId, needsSchedule }: { offerId: string; needsSchedule: boolean }) {
  const { sendServiceRequest } = useApp();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceRequestValues>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: { message: "", needsSchedule, days: [], start: 10 * 60, end: 14 * 60 },
  });

  const onSubmit = async (v: ServiceRequestValues) => {
    await sendServiceRequest({
      offerId,
      message: v.message.trim(),
      ...(needsSchedule ? { days: v.days, start: v.start, end: v.end } : {}),
    });
  };

  return (
    <View className="gap-4">
      <Controller
        control={control}
        name="message"
        render={({ field }) => (
          <Input
            label="¿Qué necesitas?"
            multiline
            placeholder="Cuenta brevemente la tarea, el objetivo y los tiempos."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.message?.message}
          />
        )}
      />
      {needsSchedule ? (
        <>
          <Controller
            control={control}
            name="days"
            render={({ field }) => (
              <View>
                <Text className="mb-2 text-sm font-semibold text-navy">Días propuestos</Text>
                <DayPicker value={field.value} onChange={field.onChange} />
                {errors.days && <Text className="mt-1 text-xs font-medium text-red-600">{errors.days.message}</Text>}
              </View>
            )}
          />
          <View>
            <View className="flex-row gap-3">
              <Controller control={control} name="start" render={({ field }) => <TimeStepper label="Desde" value={field.value} onChange={field.onChange} max={23 * 60} />} />
              <Controller control={control} name="end" render={({ field }) => <TimeStepper label="Hasta" value={field.value} onChange={field.onChange} min={7 * 60} />} />
            </View>
            {errors.end && <Text className="mt-1 text-xs font-medium text-red-600">{errors.end.message}</Text>}
          </View>
          <Text className="text-xs leading-4 text-ink-muted">
            Después de enviarla verás si el horario es compatible con la disponibilidad de la persona.
          </Text>
        </>
      ) : (
        <Text className="text-sm text-ink-muted">Servicio remoto: no necesitas proponer horario.</Text>
      )}
      <Button title="Enviar solicitud" icon={Send} size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

function Row({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={15} color={colors.muted} />
      <Text className="text-sm text-ink">{text}</Text>
    </View>
  );
}
