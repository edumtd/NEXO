import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import {
  CalendarClock,
  Check,
  CircleDollarSign,
  ExternalLink,
  FileQuestion,
  Info,
  Mail,
  PackageCheck,
  Play,
  RotateCcw,
  Send,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Linking, Pressable, Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { Screen, SectionTitle } from "@/components/Screen";
import { formatModality, formatRate } from "@/components/ServiceCard";
import { ServiceProgress } from "@/components/ServiceProgress";
import { AcademicStatusBadge, CompatibilityBadge, ServiceRequestStatusBadge } from "@/components/StatusBadges";
import { Avatar, Button, Card, Chip, EmptyState, Input } from "@/components/ui";
import {
  hasSchedule,
  useBusinessServiceRequests,
  useStudentServiceRequests,
  type BusinessRequestItem,
  type StudentRequestItem,
} from "@/hooks/useServiceRequests";
import { SERVICE_CATEGORY_LABELS, SERVICE_UPDATE_KIND_LABELS } from "@/lib/constants";
import { formatDate, formatDays, formatRange } from "@/lib/format";
import {
  acceptServiceSchema,
  serviceDateChangeSchema,
  serviceDeliverySchema,
  serviceNoteSchema,
  serviceProgressSchema,
  type AcceptServiceValues,
  type ServiceDateChangeValues,
  type ServiceDeliveryValues,
  type ServiceNoteValues,
  type ServiceProgressValues,
} from "@/lib/schemas";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { ServiceOffer, ServiceRequest, ServiceUpdate, ServiceUpdateKind } from "@/types";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// ───────────────────────── Pantallas por rol ─────────────────────────

export function StudentRequestDetail({ id }: { id: string }) {
  const item = useStudentServiceRequests().find((i) => i.request.id === id);
  if (!item) return <NotFound back="/estudiante/servicios" />;
  const { request: r, offer, business, contactEmail, updates } = item;

  return (
    <Screen back title={offer.title} subtitle={business?.name ?? "Negocio"}>
      <Card>
        <ServiceProgress request={r} />
      </Card>

      <Card className="mt-4">
        <View className="flex-row items-center gap-3">
          <BusinessIcon category={business?.category ?? "comercio"} />
          <View className="flex-1">
            <Text className="text-base font-extrabold text-ink">{business?.name ?? "Negocio"}</Text>
            <Text className="text-sm text-ink-muted">Solicitó tu servicio el {formatDate(r.createdAt)}</Text>
          </View>
          <ServiceRequestStatusBadge status={r.status} />
        </View>
        <ContactRow email={contactEmail} hiddenText="El contacto del negocio se mostrará cuando aceptes." />
      </Card>

      <RequestInfo request={r} offer={offer} />
      <StoppedInfo request={r} />
      <StudentActions item={item} />
      <Timeline updates={updates} />
    </Screen>
  );
}

export function BusinessRequestDetail({ id }: { id: string }) {
  const item = useBusinessServiceRequests().find((i) => i.request.id === id);
  if (!item) return <NotFound back="/negocio/postulaciones?tipo=servicios" />;
  const { request: r, offer, student, compatibility, contactEmail, updates } = item;

  return (
    <Screen back title={offer.title} subtitle={student.fullName}>
      <Card>
        <ServiceProgress request={r} />
      </Card>

      <Card className="mt-4">
        <View className="flex-row items-center gap-3">
          <Avatar name={student.fullName} size="lg" />
          <View className="flex-1">
            <Text className="text-base font-extrabold text-ink">{student.fullName}</Text>
            <Text className="mb-1 text-sm text-ink-muted">{student.career}</Text>
            <AcademicStatusBadge status={student.academicStatus} />
          </View>
          <ServiceRequestStatusBadge status={r.status} />
        </View>
        {compatibility && (
          <View className="mt-3">
            <CompatibilityBadge level={compatibility.level} />
          </View>
        )}
        <ContactRow email={contactEmail} hiddenText="El correo se mostrará cuando la persona acepte la solicitud." />
      </Card>

      <RequestInfo request={r} offer={offer} />
      <StoppedInfo request={r} />
      <BusinessActions item={item} />
      <Timeline updates={updates} />
    </Screen>
  );
}

// ───────────────────────── Acciones ─────────────────────────

function StudentActions({ item }: { item: StudentRequestItem }) {
  const { startServiceRequest } = useApp();
  const [starting, setStarting] = useState(false);
  const { request: r, offer, business, updates } = item;
  const businessName = business?.name ?? "El negocio";

  if (r.status === "enviada") return <AcceptForm requestId={r.id} />;

  if (r.status === "aceptada") {
    return (
      <ActionSection title="Siguiente paso">
        <Button
          title="Iniciar trabajo"
          icon={Play}
          loading={starting}
          onPress={async () => {
            setStarting(true);
            await startServiceRequest(r.id);
            setStarting(false);
          }}
        />
        <CancelForm requestId={r.id} />
      </ActionSection>
    );
  }

  if (r.status === "en_proceso") {
    const lastAdjustment = [...updates].reverse().find((u) => u.kind === "ajuste");
    const lastDelivery = [...updates].reverse().find((u) => u.kind === "entrega");
    const pendingAdjustment = lastAdjustment && (!lastDelivery || lastAdjustment.createdAt >= lastDelivery.createdAt);
    return (
      <ActionSection title="Registrar avance">
        {pendingAdjustment && lastAdjustment && (
          <Notice tone="warning" text={`${businessName} pidió ajustes: “${lastAdjustment.message}”`} />
        )}
        <InProgressForms requestId={r.id} remote={offer.modality === "remoto"} currentDate={r.estimatedDate} />
      </ActionSection>
    );
  }

  if (r.status === "entregada") {
    return <Notice tone="info" text={`Entregado. Esperando a que ${businessName} confirme o pida ajustes.`} />;
  }
  if (r.status === "completada") {
    return <Notice tone="success" text={`${businessName} confirmó el servicio como finalizado.`} />;
  }
  return null;
}

function BusinessActions({ item }: { item: BusinessRequestItem }) {
  const { confirmServiceCompletion, requestServiceAdjustments } = useApp();
  const [confirming, setConfirming] = useState(false);
  const { request: r, student } = item;

  if (r.status === "enviada" || r.status === "aceptada") {
    return (
      <ActionSection title={r.status === "enviada" ? "Esperando respuesta" : "Aceptada"}>
        <Notice
          tone="info"
          text={
            r.status === "enviada"
              ? `${student.fullName} aún no responde tu solicitud.`
              : `${student.fullName} aceptó y comenzará el trabajo pronto.`
          }
        />
        <CancelForm requestId={r.id} />
      </ActionSection>
    );
  }
  if (r.status === "en_proceso") {
    return <Notice tone="info" text={`${student.fullName} está trabajando. Verás aquí cada avance.`} />;
  }
  if (r.status === "entregada") {
    return (
      <ActionSection title="Revisa la entrega">
        <Button
          title="Confirmar finalizado"
          icon={Check}
          variant="secondary"
          loading={confirming}
          onPress={async () => {
            setConfirming(true);
            await confirmServiceCompletion(r.id);
            setConfirming(false);
          }}
        />
        <NoteForm
          label="¿Falta algo? Solicita ajustes"
          placeholder="Describe qué debe corregirse o completarse."
          submitLabel="Solicitar ajustes"
          icon={RotateCcw}
          onSubmit={(note) => requestServiceAdjustments(r.id, note)}
        />
      </ActionSection>
    );
  }
  if (r.status === "completada") {
    return <Notice tone="success" text="Servicio finalizado. El pago y las condiciones se acuerdan fuera de NEXO." />;
  }
  return null;
}

function AcceptForm({ requestId }: { requestId: string }) {
  const { respondServiceRequest } = useApp();
  const [rejecting, setRejecting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptServiceValues>({
    resolver: zodResolver(acceptServiceSchema),
    defaultValues: { estimatedDate: inDays(7) },
  });

  return (
    <ActionSection title="Responder solicitud">
      <Controller
        control={control}
        name="estimatedDate"
        render={({ field }) => (
          <Input
            label="Fecha estimada de entrega"
            placeholder="AAAA-MM-DD"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.estimatedDate?.message}
            hint="Obligatoria para aceptar. Podrás cambiarla después indicando el motivo."
          />
        )}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            title="Aceptar"
            icon={Check}
            variant="secondary"
            loading={isSubmitting}
            disabled={rejecting}
            onPress={handleSubmit((v) => respondServiceRequest(requestId, "aceptada", v.estimatedDate))}
          />
        </View>
        <View className="flex-1">
          <Button
            title="Rechazar"
            icon={X}
            variant="danger"
            loading={rejecting}
            disabled={isSubmitting}
            onPress={async () => {
              setRejecting(true);
              await respondServiceRequest(requestId, "rechazada");
              setRejecting(false);
            }}
          />
        </View>
      </View>
    </ActionSection>
  );
}

type InProgressTab = "avance" | "fecha" | "entrega";

function InProgressForms({ requestId, remote, currentDate }: { requestId: string; remote: boolean; currentDate?: string }) {
  const [tab, setTab] = useState<InProgressTab>("avance");
  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        <Chip size="sm" label="Publicar avance" selected={tab === "avance"} onPress={() => setTab("avance")} />
        <Chip size="sm" label="Cambiar fecha" selected={tab === "fecha"} onPress={() => setTab("fecha")} />
        <Chip size="sm" label="Marcar como entregado" selected={tab === "entrega"} onPress={() => setTab("entrega")} />
      </View>
      {tab === "avance" && <ProgressForm key="avance" requestId={requestId} />}
      {tab === "fecha" && <DateChangeForm key="fecha" requestId={requestId} currentDate={currentDate} />}
      {tab === "entrega" && <DeliveryForm key="entrega" requestId={requestId} remote={remote} />}
    </>
  );
}

