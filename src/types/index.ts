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

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface Session {
  role: Role;
  userId: string;
}
