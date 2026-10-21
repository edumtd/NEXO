import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Lock, Mail, User } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { Checkbox } from "@/components/Checkbox";
import { RoleSelector } from "@/components/RoleSelector";
import { Screen } from "@/components/Screen";
import { Button, Chip, Input } from "@/components/ui";
import { ACADEMIC_STATUS_LABELS } from "@/lib/constants";
import { registerSchema, type RegisterValues } from "@/lib/schemas";
import { useApp } from "@/store/AppStore";
import type { AcademicStatus } from "@/types";

export default function Registro() {
  const { register } = useApp();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "estudiante",
      name: "",
      email: "",
      password: "",
      confirm: "",
      academicStatus: "activo",
      isActiveStudent: false,
    },
  });
  const [role, academicStatus] = watch(["role", "academicStatus"]);

  const onSubmit = async (v: RegisterValues) => {
    await register(v.role, v.name.trim(), v.email.trim(), v.academicStatus);
    // Tras registrarse, el primer paso es completar el perfil.
    router.replace(v.role === "estudiante" ? "/estudiante/perfil" : "/negocio/perfil");
  };

  return (
    <Screen back title="Crea tu cuenta" subtitle="Gratis para estudiantes. Siempre.">
      <Text className="mb-3 text-sm font-semibold text-navy">¿Cómo usarás NEXO?</Text>
      <Controller
        control={control}
        name="role"
        render={({ field }) => <RoleSelector value={field.value} onChange={field.onChange} />}
      />

      <View className="mt-6 gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              label={role === "estudiante" ? "Nombre completo" : "Nombre del negocio"}
              icon={User}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              label="Correo electrónico"
              icon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              label="Contraseña"
              icon={Lock}
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
              hint="Mínimo 8 caracteres"
            />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field }) => (
            <Input
              label="Confirmar contraseña"
              icon={Lock}
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.confirm?.message}
            />
          )}
        />
        {role === "estudiante" && (
          <>
            <Controller
              control={control}
              name="academicStatus"
              render={({ field }) => (
                <View>
                  <Text className="mb-2 text-sm font-semibold text-navy">Estatus</Text>
                  <View className="flex-row gap-2">
                    {(Object.keys(ACADEMIC_STATUS_LABELS) as AcademicStatus[]).map((s) => (
                      <Chip key={s} label={ACADEMIC_STATUS_LABELS[s]} selected={field.value === s} onPress={() => field.onChange(s)} />
                    ))}
                  </View>
                </View>
              )}
            />
            <Controller
              control={control}
              name="isActiveStudent"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onChange={field.onChange}
                  label={`Confirmo que soy ${
                    academicStatus === "egresado" ? "egresado de una institución universitaria" : "estudiante universitario activo"
                  }. Entiendo que NEXO no solicita kardex, calificaciones ni mi horario académico completo.`}
                  error={errors.isActiveStudent?.message}
                />
              )}
            />
          </>
        )}
        <Button title="Crear cuenta" size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-base text-ink-muted">¿Ya tienes cuenta? </Text>
        <Link href="/login" replace>
          <Text className="text-base font-bold text-coral">Inicia sesión</Text>
        </Link>
      </View>
    </Screen>
  );
}