function ProgressForm({ requestId }: { requestId: string }) {
  const { addServiceProgress } = useApp();
  const { control, handleSubmit, reset, formState } = useForm<ServiceProgressValues>({
    resolver: zodResolver(serviceProgressSchema),
    defaultValues: { message: "", link: "" },
  });
  return (
    <>
      <Controller
        control={control}
        name="message"
        render={({ field }) => (
          <Input label="¿Qué avanzaste?" multiline placeholder="Ej. Terminé el calendario de publicaciones de noviembre." value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.message?.message} />
        )}
      />
      <LinkField control={control} name="link" error={formState.errors.link?.message} />
      <Button
        title="Publicar avance"
        icon={TrendingUp}
        loading={formState.isSubmitting}
        onPress={handleSubmit(async (v) => {
          await addServiceProgress(requestId, { message: v.message.trim(), link: v.link || undefined });
          reset();
        })}
      />
    </>
  );
}

function DateChangeForm({ requestId, currentDate }: { requestId: string; currentDate?: string }) {
  const { changeServiceEstimatedDate } = useApp();
  const { control, handleSubmit, reset, formState } = useForm<ServiceDateChangeValues>({
    resolver: zodResolver(serviceDateChangeSchema),
    defaultValues: { estimatedDate: currentDate ?? inDays(7), reason: "" },
  });
  return (
    <>
      <Controller
        control={control}
        name="estimatedDate"
        render={({ field }) => (
          <Input label="Nueva fecha estimada" placeholder="AAAA-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.estimatedDate?.message} />
        )}
      />
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <Input label="Motivo" multiline placeholder="Explica al negocio por qué cambia la fecha." value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.reason?.message} />
        )}
      />
      <Button
        title="Actualizar fecha"
        icon={CalendarClock}
        variant="secondary"
        loading={formState.isSubmitting}
        onPress={handleSubmit(async (v) => {
          await changeServiceEstimatedDate(requestId, { estimatedDate: v.estimatedDate, reason: v.reason.trim() });
          reset({ estimatedDate: v.estimatedDate, reason: "" });
        })}
      />
    </>
  );
}

