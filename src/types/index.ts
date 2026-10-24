export type Role = "estudiante" | "negocio";

/** 0 = Lunes ... 6 = Domingo */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Bloque de disponibilidad. `start` y `end` en minutos desde las 00:00. */
export interface AvailabilityBlock {
  id: string;
  day: DayIndex;
  start: number;
  end: number;
}

export type BusinessCategory =
  | "cafeteria"
  | "restaurante"
  | "comercio"
  | "eventos"
  | "libreria";

export type EmploymentType =
  | "medio_tiempo"
  | "fin_de_semana"
  | "por_evento"
  | "turno_fijo";

export type SalaryPeriod = "hora" | "dia" | "semana" | "mes";

export type VacancyStatus = "activa" | "pausada" | "cerrada";

export type ApplicationStatus =
  | "recibida"
  | "entrevista"
  | "aceptada"
  | "rechazada";

export type AcademicStatus = "activo" | "egresado";

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  career: string;
  university: string;
  zone: string;
  skills: string[];
  interests: BusinessCategory[];
  availabilityPeriod: string;
  /** Fin del periodo académico (AAAA-MM-DD). Al pasar, se pide actualizar la disponibilidad. */
  periodEndDate?: string;
  academicStatus: AcademicStatus;
  /** Horas máximas por semana que quiere trabajar. Sin valor = sin límite. Privado. */
  maxWeeklyHours?: number;
  /** Avisos de vacantes nuevas 100% compatibles. Desactivado por defecto. */
  alertsEnabled: boolean;
}

/** Vacante guardada por un estudiante. Privada: el negocio no la ve. */
export interface SavedVacancy {
  studentId: string;
  vacancyId: string;
  savedAt: string;
}

/** Datos del estudiante que un negocio puede ver en Talento (sin correo ni disponibilidad). */
export type PublicStudent = Pick<
  StudentProfile,
  "id" | "fullName" | "career" | "university" | "zone" | "skills" | "academicStatus"
>;

export type ServiceCategory =
  | "marketing"
  | "administracion"
  | "contabilidad"
  | "diseno"
  | "programacion"
  | "fotografia_video"
  | "idiomas"
  | "eventos";

export type ServiceModality = "presencial" | "remoto" | "hibrido";

export type RatePeriod = "hora" | "proyecto";

export type ServiceOfferStatus = "activo" | "pausado";

export type ServiceRequestStatus =
  | "enviada"
  | "aceptada"
  | "en_proceso"
  | "entregada"
  | "completada"
  | "rechazada"
  | "cancelada";

/** Bitácora estructurada de una solicitud (no es chat). "ajuste" lo escribe el negocio; el resto, el prestador. */
export type ServiceUpdateKind = "avance" | "ajuste" | "cambio_fecha" | "entrega";

export interface ServiceUpdate {
  id: string;
  requestId: string;
  kind: ServiceUpdateKind;
  message: string;
  link?: string;
  createdAt: string;
}

export interface ServiceOffer {
  id: string;
  studentId: string;
  title: string;
  category: ServiceCategory;
  description: string;
  deliverables: string[];
  modality: ServiceModality;
  /** Vacío cuando la modalidad es remota. */
  zone: string;
  /** Tarifa de referencia; el pago se acuerda fuera de NEXO. */
  rate: number;
  ratePeriod: RatePeriod;
  portfolioUrl?: string;
  status: ServiceOfferStatus;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  offerId: string;
  businessId: string;
  message: string;
  /** Horario propuesto; solo en servicios presenciales o híbridos. */
  days?: DayIndex[];
  start?: number;
  end?: number;
  status: ServiceRequestStatus;
  /** Fecha estimada de entrega (AAAA-MM-DD); la fija el prestador al aceptar. */
  estimatedDate?: string;
  cancelReason?: string;
  cancelledBy?: Role;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  category: BusinessCategory;
  zone: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  verified: boolean;
  /** Ubicación que el propio negocio coloca en el mapa. Sin pin no aparece en el mapa. */
  latitude?: number;
  longitude?: number;
}

export interface Vacancy {
  id: string;
  businessId: string;
  title: string;
  type: EmploymentType;
  salary: number;
  salaryPeriod: SalaryPeriod;
  days: DayIndex[];
  start: number;
  end: number;
  zone: string;
  address: string;
  activities: string[];
  requirements: string[];
  startDate: string;
  openings: number;
  status: VacancyStatus;
  createdAt: string;
}

export interface Application {
  id: string;
  vacancyId: string;
  studentId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export type NotificationKind = "postulacion" | "solicitud_servicio" | "sistema";

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Ruta interna a abrir al tocarla; siempre empieza con "/". */
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface Session {
  role: Role;
  userId: string;
}

// ───────── Fase B: entrevistas sin chat y reportes ─────────

export interface InterviewSlot {
  /** AAAA-MM-DD */
  date: string;
  start: number;
  end: number;
  /** Dirección corta o "En línea". */
  place: string;
}

export type InterviewStatus = "propuesta" | "confirmada" | "reprogramar";

/** Propuesta de entrevista de una postulación: el negocio propone 2–3 horarios y el estudiante elige. */
export interface InterviewProposal {
  id: string;
  applicationId: string;
  slots: InterviewSlot[];
  selectedIndex?: number;
  status: InterviewStatus;
  createdAt: string;
  updatedAt: string;
}

export type ReportReason = "informacion_falsa" | "discriminacion" | "cobro_indebido" | "otro";
export type ReportTarget = "vacante" | "negocio";

/** Reporte de seguridad. Solo lo ve administración; no hay contadores públicos. */
export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  description: string;
  createdAt: string;
}
