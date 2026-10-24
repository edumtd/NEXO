import type {
  AcademicStatus,
  ApplicationStatus,
  BusinessCategory,
  DayIndex,
  EmploymentType,
  InterviewStatus,
  ReportReason,
  RatePeriod,
  SalaryPeriod,
  ServiceCategory,
  ServiceModality,
  ServiceOfferStatus,
  ServiceRequestStatus,
  ServiceUpdateKind,
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

export const ACADEMIC_STATUS_LABELS: Record<AcademicStatus, string> = {
  activo: "Estudiante activo",
  egresado: "Egresado",
};

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  marketing: "Marketing y redes",
  administracion: "Administración",
  contabilidad: "Contabilidad",
  diseno: "Diseño gráfico",
  programacion: "Programación y web",
  fotografia_video: "Fotografía y video",
  idiomas: "Idiomas y traducción",
  eventos: "Apoyo en eventos",
};

export const SERVICE_MODALITY_LABELS: Record<ServiceModality, string> = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
};

export const RATE_PERIOD_LABELS: Record<RatePeriod, string> = {
  hora: "hora",
  proyecto: "proyecto",
};

/** Topes del filtro "tarifa máxima", según el periodo de la tarifa. */
export const MAX_RATE_OPTIONS: Record<RatePeriod, number[]> = {
  hora: [150, 250, 400],
  proyecto: [1000, 2500, 5000],
};

export const SERVICE_OFFER_STATUS_LABELS: Record<ServiceOfferStatus, string> = {
  activo: "Activo",
  pausado: "Pausado",
};

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  enviada: "Enviada",
  aceptada: "Aceptada",
  en_proceso: "En proceso",
  entregada: "Entregada",
  completada: "Finalizada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

/** Estados en los que el negocio puede ver el correo del prestador. */
export const SERVICE_CONTACT_VISIBLE: ServiceRequestStatus[] = ["aceptada", "en_proceso", "entregada", "completada"];

/** Estados de una solicitud que aún sigue abierta (bloquean enviar otra al mismo servicio). */
export const SERVICE_REQUEST_OPEN: ServiceRequestStatus[] = ["enviada", "aceptada", "en_proceso", "entregada"];

export const SERVICE_UPDATE_KIND_LABELS: Record<ServiceUpdateKind, string> = {
  avance: "Avance",
  ajuste: "Ajustes solicitados",
  cambio_fecha: "Cambio de fecha estimada",
  entrega: "Entrega",
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

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  propuesta: "Horarios propuestos",
  confirmada: "Entrevista confirmada",
  reprogramar: "Pidió otros horarios",
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  informacion_falsa: "Información falsa",
  discriminacion: "Criterio discriminatorio",
  cobro_indebido: "Cobro o solicitud indebida",
  otro: "Otro",
};

/** Lugar especial para entrevistas a distancia. */
export const ONLINE_PLACE = "En línea";