function DeliveryForm({ requestId, remote }: { requestId: string; remote: boolean }) {
  const { deliverServiceRequest } = useApp();
  const { control, handleSubmit, formState } = useForm<ServiceDeliveryValues>({
    resolver: zodResolver(serviceDeliverySchema),
    defaultValues: { message: "", link: "", requireEvidence: remote },
  });
  return (
    <>
      <Controller
        control={control}
        name="message"
        render={({ field }) => (
          <Input
            label={remote ? "Nota del entregable" : "Nota del entregable (opcional)"}
            multiline
            placeholder="¿Qué entregas y cómo se usa?"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.message?.message}
            hint={remote ? "En servicios remotos agrega una nota o un enlace." : undefined}
          />
        )}
      />
      <LinkField control={control} name="link" error={formState.errors.link?.message} />
      <Button
        title="Marcar como entregado"
        icon={PackageCheck}
        variant="secondary"
        loading={formState.isSubmitting}
        onPress={handleSubmit((v) =>
          deliverServiceRequest(requestId, { message: v.message.trim() || undefined, link: v.link || undefined })
        )}
      />
    </>
  );
}

function CancelForm({ requestId }: { requestId: string }) {
  const { cancelServiceRequest } = useApp();
  const [open, setOpen] = useState(false);
  if (!open) {
    return <Button title="Cancelar solicitud" icon={X} variant="ghost" onPress={() => setOpen(true)} />;
  }
  return (
    <View className="gap-3 rounded-2xl bg-red-50 p-3">
      <NoteForm
        label="Motivo de la cancelación"
        placeholder="La otra parte verá este motivo."
        submitLabel="Confirmar cancelación"
        icon={X}
        variant="danger"
        onSubmit={(reason) => cancelServiceRequest(requestId, reason)}
      />
      <Button title="Volver" size="sm" variant="outline" onPress={() => setOpen(false)} />
    </View>
  );
}

