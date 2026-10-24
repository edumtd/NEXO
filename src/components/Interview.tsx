import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, CalendarX, Check, CircleCheck, CircleSlash, MapPin, Plus, Send, Trash2, Video } from "lucide-react-native";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { TimeStepper } from "@/components/Pickers";
import { Badge, Button, Chip, Input } from "@/components/ui";
import { evaluateCompatibility } from "@/lib/compatibility";
import { INTERVIEW_STATUS_LABELS, ONLINE_PLACE } from "@/lib/constants";
import { formatDate, formatRange } from "@/lib/format";
import { interviewProposalSchema, type InterviewProposalValues } from "@/lib/schemas";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { AvailabilityBlock, DayIndex, InterviewProposal, InterviewSlot } from "@/types";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** Día de la semana (0 = lunes) de una fecha AAAA-MM-DD. */
export function dayIndexOf(date: string): DayIndex {
  return ((new Date(`${date}T12:00:00`).getDay() + 6) % 7) as DayIndex;
}

function slotText(slot: InterviewSlot) {
  return `${formatDate(slot.date)} · ${formatRange(slot.start, slot.end)}`;
}

function PlaceRow({ place }: { place: string }) {
  const online = place === ONLINE_PLACE;
  const Icon = online ? Video : MapPin;
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon size={14} color={colors.muted} />
      <Text className="text-sm text-ink-muted">{place}</Text>
    </View>
  );
}

// ───────────────────── Negocio ─────────────────────

