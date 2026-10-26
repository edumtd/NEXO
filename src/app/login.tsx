import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router, useLocalSearchParams } from "expo-router";
import { CircleAlert, CircleCheck, Lock, Mail } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button, Input } from "@/components/ui";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";
import { homeFor } from "@/theme/navigation";

export default function Login() {
  const { login } = useApp();
  const { restablecida } = useLocalSearchParams<{ restablecida?: string }>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    // El rol no se elige aquí: sale del perfil de la cuenta.
    const result = await login(values.email.trim(), values.password);
    if (result.error || !result.role) {
      setFormError(result.error ?? "No pudimos iniciar sesión.");
      return;
    }
    router.replace(homeFor(result.role));
  };

  return (
    <Screen back title="Bienvenido de vuelta" subtitle="Inicia sesión para continuar">
      {!isSupabaseConfigured && <ErrorBox text="Falta configurar Supabase: crea el archivo .env con la URL y la clave del proyecto (ver .env.example)." />}

      {restablecida === "1" && (
        <View className="mb-4 flex-row items-start gap-3 rounded-2xl bg-turquoise-50 p-4" accessibilityRole="alert">
          <CircleCheck size={18} color={colors.turquoise600} />
          <Text className="flex-1 text-sm leading-5 text-turquoise-700">Contraseña actualizada. Inicia sesión con la nueva.</Text>
        </View>
      )}

      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              label="Correo electrónico"
              icon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
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
              autoComplete="password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => handleSubmit(onSubmit)()}
              error={errors.password?.message}
            />
          )}
        />
        <Link href="/recuperar" className="self-end">
          <Text className="text-sm font-bold text-coral">¿Olvidaste tu contraseña?</Text>
        </Link>
        {formError && isSupabaseConfigured && <ErrorBox text={formError} />}
        <Button title="Iniciar sesión" size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-base text-ink-muted">¿No tienes cuenta? </Text>
        <Link href="/registro" replace>
          <Text className="text-base font-bold text-coral">Regístrate</Text>
        </Link>
      </View>
    </Screen>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <View className="mb-4 flex-row items-start gap-3 rounded-2xl bg-red-50 p-4" accessibilityRole="alert">
      <CircleAlert size={18} color={colors.danger} />
      <Text className="flex-1 text-sm leading-5 text-red-700">{text}</Text>
    </View>
  );
}