function NoteForm({
  label,
  placeholder,
  submitLabel,
  icon,
  variant = "outline",
  onSubmit,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  icon: LucideIcon;
  variant?: "outline" | "danger";
  onSubmit: (note: string) => Promise<void>;
}) {
  const { control, handleSubmit, reset, formState } = useForm<ServiceNoteValues>({
    resolver: zodResolver(serviceNoteSchema),
    defaultValues: { note: "" },
  });
  return (
    <View className="gap-3">
      <Controller
        control={control}
        name="note"
        render={({ field }) => (
          <Input label={label} multiline placeholder={placeholder} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.note?.message} />
        )}
      />
      <Button
        title={submitLabel}
        icon={icon}
        variant={variant}
        loading={formState.isSubmitting}
        onPress={handleSubmit(async (v) => {
          await onSubmit(v.note.trim());
          reset();
        })}
      />
    </View>
  );
}

// ───────────────────────── Piezas compartidas ─────────────────────────

function LinkField({ control, name, error }: { control: any; name: "link"; error?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          label="Enlace (opcional)"
          placeholder="https://"
          autoCapitalize="none"
          keyboardType="url"
          icon={ExternalLink}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={error}
        />
      )}
    />
  );
}

function RequestInfo({ request: r, offer }: { request: ServiceRequest; offer: ServiceOffer }) {
  return (
    <Card className="mt-4">
      <Text className="mb-2 text-base font-extrabold text-navy">Solicitud</Text>
      <Text className="text-sm leading-5 text-ink">“{r.message}”</Text>
      <View className="mt-3 gap-1.5">
        <Row icon={Info} text={`${SERVICE_CATEGORY_LABELS[offer.category]} · ${formatModality(offer)}`} />
        <Row icon={CircleDollarSign} text={`${formatRate(offer)} (referencia, se acuerda fuera de NEXO)`} />
        {hasSchedule(r) ? (
          <Row icon={CalendarClock} text={`Horario acordado: ${formatDays(r.days!)} · ${formatRange(r.start!, r.end!)}`} />
        ) : (
          <Row icon={CalendarClock} text="Trabajo remoto, sin horario fijo" />
        )}
      </View>
    </Card>
  );
}

