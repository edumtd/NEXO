import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { CircleAlert, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button, EmptyState, Input, LoadingState } from "@/components/ui";
import { newPasswordSchema, type NewPasswordValues } from "@/lib/schemas";
import { useApp } from "@/store/AppStore";
import { colors } from "@/theme/colors";

/** Paso 2 de "Olvidé mi contraseña": aquí llega el enlace del correo. */
export default function Restablecer() {
  const { startPasswordRecovery, updatePassword } = useApp();
  const url = Linking.useLinkingURL();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    startPasswordRecovery(url).then((result) => {
      if (!active) return;
      setLinkError(result.error ?? null);
      setStatus(result.error ? "invalid" : "ready");
    });
    return () => {
      active = false;
    };
  }, [url, startPasswordRecovery]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async ({ password }: NewPasswordValues) => {
    setFormError(null);
    const result = await updatePassword(password);
    if (result.error) return setFormError(result.error);
    router.replace({ pathname: "/login", params: { restablecida: "1" } });
  };

  if (status === "checking") return <LoadingState message="Verificando el enlace…" />;

  if (status === "invalid") {
    return (
      <Screen title="Enlace no válido" subtitle="No pudimos verificar tu enlace de recuperación">
        <EmptyState
          icon={CircleAlert}
          title="Solicita un enlace nuevo"
          description={linkError ?? "El enlace expiró o ya se usó."}
          actionLabel="Pedir otro enlace"
          onAction={() => router.replace("/recuperar")}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Nueva contraseña" subtitle="Elige una contraseña que no hayas usado antes">
      <View className="gap-4">
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              label="Nueva contraseña"
              icon={Lock}
              secureTextEntry
              autoComplete="new-password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field }) => (
            <Input
              label="Confirma la contraseña"
              icon={Lock}
              secureTextEntry
              autoComplete="new-password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={() => handleSubmit(onSubmit)()}
              error={errors.confirm?.message}
            />
          )}
        />
        {formError && (
          <View className="flex-row items-start gap-3 rounded-2xl bg-red-50 p-4" accessibilityRole="alert">
            <CircleAlert size={18} color={colors.danger} />
            <Text className="flex-1 text-sm leading-5 text-red-700">{formError}</Text>
          </View>
        )}
        <Button title="Guardar contraseña" size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}
