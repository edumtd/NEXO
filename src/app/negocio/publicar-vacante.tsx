import { zodResolver } from "@hookform/resolvers/zod";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Info, MapPin, Send } from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { DayPicker, NumberStepper, TimeStepper } from "@/components/Pickers";
import { Screen, SectionTitle } from "@/components/Screen";
import { Button, Chip, Input } from "@/components/ui";
import { EMPLOYMENT_TYPE_LABELS, SALARY_PERIOD_LABELS, ZONES } from "@/lib/constants";
import { formatMoney, hourlyRate, todayISO, weeklyHours } from "@/lib/format";
import { toLines, vacancySchema, type VacancyValues } from "@/lib/schemas";
import { useApp, useCurrentBusiness } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { EmploymentType, SalaryPeriod, Vacancy } from "@/types";

export default function PublicarVacante() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { vacancies, profile } = useCurrentBusiness();
  const [formKey, setFormKey] = useState(0);
  // Las pestañas quedan montadas; reiniciamos el formulario cada vez que se enfoca.
  useFocusEffect(useCallback(() => setFormKey((k) => k + 1), [id]));

  const existing = id ? vacancies.find((v) => v.id === id) : undefined;
  return (
    <VacancyForm
      key={`${id ?? "new"}-${formKey}`}
      existing={existing}
      defaultZone={profile?.zone ?? ""}
      defaultAddress={profile?.address ?? ""}
    />
  );
}

