import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { BookOpen, CalendarClock, ChevronRight, GraduationCap, LogOut, School, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { Screen, SectionTitle } from "@/components/Screen";
import { TagInput } from "@/components/TagInput";
import { Avatar, Button, Card, Chip, Input } from "@/components/ui";
import { totalWeeklyMinutes } from "@/lib/compatibility";
import { CATEGORY_LABELS, ZONES } from "@/lib/constants";
import { studentProfileSchema, type StudentProfileValues } from "@/lib/schemas";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import type { BusinessCategory } from "@/types";

const SKILL_SUGGESTIONS = ["Atención al cliente", "Caja", "Inventario", "Redes sociales", "Inglés", "Trabajo en equipo"];

export default function PerfilEstudiante() {
  const { updateStudentProfile, logout } = useApp();
  const { profile, blocks } = useCurrentStudent();
  const [saved, setSaved] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<StudentProfileValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? "",
      career: profile?.career ?? "",
      university: profile?.university ?? "",
      zone: profile?.zone ?? "",
      skills: profile?.skills ?? [],
      interests: profile?.interests ?? [],
    },
  });

  if (!profile) return null;

  const onSubmit = async (values: StudentProfileValues) => {
    await updateStudentProfile(values);
    reset(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Screen
      header={
        <View className="items-center pt-2">
          <Avatar name={profile.fullName} size="xl" ring />
          <Text className="mt-3 text-2xl font-extrabold text-white">{profile.fullName}</Text>
          <Text className="text-sm text-navy-100">{profile.email}</Text>
        </View>
      }
    >
      <Card onPress={() => router.push("/estudiante/disponibilidad")}>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-turquoise-50">
            <CalendarClock size={22} color={colors.turquoise600} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-navy">Disponibilidad semanal</Text>
            <Text className="text-sm text-ink-muted">
              {Math.round(totalWeeklyMinutes(blocks) / 60)} h · {profile.availabilityPeriod || "Sin periodo"}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.soft} />
        </View>
      </Card>

      <SectionTitle title="Datos del perfil" />
      <View className="gap-4">
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <Input label="Nombre" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.fullName?.message} />
          )}
        />
        <Controller
          control={control}
          name="career"
          render={({ field }) => (
            <Input label="Carrera" icon={BookOpen} placeholder="Ej. Psicología" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.career?.message} />
          )}
        />
        <Controller
          control={control}
          name="university"
          render={({ field }) => (
            <Input label="Institución" icon={School} placeholder="Tu universidad o instituto" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.university?.message} />
          )}
        />
        <Controller
          control={control}
          name="zone"
          render={({ field }) => (
            <View>
              <Text className="mb-2 text-sm font-semibold text-navy">Zona donde prefieres trabajar</Text>
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
          name="skills"
          render={({ field }) => (
            <TagInput
              label="Habilidades"
              placeholder="Escribe y presiona +"
              value={field.value}
              onChange={field.onChange}
              suggestions={SKILL_SUGGESTIONS}
              error={errors.skills?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="interests"
          render={({ field }) => (
            <View>
              <Text className="mb-2 text-sm font-semibold text-navy">Intereses laborales</Text>
              <View className="flex-row flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as BusinessCategory[]).map((c) => {
                  const selected = field.value.includes(c);
                  return (
                    <Chip
                      key={c}
                      size="sm"
                      label={CATEGORY_LABELS[c]}
                      selected={selected}
                      onPress={() => field.onChange(selected ? field.value.filter((x) => x !== c) : [...field.value, c])}
                    />
                  );
                })}
              </View>
              {errors.interests && <Text className="mt-1 text-xs font-medium text-red-600">{errors.interests.message}</Text>}
            </View>
          )}
        />
        <Button
          title={saved ? "Perfil guardado ✓" : "Guardar perfil"}
          icon={GraduationCap}
          loading={isSubmitting}
          disabled={!isDirty && !saved}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <View className="mt-6 flex-row items-start gap-3 rounded-3xl bg-navy-50 p-4">
        <ShieldCheck size={18} color={colors.navy} />
        <Text className="flex-1 text-sm leading-5 text-navy">
          NEXO no solicita kardex, calificaciones, fotografía, edad, género ni horario académico completo. Los negocios
          solo ven tu perfil cuando te postulas a sus vacantes.
        </Text>
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
