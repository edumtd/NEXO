import { z } from "zod";

import type { DayIndex } from "@/types";
import { DISCRIMINATORY_TERMS } from "./constants";

const role = z.enum(["estudiante", "negocio"]);
const category = z.enum(["cafeteria", "restaurante", "comercio", "eventos", "libreria"]);
const email = z.email("Ingresa un correo válido");

export const loginSchema = z.object({
  role,
  email,
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    role,
    name: z.string().trim().min(2, "Escribe tu nombre"),
    email,
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
    isActiveStudent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirm) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "Las contraseñas no coinciden" });
    }
    if (v.role === "estudiante" && !v.isActiveStudent) {
      ctx.addIssue({
        code: "custom",
        path: ["isActiveStudent"],
        message: "Confirma que eres estudiante universitario activo",
      });
    }
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const studentProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre"),
  career: z.string().trim().min(2, "Escribe tu carrera"),
  university: z.string().trim().min(2, "Escribe tu institución"),
  zone: z.string().min(1, "Selecciona una zona"),
  skills: z.array(z.string()).max(10, "Máximo 10 habilidades"),
  interests: z.array(category).min(1, "Elige al menos un interés"),
});
export type StudentProfileValues = z.infer<typeof studentProfileSchema>;

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del negocio"),
  category,
  zone: z.string().min(1, "Selecciona una zona"),
  address: z.string().trim().min(5, "Escribe la dirección"),
  contactEmail: email,
  contactPhone: z.string().trim().regex(/^[0-9 +()-]{8,20}$/, "Teléfono no válido"),
  description: z.string().trim().min(20, "Describe tu negocio (mín. 20 caracteres)").max(400),
});
export type BusinessProfileValues = z.infer<typeof businessProfileSchema>;

/** Convierte texto multilínea en lista sin líneas vacías. */
export const toLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

export function findDiscriminatoryTerm(text: string): string | undefined {
  const t = text.toLowerCase();
  return DISCRIMINATORY_TERMS.find((term) => t.includes(term));
}

const day = z.custom<DayIndex>((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6);

export const vacancySchema = z
  .object({
    title: z.string().trim().min(3, "Escribe un título").max(60, "Máximo 60 caracteres"),
    type: z.enum(["medio_tiempo", "fin_de_semana", "por_evento", "turno_fijo"]),
    salary: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Escribe una cantidad válida")
      .refine((s) => Number(s) > 0, "El sueldo debe ser mayor a 0"),
    salaryPeriod: z.enum(["hora", "dia", "semana", "mes"]),
    days: z.array(day).min(1, "Selecciona al menos un día"),
    start: z.number(),
    end: z.number(),
    zone: z.string().min(1, "Selecciona una zona"),
    address: z.string().trim().min(5, "Escribe la dirección"),
    activities: z.string().refine((s) => toLines(s).length > 0, "Agrega al menos una actividad"),
    requirements: z.string().refine((s) => toLines(s).length > 0, "Agrega al menos un requisito"),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
      .refine((s) => !Number.isNaN(Date.parse(s)), "Fecha no válida"),
    openings: z.number().int().min(1).max(50),
  })
  .superRefine((v, ctx) => {
    if (v.end - v.start < 60) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "El turno debe durar al menos 1 hora" });
    }
    for (const field of ["title", "activities", "requirements"] as const) {
      const term = findDiscriminatoryTerm(v[field]);
      if (term) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `Evita criterios discriminatorios ("${term}"). Describe habilidades o tareas.`,
        });
      }
    }
  });
export type VacancyValues = z.infer<typeof vacancySchema>;
