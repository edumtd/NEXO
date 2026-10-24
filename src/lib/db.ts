// Conversión entre las filas de Supabase (snake_case) y los tipos de la app (camelCase).
// Mantener aquí todo el mapeo: AppStore no debe conocer nombres de columnas.
import type {
  AcademicStatus,
  AppNotification,
  Application,
  AvailabilityBlock,
  BusinessCategory,
  BusinessProfile,
  DayIndex,
  InterviewProposal,
  InterviewSlot,
  Role,
  SavedVacancy,
  ServiceOffer,
  ServiceRequest,
  ServiceUpdate,
  StudentProfile,
  Vacancy,
} from "@/types";

export interface StudentRow {
  id: string;
  full_name: string;
  career: string;
  university: string;
  zone: string;
  skills: string[];
  interests: BusinessCategory[];
  availability_period: string;
  academic_status: AcademicStatus;
  max_weekly_hours: number | null;
  period_end_date: string | null;
  alerts_enabled: boolean;
}

export interface BusinessRow {
  id: string;
  name: string;
  category: BusinessCategory;
  zone: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  verified: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface ProfileRow {
  id: string;
  role: Role;
}

/** El correo vive en auth.users; se pasa aparte porque student_profiles no lo guarda. */
export function studentFromRow(row: StudentRow, email: string): StudentProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email,
    career: row.career,
    university: row.university,
    zone: row.zone,
    skills: row.skills ?? [],
    interests: row.interests ?? [],
    availabilityPeriod: row.availability_period,
    academicStatus: row.academic_status,
    maxWeeklyHours: row.max_weekly_hours ?? undefined,
    periodEndDate: row.period_end_date ?? undefined,
    alertsEnabled: row.alerts_enabled,
  };
}

export function businessFromRow(row: BusinessRow): BusinessProfile {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    zone: row.zone,
    address: row.address,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    description: row.description,
    verified: row.verified,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  };
}

type Patch<T> = Partial<Omit<T, "id">>;

/** Solo columnas editables por el propio estudiante. `undefined` se omite; los opcionales se borran con null. */
export function studentPatchToRow(p: Patch<StudentProfile>): Partial<StudentRow> {
  const row: Partial<StudentRow> = {};
  if (p.fullName !== undefined) row.full_name = p.fullName;
  if (p.career !== undefined) row.career = p.career;
  if (p.university !== undefined) row.university = p.university;
  if (p.zone !== undefined) row.zone = p.zone;
  if (p.skills !== undefined) row.skills = p.skills;
  if (p.interests !== undefined) row.interests = p.interests;
  if (p.availabilityPeriod !== undefined) row.availability_period = p.availabilityPeriod;
  if (p.academicStatus !== undefined) row.academic_status = p.academicStatus;
  if ("maxWeeklyHours" in p) row.max_weekly_hours = p.maxWeeklyHours ?? null;
  if ("periodEndDate" in p) row.period_end_date = p.periodEndDate ?? null;
  if (p.alertsEnabled !== undefined) row.alerts_enabled = p.alertsEnabled;
  return row;
}

/** `verified` nunca se envía: solo administración lo cambia. */
export function businessPatchToRow(p: Patch<Omit<BusinessProfile, "verified">>): Partial<BusinessRow> {
  const row: Partial<BusinessRow> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.category !== undefined) row.category = p.category;
  if (p.zone !== undefined) row.zone = p.zone;
  if (p.address !== undefined) row.address = p.address;
  if (p.contactEmail !== undefined) row.contact_email = p.contactEmail;
  if (p.contactPhone !== undefined) row.contact_phone = p.contactPhone;
  if (p.description !== undefined) row.description = p.description;
  if ("latitude" in p) row.latitude = p.latitude ?? null;
  if ("longitude" in p) row.longitude = p.longitude ?? null;
  return row;
}