/** Formulario del negocio: 2 o 3 horarios con fecha, hora y lugar. Sin mensajes libres. */
export function InterviewProposalForm({
  applicationId,
  defaultPlace,
  onCancel,
  onDone,
}: {
  applicationId: string;
  defaultPlace: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { proposeInterview } = useApp();
  const newSlot = (n: number) => ({ date: inDays(n), start: 17 * 60, end: 17 * 60 + 30, place: defaultPlace || ONLINE_PLACE });
  const { control, handleSubmit, formState } = useForm<InterviewProposalValues>({
    resolver: zodResolver(interviewProposalSchema),
    defaultValues: { slots: [newSlot(2), newSlot(3)] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "slots" });
  const errors = formState.errors.slots;

  return (
    <View className="mt-3 gap-3 rounded-2xl bg-navy-50 p-3">
      <Text className="text-sm font-bold text-navy">Propón 2 o 3 horarios de entrevista</Text>
      {fields.map((f, i) => (
        <View key={f.id} className="gap-3 rounded-2xl bg-white p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-ink">Opción {i + 1}</Text>
            {fields.length > 2 && (
              <Pressable onPress={() => remove(i)} accessibilityRole="button" accessibilityLabel={`Quitar opción ${i + 1}`} hitSlop={8}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            )}
          </View>
          <Controller
            control={control}
            name={`slots.${i}.date`}
            render={({ field }) => (
              <Input label="Fecha" placeholder="AAAA-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors?.[i]?.date?.message} />
            )}
          />
          <View className="flex-row gap-3">
            <Controller control={control} name={`slots.${i}.start`} render={({ field }) => <TimeStepper label="Desde" value={field.value} onChange={field.onChange} max={23 * 60} />} />
            <Controller control={control} name={`slots.${i}.end`} render={({ field }) => <TimeStepper label="Hasta" value={field.value} onChange={field.onChange} min={6 * 60 + 30} />} />
          </View>
          {errors?.[i]?.end && <Text className="text-xs font-medium text-red-600">{errors[i]?.end?.message}</Text>}
          <Controller
            control={control}
            name={`slots.${i}.place`}
            render={({ field }) => (
              <View className="gap-2">
                <Input label="Lugar" placeholder="Dirección corta" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors?.[i]?.place?.message} />
                <View className="flex-row gap-2">
                  <Chip size="sm" label={ONLINE_PLACE} selected={field.value === ONLINE_PLACE} onPress={() => field.onChange(ONLINE_PLACE)} />
                  {defaultPlace ? (
                    <Chip size="sm" label="Mi dirección" selected={field.value === defaultPlace} onPress={() => field.onChange(defaultPlace)} />
                  ) : null}
                </View>
              </View>
            )}
          />
        </View>
      ))}
      {errors?.message && <Text className="text-xs font-medium text-red-600">{errors.message}</Text>}
      {fields.length < 3 && (
        <Button title="Agregar opción" size="sm" variant="outline" icon={Plus} onPress={() => append(newSlot(fields.length + 2))} />
      )}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title="Cancelar" size="sm" variant="ghost" onPress={onCancel} />
        </View>
        <View className="flex-1">
          <Button
            title="Enviar horarios"
            size="sm"
            variant="secondary"
            icon={Send}
            loading={formState.isSubmitting}
            onPress={handleSubmit(async (v) => {
              const result = await proposeInterview(applicationId, v.slots.map((s) => ({ ...s, place: s.place.trim() })));
              if (!result.error) onDone();
            })}
          />
        </View>
      </View>
    </View>
  );
}

/** Resumen para el negocio dentro de la tarjeta del postulante. */
export function InterviewSummary({ proposal }: { proposal: InterviewProposal }) {
  const chosen = proposal.selectedIndex !== undefined ? proposal.slots[proposal.selectedIndex] : undefined;
  const tone = proposal.status === "confirmada" ? "success" : proposal.status === "reprogramar" ? "warning" : "info";
  return (
    <View className="mt-3 gap-2 rounded-2xl bg-navy-50 p-3">
      <Badge label={INTERVIEW_STATUS_LABELS[proposal.status]} tone={tone} icon={CalendarCheck} />
      {chosen ? (
        <View>
          <Text className="text-sm font-bold text-ink">{slotText(chosen)}</Text>
          <PlaceRow place={chosen.place} />
        </View>
      ) : proposal.status === "propuesta" ? (
        <Text className="text-sm text-ink-muted">
          Enviaste {proposal.slots.length} horarios. Esperando a que el estudiante elija uno.
        </Text>
      ) : (
        <Text className="text-sm text-ink-muted">Ninguno de los horarios le funcionó. Propón otros.</Text>
      )}
    </View>
  );
}

// ───────────────────── Estudiante ─────────────────────

/**
 * Panel del estudiante: elige un horario o pide otros. Cada opción indica si choca con su
 * disponibilidad; ese cálculo usa sus propios bloques y nunca se envía al negocio.
 */
export function StudentInterviewPanel({ proposal, blocks }: { proposal: InterviewProposal; blocks: AvailabilityBlock[] }) {
  const { respondInterview } = useApp();
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<"elegir" | "otros" | null>(null);

  if (proposal.status === "confirmada" && proposal.selectedIndex !== undefined) {
    const slot = proposal.slots[proposal.selectedIndex];
    return (
      <View className="gap-1 rounded-3xl bg-turquoise-50 p-4">
        <Badge label="Entrevista confirmada" tone="success" icon={CalendarCheck} />
        <Text className="mt-1 text-base font-bold text-ink">{slotText(slot)}</Text>
        <PlaceRow place={slot.place} />
      </View>
    );
  }
  if (proposal.status === "reprogramar") {
    return (
      <View className="rounded-3xl bg-amber-50 p-4">
        <Text className="text-sm leading-5 text-amber-700">
          Pediste otros horarios. Te avisaremos cuando el negocio proponga nuevas opciones.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3 rounded-3xl border border-navy-50 bg-white p-4">
      <Text className="text-base font-extrabold text-navy">Elige un horario de entrevista</Text>
      {proposal.slots.map((slot, i) => {
        const fits = evaluateCompatibility(blocks, { days: [dayIndexOf(slot.date)], start: slot.start, end: slot.end }).level === "compatible";
        const isSelected = selected === i;
        return (
          <Pressable
            key={`${slot.date}-${slot.start}`}
            onPress={() => setSelected(i)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            className={`rounded-2xl border-2 p-3 ${isSelected ? "border-coral bg-coral-50" : "border-navy-100 bg-white active:bg-navy-50"}`}
          >
            <Text className="text-sm font-bold text-ink">{slotText(slot)}</Text>
            <PlaceRow place={slot.place} />
            <View className="mt-1.5 flex-row items-center gap-1">
              {fits ? <CircleCheck size={14} color={colors.turquoise600} /> : <CircleSlash size={14} color={colors.amber} />}
              <Text className={`text-xs font-semibold ${fits ? "text-turquoise-700" : "text-amber-700"}`}>
                {fits ? "Dentro de tu disponibilidad" : "Fuera de tus bloques libres"}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Text className="text-xs text-ink-soft">Solo tú ves si un horario choca con tu disponibilidad.</Text>
      <Button
        title="Confirmar horario"
        icon={Check}
        disabled={selected === null || busy !== null}
        loading={busy === "elegir"}
        onPress={async () => {
          setBusy("elegir");
          await respondInterview(proposal.id, selected);
          setBusy(null);
        }}
      />
      <Button
        title="Ninguno me funciona"
        variant="ghost"
        icon={CalendarX}
        disabled={busy !== null}
        loading={busy === "otros"}
        onPress={async () => {
          setBusy("otros");
          await respondInterview(proposal.id, null);
          setBusy(null);
        }}
      />
    </View>
  );
}

/** Línea breve para tarjetas del estudiante (Mis postulaciones). */
export function InterviewHint({ proposal }: { proposal: InterviewProposal }) {
  if (proposal.status === "confirmada" && proposal.selectedIndex !== undefined) {
    const slot = proposal.slots[proposal.selectedIndex];
    return <Text className="mt-2 text-xs font-semibold text-turquoise-700">Entrevista: {slotText(slot)} · {slot.place}</Text>;
  }
  if (proposal.status === "propuesta") {
    return <Text className="mt-2 text-xs font-bold text-coral">Elige un horario de entrevista →</Text>;
  }
  return <Text className="mt-2 text-xs text-amber-700">Pediste otros horarios de entrevista.</Text>;
}
