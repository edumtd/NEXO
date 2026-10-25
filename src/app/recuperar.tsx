import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { CircleAlert, MailCheck, Mail } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button, Input } from "@/components/ui";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/schemas";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";

/** Paso 1 de "Olvidé mi contraseña": Supabase envía un enlace que abre /restablecer. */
export default function Recuperar() {
  const { requestPasswordReset } = useApp();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    setFormError(null);
    const result = await requestPasswordReset(email.trim());
    if (result.error) return setFormError(result.error);
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <Screen back title="Revisa tu correo" subtitle="Te enviamos un enlace para restablecer tu contraseña">
        <View className="items-center gap-3 rounded-3xl bg-turquoise-50 p-6">
          <MailCheck size={40} color={colors.turquoise600} />
          {/* No confirmamos si el correo tiene cuenta, para no revelar quién usa NEXO. */}
          <Text className="text-center text-base leading-6 text-turquoise-700">
            Si existe una cuenta con <Text className="font-bold">{sentTo}</Text>, recibirás un enlace en unos minutos. Ábrelo
            en este dispositivo para elegir tu nueva contraseña.
          </Text>
          <Text className="text-center text-sm text-ink-muted">¿No llegó? Revisa la carpeta de spam o vuelve a intentarlo más tarde.</Text>
        </View>
        <View className="mt-6 flex-row justify-center">
          <Link href="/login" replace>
            <Text className="text-base font-bold text-coral">Volver a iniciar sesión</Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen back title="Recupera tu cuenta" subtitle="Te enviaremos un enlace para crear una nueva contraseña">
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
              onSubmitEditing={() => handleSubmit(onSubmit)()}
              error={errors.email?.message}
            />
          )}
        />
        {formError && (
          <View className="flex-row items-start gap-3 rounded-2xl bg-red-50 p-4" accessibilityRole="alert">
            <CircleAlert size={18} color={colors.danger} />
            <Text className="flex-1 text-sm leading-5 text-red-700">{formError}</Text>
          </View>
        )}
        <Button title="Enviar enlace" size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}