function VacancyForm({
  existing,
  defaultZone,
  defaultAddress,
}: {
  existing?: Vacancy;
  defaultZone: string;
  defaultAddress: string;
}) {
  const { saveVacancy } = useApp();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VacancyValues>({
    resolver: zodResolver(vacancySchema),
    defaultValues: existing
      ? {
          title: existing.title,
          type: existing.type,
          salary: String(existing.salary),
          salaryPeriod: existing.salaryPeriod,
          days: existing.days,
          start: existing.start,
          end: existing.end,
          zone: existing.zone,
          address: existing.address,
          activities: existing.activities.join("\n"),
          requirements: existing.requirements.join("\n"),
          startDate: existing.startDate,
          openings: existing.openings,
        }
      : {
          title: "",
          type: "medio_tiempo",
          salary: "",
          salaryPeriod: "hora",
          days: [],
          start: 16 * 60,
          end: 20 * 60,
          zone: defaultZone,
          address: defaultAddress,
          activities: "",
          requirements: "",
          startDate: todayISO(),
          openings: 1,
        },
  });

  const [salary, salaryPeriod, days, start, end] = watch(["salary", "salaryPeriod", "days", "start", "end"]);
  const preview =
    Number(salary) > 0 && days.length > 0 && end > start
      ? { hourly: hourlyRate({ salary: Number(salary), salaryPeriod, days, start, end }), weekly: weeklyHours({ days, start, end }) }
      : null;

  const onSubmit = async (v: VacancyValues) => {
    await saveVacancy(
      {
        title: v.title.trim(),
        type: v.type,
        salary: Number(v.salary),
        salaryPeriod: v.salaryPeriod,
        days: v.days,
        start: v.start,
        end: v.end,
        zone: v.zone,
        address: v.address.trim(),
        activities: toLines(v.activities),
        requirements: toLines(v.requirements),
        startDate: v.startDate,
        openings: v.openings,
      },
      existing?.id
    );
    router.replace("/negocio/vacantes");
  };

  return (
    <Screen
      back
      title={existing ? "Editar vacante" : "Publicar vacante"}
      subtitle="Todos los campos son obligatorios"
      footer={
        <Button
          title={existing ? "Guardar cambios" : "Publicar vacante"}
          icon={Send}
          size="lg"
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      }
    >
      <View className="gap-4">
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <Input label="Título del puesto" placeholder="Ej. Mesero fin de semana" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.title?.message} />
          )}
        />
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <ChipGroup label="Tipo de empleo">
              {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((t) => (
                <Chip key={t} size="sm" label={EMPLOYMENT_TYPE_LABELS[t]} selected={field.value === t} onPress={() => field.onChange(t)} />
              ))}
            </ChipGroup>
          )}
        />
      </View>

      <SectionTitle title="Sueldo" />
      <View className="gap-3">
        <Controller
          control={control}
          name="salary"
          render={({ field }) => (
            <Input label="Monto (MXN)" placeholder="Ej. 80" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.salary?.message} />
          )}
        />
        <Controller
          control={control}
          name="salaryPeriod"
          render={({ field }) => (
            <ChipGroup label="Pago por">
              {(Object.keys(SALARY_PERIOD_LABELS) as SalaryPeriod[]).map((p) => (
                <Chip key={p} size="sm" label={SALARY_PERIOD_LABELS[p]} selected={field.value === p} onPress={() => field.onChange(p)} />
              ))}
            </ChipGroup>
          )}
        />
      </View>

      <SectionTitle title="Horario" />
      <Controller
        control={control}
        name="days"
        render={({ field }) => (
          <View>
            <Text className="mb-2 text-sm font-semibold text-navy">Días laborales</Text>
            <DayPicker value={field.value} onChange={field.onChange} />
            {errors.days && <Text className="mt-1 text-xs font-medium text-red-600">{errors.days.message}</Text>}
          </View>
        )}
      />
      <View className="mt-4 flex-row gap-3">
        <Controller control={control} name="start" render={({ field }) => <TimeStepper label="Entrada" value={field.value} onChange={field.onChange} max={23 * 60} />} />
        <Controller control={control} name="end" render={({ field }) => <TimeStepper label="Salida" value={field.value} onChange={field.onChange} min={7 * 60} />} />
      </View>
      {errors.end && <Text className="mt-1 text-xs font-medium text-red-600">{errors.end.message}</Text>}

      {preview && (
        <View className="mt-4 flex-row items-center gap-3 rounded-3xl bg-turquoise-50 p-4">
          <Info size={18} color={colors.turquoise600} />
          <Text className="flex-1 text-sm leading-5 text-turquoise-700">
            {preview.weekly} h por semana · equivale a {formatMoney(preview.hourly)} por hora. Los estudiantes verán este
            cálculo para comparar vacantes.
          </Text>
        </View>
      )}

      <SectionTitle title="Ubicación" />
      <View className="gap-4">
        <Controller
          control={control}
          name="zone"
          render={({ field }) => (
            <ChipGroup label="Zona" error={errors.zone?.message}>
              {ZONES.map((z) => (
                <Chip key={z} size="sm" label={z} selected={field.value === z} onPress={() => field.onChange(z)} />
              ))}
            </ChipGroup>
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <Input label="Dirección" icon={MapPin} placeholder="Calle, número, referencia" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.address?.message} />
          )}
        />
      </View>

      <SectionTitle title="Detalle del puesto" />
      <View className="gap-4">
        <Controller
          control={control}
          name="activities"
          render={({ field }) => (
            <Input label="Actividades" multiline placeholder={"Una por línea\nAtender mesas\nCobrar en caja"} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.activities?.message} />
          )}
        />
        <Controller
          control={control}
          name="requirements"
          render={({ field }) => (
            <Input
              label="Requisitos"
              multiline
              placeholder={"Una por línea\nPuntualidad\nManejo básico de dinero"}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.requirements?.message}
              hint="Describe habilidades o tareas. No pidas edad, género, apariencia, religión, origen ni estado civil."
            />
          )}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <Input label="Fecha de inicio" placeholder="AAAA-MM-DD" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.startDate?.message} />
              )}
            />
          </View>
          <Controller control={control} name="openings" render={({ field }) => <NumberStepper label="Nº de vacantes" value={field.value} onChange={field.onChange} />} />
        </View>
      </View>
    </Screen>
  );
}

function ChipGroup({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-navy">{label}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
      {error && <Text className="mt-1 text-xs font-medium text-red-600">{error}</Text>}
    </View>
  );
}
