import type {
  ApplicationStatus,
  BusinessCategory,
  DayIndex,
  EmploymentType,
  SalaryPeriod,
  VacancyStatus,
} from "@/types";

export const DAYS: { value: DayIndex; short: string; long: string }[] = [
  { value: 0, short: "Lun", long: "Lunes" },
  { value: 1, short: "Mar", long: "Martes" },
  { value: 2, short: "Mié", long: "Miércoles" },
  { value: 3, short: "Jue", long: "Jueves" },
  { value: 4, short: "Vie", long: "Viernes" },
  { value: 5, short: "Sáb", long: "Sábado" },
  { value: 6, short: "Dom", long: "Domingo" },
];

export const ZONES = [
  "Zona Universitaria",
  "Centro",
  "Norte",
  "Sur",
  "Oriente",
  "Poniente",
] as const;

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  cafeteria: "Cafetería",
  restaurante: "Restaurante",
  comercio: "Comercio",
  eventos: "Eventos",
  libreria: "Librería",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  medio_tiempo: "Medio tiempo",
  fin_de_semana: "Fin de semana",
  por_evento: "Por evento",
  turno_fijo: "Turno fijo",
};

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  hora: "hora",
  dia: "día",
  semana: "semana",
  mes: "mes",
};

export const VACANCY_STATUS_LABELS: Record<VacancyStatus, string> = {
  activa: "Activa",
  pausada: "Pausada",
  cerrada: "Cerrada",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  recibida: "Recibida",
  entrevista: "Entrevista",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

/** Franjas para filtrar por hora de inicio del turno. */
export const SHIFT_SLOTS = [
  { key: "manana", label: "Mañana", from: 0, to: 12 * 60 },
  { key: "tarde", label: "Tarde", from: 12 * 60, to: 18 * 60 },
  { key: "noche", label: "Noche", from: 18 * 60, to: 24 * 60 },
] as const;

/** Sueldo mínimo por hora (equivalente) para el filtro. */
export const MIN_HOURLY_OPTIONS = [0, 60, 80, 100] as const;

/** Términos que suelen indicar criterios discriminatorios en requisitos. */
export const DISCRIMINATORY_TERMS = [
  "rango de edad",
  "edad entre",
  "edad máxima",
  "edad maxima",
  "género",
  "genero",
  "sexo",
  "hombre",
  "mujer",
  "apariencia",
  "buena presentación",
  "buena presentacion",
  "atractiv",
  "religión",
  "religion",
  "lugar de origen",
  "nacionalidad",
  "estado civil",
  "complexión",
  "complexion",
  "estatura",
];
