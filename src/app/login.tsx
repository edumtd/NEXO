import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { RoleSelector } from "@/components/RoleSelector";
import { Screen } from "@/components/Screen";
import { Button, Input } from "@/components/ui";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { useApp } from "@/store/AppStore";

export default function Login() {
  const { login } = useApp();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: "estudiante", email: "carlos@demo.nexo", password: "demo1234" },
  });

  const onSubmit = async (values: LoginValues) => {
    await login(values.role, values.email);
    router.replace(values.role === "estudiante" ? "/estudiante/inicio" : "/negocio/inicio");
  };

  return (
    <Screen back title="Bienvenido de vuelta" subtitle="Inicia sesión para continuar">
      <Text className="mb-3 text-sm font-semibold text-navy">Entrar como</Text>
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <RoleSelector
            value={field.value}
            onChange={(r) => {
              field.onChange(r);
              setValue("email", r === "estudiante" ? "carlos@demo.nexo" : "contacto@pizzeriaroma.demo");
            }}
          />
        )}
      />

      <View className="mt-6 gap-4">
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
              error={errors.password?.message}
            />
          )}
        />
        <Button title="Iniciar sesión" size="lg" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>

      <View className="mt-6 rounded-3xl bg-turquoise-50 p-4">
        <Text className="text-sm leading-5 text-turquoise-700">
          Modo demostración: cualquier contraseña funciona. Los datos son ficticios y viven solo en esta sesión.
        </Text>
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