function StoppedInfo({ request: r }: { request: ServiceRequest }) {
  if (r.status === "rechazada") return <Notice tone="danger" text="La solicitud fue rechazada." />;
  if (r.status !== "cancelada") return null;
  const who = r.cancelledBy === "estudiante" ? "el prestador" : "el negocio";
  return <Notice tone="danger" text={`Cancelada por ${who}. Motivo: ${r.cancelReason ?? "sin motivo"}`} />;
}

const UPDATE_ICON: Record<ServiceUpdateKind, { icon: LucideIcon; bg: string; color: string }> = {
  avance: { icon: TrendingUp, bg: "bg-turquoise-50", color: colors.turquoise600 },
  ajuste: { icon: RotateCcw, bg: "bg-amber-50", color: colors.amber },
  cambio_fecha: { icon: CalendarClock, bg: "bg-navy-50", color: colors.navy },
  entrega: { icon: PackageCheck, bg: "bg-coral-50", color: colors.coral },
};

function Timeline({ updates }: { updates: ServiceUpdate[] }) {
  const list = [...updates].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <>
      <SectionTitle title="Bitácora" />
      {list.length === 0 ? (
        <Text className="text-sm text-ink-muted">Aún no hay avances registrados.</Text>
      ) : (
        <Card className="py-1">
          {list.map((u, i) => {
            const { icon: Icon, bg, color } = UPDATE_ICON[u.kind];
            return (
              <View key={u.id} className={`flex-row gap-3 py-3 ${i > 0 ? "border-t border-navy-50" : ""}`}>
                <View className={`h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                  <Icon size={17} color={color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-sm font-bold text-ink">{SERVICE_UPDATE_KIND_LABELS[u.kind]}</Text>
                    <Text className="text-xs text-ink-soft">{formatDate(u.createdAt)}</Text>
                  </View>
                  <Text className="text-sm leading-5 text-ink-muted">{u.message}</Text>
                  {u.link?.startsWith("https://") ? (
                    <Pressable
                      onPress={() => Linking.openURL(u.link!)}
                      accessibilityRole="link"
                      className="mt-1 flex-row items-center gap-1 self-start"
                    >
                      <ExternalLink size={14} color={colors.coral} />
                      <Text className="text-xs font-bold text-coral">Abrir enlace</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </>
  );
}

function ContactRow({ email, hiddenText }: { email: string | null; hiddenText: string }) {
  return email ? (
    <View className="mt-3">
      <Row icon={Mail} text={email} />
    </View>
  ) : (
    <Text className="mt-3 text-xs text-ink-muted">{hiddenText}</Text>
  );
}

function ActionSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <SectionTitle title={title} />
      <View className="gap-3">{children}</View>
    </>
  );
}

const NOTICE_TONE = {
  info: "bg-navy-50 text-navy",
  success: "bg-turquoise-50 text-turquoise-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
} as const;

function Notice({ tone, text }: { tone: keyof typeof NOTICE_TONE; text: string }) {
  const [bg, fg] = NOTICE_TONE[tone].split(" ");
  return (
    <View className={`mt-4 rounded-2xl p-4 ${bg}`}>
      <Text className={`text-sm leading-5 ${fg}`}>{text}</Text>
    </View>
  );
}

function Row({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={15} color={colors.muted} />
      <Text className="flex-1 text-sm text-ink">{text}</Text>
    </View>
  );
}

function NotFound({ back }: { back: string }) {
  return (
    <Screen back title="Solicitud">
      <EmptyState
        icon={FileQuestion}
        title="Solicitud no disponible"
        description="No existe o no tienes acceso a ella."
        actionLabel="Volver"
        onAction={() => router.replace(back as never)}
      />
    </Screen>
  );
}