/** Mensajes de error de Supabase Auth en español. */
export function authErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const m = (error?.message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Ya existe una cuenta con ese correo.";
  if (m.includes("password") && m.includes("characters")) return "La contraseña es demasiado corta.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (m.includes("network") || m.includes("fetch")) return "No hay conexión con el servidor. Revisa tu internet.";
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

// ───────── Etapas 2 y 3: vacantes, postulaciones, disponibilidad, Talento y notificaciones ─────────

export interface VacancyRow {
  id: string;
  business_id: string;
  title: string;
  type: Vacancy["type"];
  salary: number | string;
  salary_period: Vacancy["salaryPeriod"];
  days: DayIndex[];
  start_minute: number;
  end_minute: number;
  zone: string;
  address: string;
  activities: string[];
  requirements: string[];
  start_date: string;
  openings: number;
  status: Vacancy["status"];
  created_at: string;
}

export function vacancyFromRow(r: VacancyRow): Vacancy {
  return {
    id: r.id,
    businessId: r.business_id,
    title: r.title,
    type: r.type,
    salary: Number(r.salary),
    salaryPeriod: r.salary_period,
    days: r.days,
    start: r.start_minute,
    end: r.end_minute,
    zone: r.zone,
    address: r.address,
    activities: r.activities ?? [],
    requirements: r.requirements ?? [],
    startDate: r.start_date,
    openings: r.openings,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function vacancyInputToRow(v: Omit<Vacancy, "id" | "businessId" | "status" | "createdAt">) {
  return {
    title: v.title,
    type: v.type,
    salary: v.salary,
    salary_period: v.salaryPeriod,
    days: v.days,
    start_minute: v.start,
    end_minute: v.end,
    zone: v.zone,
    address: v.address,
    activities: v.activities,
    requirements: v.requirements,
    start_date: v.startDate,
    openings: v.openings,
  };
}

export interface ApplicationRow {
  id: string;
  vacancy_id: string;
  student_id: string;
  status: Application["status"];
  created_at: string;
  updated_at: string;
}

export function applicationFromRow(r: ApplicationRow): Application {
  return {
    id: r.id,
    vacancyId: r.vacancy_id,
    studentId: r.student_id,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface AvailabilityRow {
  id: string;
  student_id: string;
  day: DayIndex;
  start_minute: number;
  end_minute: number;
}

export function availabilityFromRow(r: AvailabilityRow): AvailabilityBlock {
  return { id: r.id, day: r.day, start: r.start_minute, end: r.end_minute };
}

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: AppNotification["kind"];
  link: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function notificationFromRow(r: NotificationRow): AppNotification {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    link: r.link ?? undefined,
    title: r.title,
    body: r.body,
    read: r.read,
    createdAt: r.created_at,
  };
}

export interface ServiceOfferRow {
  id: string;
  student_id: string;
  title: string;
  category: ServiceOffer["category"];
  description: string;
  deliverables: string[];
  modality: ServiceOffer["modality"];
  zone: string;
  rate: number | string;
  rate_period: ServiceOffer["ratePeriod"];
  portfolio_url: string | null;
  status: ServiceOffer["status"];
  created_at: string;
}

export function serviceOfferFromRow(r: ServiceOfferRow): ServiceOffer {
  return {
    id: r.id,
    studentId: r.student_id,
    title: r.title,
    category: r.category,
    description: r.description,
    deliverables: r.deliverables ?? [],
    modality: r.modality,
    zone: r.zone,
    rate: Number(r.rate),
    ratePeriod: r.rate_period,
    portfolioUrl: r.portfolio_url ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function serviceOfferInputToRow(o: Omit<ServiceOffer, "id" | "studentId" | "status" | "createdAt">) {
  return {
    title: o.title,
    category: o.category,
    description: o.description,
    deliverables: o.deliverables,
    modality: o.modality,
    zone: o.zone,
    rate: o.rate,
    rate_period: o.ratePeriod,
    portfolio_url: o.portfolioUrl ?? null,
  };
}

export interface ServiceRequestRow {
  id: string;
  offer_id: string;
  business_id: string;
  message: string;
  days: DayIndex[] | null;
  start_minute: number | null;
  end_minute: number | null;
  status: ServiceRequest["status"];
  estimated_date: string | null;
  cancel_reason: string | null;
  cancelled_by: Role | null;
  created_at: string;
  updated_at: string;
}

export function serviceRequestFromRow(r: ServiceRequestRow): ServiceRequest {
  return {
    id: r.id,
    offerId: r.offer_id,
    businessId: r.business_id,
    message: r.message,
    ...(r.days ? { days: r.days, start: r.start_minute ?? undefined, end: r.end_minute ?? undefined } : {}),
    status: r.status,
    estimatedDate: r.estimated_date ?? undefined,
    cancelReason: r.cancel_reason ?? undefined,
    cancelledBy: r.cancelled_by ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface ServiceUpdateRow {
  id: string;
  request_id: string;
  kind: ServiceUpdate["kind"];
  message: string;
  link: string | null;
  created_at: string;
}

export function serviceUpdateFromRow(r: ServiceUpdateRow): ServiceUpdate {
  return {
    id: r.id,
    requestId: r.request_id,
    kind: r.kind,
    message: r.message,
    link: r.link ?? undefined,
    createdAt: r.created_at,
  };
}

/** Perfil público que devuelve visible_public_students() (sin correo ni disponibilidad). */
export interface PublicStudentRow {
  id: string;
  full_name: string;
  career: string;
  university: string;
  zone: string;
  skills: string[];
  academic_status: AcademicStatus;
}

/** Lo convierte a StudentProfile con campos privados vacíos; el correo solo llega si está permitido. */
export function publicStudentFromRow(r: PublicStudentRow, email = ""): StudentProfile {
  return {
    id: r.id,
    fullName: r.full_name,
    email,
    career: r.career,
    university: r.university,
    zone: r.zone,
    skills: r.skills ?? [],
    interests: [],
    availabilityPeriod: "",
    academicStatus: r.academic_status,
    alertsEnabled: false,
  };
}

export interface SavedVacancyRow {
  student_id: string;
  vacancy_id: string;
  created_at: string;
}

export function savedVacancyFromRow(r: SavedVacancyRow): SavedVacancy {
  return { studentId: r.student_id, vacancyId: r.vacancy_id, savedAt: r.created_at };
}

export interface InterviewRow {
  id: string;
  application_id: string;
  /** Mismas claves que InterviewSlot: date, start, end, place. */
  slots: InterviewSlot[];
  selected_index: number | null;
  status: InterviewProposal["status"];
  created_at: string;
  updated_at: string;
}

export function interviewFromRow(r: InterviewRow): InterviewProposal {
  return {
    id: r.id,
    applicationId: r.application_id,
    slots: r.slots,
    selectedIndex: r.selected_index ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Mensaje en español para errores de la base de datos (RLS, validaciones, red). */
export function dbErrorMessage(error: { message?: string; code?: string } | null | undefined, fallback: string): string {
  const m = (error?.message ?? "").toLowerCase();
  if (error?.code === "23505") return "Ese registro ya existe.";
  if (error?.code === "42501" || m.includes("row-level security")) return "No tienes permiso para hacer esto.";
  if (m.includes("network") || m.includes("fetch")) return "No hay conexión con el servidor. Revisa tu internet.";
  if (m.includes("ya está cerrada")) return "Esta postulación ya está cerrada.";
  if (m.includes("cuando se lo piden")) return "Solo puedes proponer nuevos horarios si la persona pidió otros.";
  if (m.includes("transición no permitida") || m.includes("no permitid")) return "Esta acción ya no está disponible para el estado actual.";
  return fallback;
}
