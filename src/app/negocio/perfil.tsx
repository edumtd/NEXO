import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { BadgeCheck, LogOut, Mail, MapPin, Phone, Save, ShieldAlert, Store } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { BusinessIcon } from "@/components/BusinessIcon";
import { BusinessLocationPicker } from "@/components/BusinessLocationPicker";
import { Screen, SectionTitle } from "@/components/Screen";
import { Button, Chip, Input } from "@/components/ui";
import { CATEGORY_LABELS, ZONES } from "@/lib/constants";
import { businessProfileSchema, type BusinessProfileValues } from "@/lib/schemas";
import { useApp, useCurrentBusiness } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { BusinessCategory } from "@/types";

export default function PerfilNegocio() {
  const { updateBusinessProfile, logout } = useApp();
  const { profile } = useCurrentBusiness();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BusinessProfileValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: profile?.name ?? "",
      category: profile?.category ?? "restaurante",
      zone: profile?.zone ?? "",
      address: profile?.address ?? "",
      contactEmail: profile?.contactEmail ?? "",
      contactPhone: profile?.contactPhone ?? "",
      description: profile?.description ?? "",
    },
  });
  const category = watch("category");

  if (!profile) return null;

  const onSubmit = async (values: BusinessProfileValues) => {
    setSaveError(null);
    const { error } = await updateBusinessProfile(values);
    if (error) {
      setSaveError(error);
      return;
    }
    reset(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Screen
      header={
        <View className="items-center pt-2">
          <BusinessIcon category={category} size="lg" />
          <Text className="mt-3 text-2xl font-extrabold text-white">{profile.name}</Text>
          <Text className="text-sm text-navy-100">{CATEGORY_LABELS[profile.category]}</Text>
        </View>
      }
    >
      <View
        className={`flex-row items-start gap-3 rounded-3xl p-4 ${profile.verified ? "bg-turquoise-50" : "bg-amber-50"}`}
      >
        {profile.verified ? (
          <BadgeCheck size={20} color={colors.turquoise600} />
        ) : (
          <ShieldAlert size={20} color={colors.amber} />
        )}
        <View className="flex-1">
          <Text className={`text-sm font-bold ${profile.verified ? "text-turquoise-700" : "text-amber-700"}`}>
            {profile.verified ? "Verificación básica completada" : "Verificación básica pendiente"}
          </Text>
          <Text className={`text-sm leading-5 ${profile.verified ? "text-turquoise-700" : "text-amber-700"}`}>
            {profile.verified
              ? "Los estudiantes verán la insignia en tus vacantes."
              : "Completa todos los datos de contacto y ubicación. El proceso de verificación se habilitará en una próxima versión."}
          </Text>
        </View>
      </View>

      <SectionTitle title="Ubicación en el mapa" />
      <BusinessLocationPicker profile={profile} />

      <SectionTitle title="Datos del negocio" />
      <View className="gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label="Nombre del negocio" icon={Store} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.name?.message} />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <View>
              <Text className="mb-2 text-sm font-semibold text-navy">Giro</Text>
              <View className="flex-row flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as BusinessCategory[]).map((c) => (
                  <Chip key={c} size="sm" label={CATEGORY_LABELS[c]} selected={field.value === c} onPress={() => field.onChange(c)} />
                ))}
              </View>
            </View>
          )}
        />
        <Controller
          control={control}
          name="zone"
          render={({ field }) => (
            <View>
              <Text className="mb-2 text-sm font-semibold text-navy">Zona</Text>
              <View className="flex-row flex-wrap gap-2">
                {ZONES.map((z) => (
                  <Chip key={z} size="sm" label={z} selected={field.value === z} onPress={() => field.onChange(z)} />
                ))}
              </View>
              {errors.zone && <Text className="mt-1 text-xs font-medium text-red-600">{errors.zone.message}</Text>}
            </View>
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <Input label="Dirección" icon={MapPin} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.address?.message} />
          )}
        />
        <Controller
          control={control}
          name="contactEmail"
          render={({ field }) => (
            <Input label="Correo de contacto" icon={Mail} keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.contactEmail?.message} />
          )}
        />
        <Controller
          control={control}
          name="contactPhone"
          render={({ field }) => (
            <Input label="Teléfono de contacto" icon={Phone} keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.contactPhone?.message} />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Input
              label="Descripción"
              multiline
              placeholder="¿Qué hace tu negocio? ¿Cómo es el ambiente de trabajo?"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.description?.message}
            />
          )}
        />
        {saveError && (
          <Text className="rounded-2xl bg-red-50 p-3 text-sm text-red-700" accessibilityRole="alert">
            {saveError}
          </Text>
        )}
        <Button
          title={saved ? "Perfil guardado ✓" : "Guardar perfil"}
          icon={Save}
          loading={isSubmitting}
          disabled={!isDirty && !saved}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <View className="mt-6">
        <Button
          title="Cerrar sesión"
          variant="danger"
          icon={LogOut}
          onPress={() => {
            logout();
            router.replace("/");
          }}
        />
      </View>
    </Screen>
  );
}
