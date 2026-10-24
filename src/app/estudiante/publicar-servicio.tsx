import { zodResolver } from "@hookform/resolvers/zod";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Info, Link2, Send } from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { Screen, SectionTitle } from "@/components/Screen";
import { Button, Chip, Input } from "@/components/ui";
import { useMyServiceOffers } from "@/hooks/useServiceOffers";
import {
  RATE_PERIOD_LABELS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MODALITY_LABELS,
  ZONES,
} from "@/lib/constants";
import { serviceOfferSchema, toLines, type ServiceOfferValues } from "@/lib/schemas";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { RatePeriod, ServiceCategory, ServiceModality, ServiceOffer } from "@/types";

export default function PublicarServicio() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const offers = useMyServiceOffers();
  const { profile } = useCurrentStudent();
  const [formKey, setFormKey] = useState(0);
  // Las pestañas quedan montadas; reiniciamos el formulario cada vez que se enfoca.
  useFocusEffect(useCallback(() => setFormKey((k) => k + 1), [id]));

  const existing = id ? offers.find((o) => o.id === id) : undefined;
  return <ServiceForm key={`${id ?? "new"}-${formKey}`} existing={existing} defaultZone={profile?.zone ?? ""} />;
}

function ServiceForm({ existing, defaultZone }: { existing?: ServiceOffer; defaultZone: string }) {
  const { saveServiceOffer } = useApp();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceOfferValues>({
    resolver: zodResolver(serviceOfferSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          category: existing.category,
          description: existing.description,
          deliverables: existing.deliverables.join("\n"),
          modality: existing.modality,
          zone: existing.zone,
          rate: String(existing.rate),
          ratePeriod: existing.ratePeriod,
          portfolioUrl: existing.portfolioUrl ?? "",
        }
      : {
          title: "",
          category: "marketing",
          description: "",
          deliverables: "",
          modality: "presencial",
          zone: defaultZone,
          rate: "",
          ratePeriod: "hora",
          portfolioUrl: "",
        },
  });
  const modality = watch("modality");

  const onSubmit = async (v: ServiceOfferValues) => {
    const result = await saveServiceOffer(
      {
        title: v.title.trim(),
        category: v.category,
        description: v.description.trim(),
        deliverables: toLines(v.deliverables),
        modality: v.modality,
        zone: v.modality === "remoto" ? "" : v.zone,
        rate: Number(v.rate),
        ratePeriod: v.ratePeriod,
        portfolioUrl: v.portfolioUrl || undefined,
      },
      existing?.id
    );
    if (!result.error) router.replace("/estudiante/servicios");
  };

  return (
    <Screen
      back
      title={existing ? "Editar servicio" : "Publicar servicio"}
      subtitle="Describe lo que sabes hacer y qué entregas"
      footer={
        <Button
          title={existing ? "Guardar cambios" : "Publicar servicio"}
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
            <Input
              label="Título del servicio"
              placeholder="Ej. Contenido para redes sociales"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.title?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <ChipGroup label="Categoría">
              {(Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map((c) => (
                <Chip key={c} size="sm" label={SERVICE_CATEGORY_LABELS[c]} selected={field.value === c} onPress={() => field.onChange(c)} />
              ))}
            </ChipGroup>
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Input
              label="Descripción"
              multiline
              placeholder="¿Qué haces y cómo ayudas al negocio?"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.description?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="deliverables"
          render={({ field }) => (
            <Input
              label="Entregables"
              multiline
              placeholder={"Uno por línea\nCalendario mensual de publicaciones\n3 publicaciones por semana"}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.deliverables?.message}
            />
          )}
        />
      </View>

      <SectionTitle title="Modalidad" />
      <View className="gap-4">
        <Controller
          control={control}
          name="modality"
          render={({ field }) => (
            <ChipGroup label="¿Dónde trabajas?">
              {(Object.keys(SERVICE_MODALITY_LABELS) as ServiceModality[]).map((m) => (
                <Chip key={m} size="sm" label={SERVICE_MODALITY_LABELS[m]} selected={field.value === m} onPress={() => field.onChange(m)} />
              ))}
            </ChipGroup>
          )}
        />
        {modality === "remoto" ? (
          <Text className="text-sm text-ink-muted">
            En servicios remotos no se usa tu disponibilidad semanal.
          </Text>
        ) : (
          <>
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
            <View className="flex-row items-start gap-3 rounded-3xl bg-turquoise-50 p-4">
              <Info size={18} color={colors.turquoise600} />
              <Text className="flex-1 text-sm leading-5 text-turquoise-700">
                Cuando un negocio proponga un horario, verá si es compatible con tu disponibilidad, pero nunca tus
                bloques.
              </Text>
            </View>
          </>
        )}
      </View>

      <SectionTitle title="Tarifa de referencia" />
      <View className="gap-3">
        <Controller
          control={control}
          name="rate"
          render={({ field }) => (
            <Input
              label="Monto (MXN)"
              placeholder="Ej. 180"
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.rate?.message}
              hint="Es informativa: el pago se acuerda directamente con el negocio, fuera de NEXO."
            />
          )}
        />
        <Controller
          control={control}
          name="ratePeriod"
          render={({ field }) => (
            <ChipGroup label="Por">
              {(Object.keys(RATE_PERIOD_LABELS) as RatePeriod[]).map((p) => (
                <Chip key={p} size="sm" label={RATE_PERIOD_LABELS[p]} selected={field.value === p} onPress={() => field.onChange(p)} />
              ))}
            </ChipGroup>
          )}
        />
      </View>

      <SectionTitle title="Portafolio (opcional)" />
      <Controller
        control={control}
        name="portfolioUrl"
        render={({ field }) => (
          <Input
            icon={Link2}
            placeholder="https://"
            autoCapitalize="none"
            keyboardType="url"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.portfolioUrl?.message}
          />
        )}
      />
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
