import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, KeyRound, Mail, Send } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { Button, Input } from "@/components/ui";
import { studentCodeSchema, studentEmailSchema, type StudentCodeValues, type StudentEmailValues } from "@/lib/schemas";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import { colors } from "@/theme/colors";

/**
 * Verificación opcional con el correo institucional: se envía un código de 6 dígitos y, si es correcto,
 * el negocio ve la insignia "Estudiante verificado". NEXO no guarda el correo institucional.
 */
export function StudentVerification() {
  const { profile, codeStatus } = useCurrentStudent();
  const hasPendingCode = !!codeStatus && new Date(codeStatus.expiresAt) > new Date() && codeStatus.attemptsLeft > 0;
  const [step, setStep] = useState<"email" | "code">(hasPendingCode ? "code" : "email");

  if (!profile) return null;

  if (profile.studentVerified) {
    return (
      <View className="flex-row items-start gap-3 rounded-3xl bg-turquoise-50 p-4">
        <BadgeCheck size={20} color={colors.turquoise600} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-turquoise-700">Estudiante verificado</Text>
          <Text className="text-sm leading-5 text-turquoise-700">
            Los negocios ven tu insignia. Solo guardamos que te verificaste, no tu correo institucional.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-3xl border border-navy-50 bg-white p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-turquoise-50">
          <BadgeCheck size={20} color={colors.turquoise600} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-navy">Verifica que eres estudiante</Text>
          <Text className="text-sm leading-5 text-ink-muted">
            Opcional. Con tu correo institucional obtienes la insignia "Estudiante verificado". No guardamos ese correo.
          </Text>
        </View>
      </View>
      <View className="mt-4">
        {step === "email" ? <EmailStep onSent={() => setStep("code")} /> : <CodeStep onChangeEmail={() => setStep("email")} />}
      </View>
      {profile.academicStatus === "egresado" ? (
        <Text className="mt-3 text-xs text-ink-soft">
          Si ya no tienes correo institucional, tu perfil sigue como "Egresado", sin insignia.
        </Text>
      ) : null}
    </View>
  );
}

function EmailStep({ onSent }: { onSent: () => void }) {
  const { requestStudentEmailCode } = useApp();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentEmailValues>({ resolver: zodResolver(studentEmailSchema), defaultValues: { email: "" } });

  const onSubmit = async ({ email }: StudentEmailValues) => {
    const result = await requestStudentEmailCode(email.trim().toLowerCase());
    if (!result.error) onSent();
  };

  return (
    <View className="gap-3">
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="Correo institucional"
            icon={Mail}
            placeholder="tu.nombre@institucion.edu.mx"
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
      <Button title="Enviar código" icon={Send} variant="secondary" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

function CodeStep({ onChangeEmail }: { onChangeEmail: () => void }) {
  const { verifyStudentEmailCode } = useApp();
  const { codeStatus } = useCurrentStudent();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentCodeValues>({ resolver: zodResolver(studentCodeSchema), defaultValues: { code: "" } });

  const onSubmit = async ({ code }: StudentCodeValues) => {
    const result = await verifyStudentEmailCode(code.trim());
    if (result.error) reset({ code: "" });
  };

  return (
    <View className="gap-3">
      <Text className="text-sm text-ink">
        Te enviamos un código de 6 dígitos. Vence en 10 minutos
        {codeStatus ? ` · ${codeStatus.attemptsLeft} ${codeStatus.attemptsLeft === 1 ? "intento" : "intentos"}` : ""}.
      </Text>
      <Controller
        control={control}
        name="code"
        render={({ field }) => (
          <Input
            label="Código"
            icon={KeyRound}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            value={field.value}
            onChangeText={(t) => field.onChange(t.replace(/\D/g, ""))}
            onBlur={field.onBlur}
            onSubmitEditing={() => handleSubmit(onSubmit)()}
            error={errors.code?.message}
          />
        )}
      />
      <Button title="Verificar" icon={BadgeCheck} variant="secondary" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      <Pressable onPress={onChangeEmail} accessibilityRole="button" className="self-start">
        <Text className="text-sm font-bold text-coral">¿No llegó? Pedir otro código o cambiar el correo</Text>
      </Pressable>
    </View>
  );
}
