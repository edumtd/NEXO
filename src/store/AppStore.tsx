// Store en memoria para el prototipo. Las acciones son asíncronas a propósito:
// cuando conectemos Supabase, solo cambia la implementación de este archivo.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  DEMO_BUSINESS_ID,
  DEMO_STUDENT_ID,
  mockApplications,
  mockAvailability,
  mockBusinesses,
  mockNotifications,
  mockServiceOffers,
  mockServiceRequests,
  mockStudents,
  mockVacancies,
} from "@/data/mock";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { todayISO, uid } from "@/lib/format";
import type {
  AcademicStatus,
  AppNotification,
  Application,
  ApplicationStatus,
  AvailabilityBlock,
  BusinessProfile,
  Role,
  ServiceOffer,
  ServiceOfferStatus,
  ServiceRequest,
  Session,
  StudentProfile,
  Vacancy,
  VacancyStatus,
} from "@/types";

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export type VacancyInput = Omit<Vacancy, "id" | "businessId" | "status" | "createdAt">;
export type ServiceOfferInput = Omit<ServiceOffer, "id" | "studentId" | "status" | "createdAt">;
export type ServiceRequestInput = Pick<ServiceRequest, "offerId" | "message" | "days" | "start" | "end">;

interface AppState {
  session: Session | null;
  students: StudentProfile[];
  businesses: BusinessProfile[];
  availability: Record<string, AvailabilityBlock[]>;
  vacancies: Vacancy[];
  applications: Application[];
  notifications: AppNotification[];
  serviceOffers: ServiceOffer[];
  serviceRequests: ServiceRequest[];
}

interface AppActions {
  login: (role: Role, email: string) => Promise<void>;
  register: (role: Role, name: string, email: string, academicStatus?: AcademicStatus) => Promise<void>;
  logout: () => void;
  updateStudentProfile: (patch: Partial<Omit<StudentProfile, "id">>) => Promise<void>;
  setAvailability: (blocks: AvailabilityBlock[], period?: string) => Promise<void>;
  applyToVacancy: (vacancyId: string) => Promise<void>;
  updateBusinessProfile: (patch: Partial<Omit<BusinessProfile, "id" | "verified">>) => Promise<void>;
  saveVacancy: (input: VacancyInput, id?: string) => Promise<string>;
  setVacancyStatus: (id: string, status: VacancyStatus) => Promise<void>;
  setApplicationStatus: (id: string, status: ApplicationStatus) => Promise<void>;
  markNotificationsRead: () => void;
  saveServiceOffer: (input: ServiceOfferInput, id?: string) => Promise<string>;
  setServiceOfferStatus: (id: string, status: ServiceOfferStatus) => Promise<void>;
  sendServiceRequest: (input: ServiceRequestInput) => Promise<void>;
  respondServiceRequest: (id: string, status: "aceptada" | "rechazada") => Promise<void>;
  completeServiceRequest: (id: string) => Promise<void>;
}

type AppContextValue = AppState & AppActions;

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    session: null,
    students: mockStudents,
    businesses: mockBusinesses,
    availability: mockAvailability,
    vacancies: mockVacancies,
    applications: mockApplications,
    notifications: mockNotifications,
    serviceOffers: mockServiceOffers,
    serviceRequests: mockServiceRequests,
  });

  const login = useCallback(async (role: Role, email: string) => {
    await delay();
    setState((s) => {
      const list = role === "estudiante" ? s.students : s.businesses;
      const match = list.find((u) =>
        "email" in u ? u.email === email : u.contactEmail === email
      );
      const userId = match?.id ?? (role === "estudiante" ? DEMO_STUDENT_ID : DEMO_BUSINESS_ID);
      return { ...s, session: { role, userId } };
    });
  }, []);

  const register = useCallback<AppActions["register"]>(async (role, name, email, academicStatus = "activo") => {
    await delay();
    setState((s) => {
      if (role === "estudiante") {
        const id = uid("stu");
        const profile: StudentProfile = {
          id,
          fullName: name,
          email,
          career: "",
          university: "",
          zone: "",
          skills: [],
          interests: [],
          availabilityPeriod: "",
          academicStatus,
        };
        return {
          ...s,
          students: [...s.students, profile],
          availability: { ...s.availability, [id]: [] },
          session: { role, userId: id },
        };
      }
      const id = uid("biz");
      const profile: BusinessProfile = {
        id,
        name,
        category: "restaurante",
        zone: "",
        address: "",
        contactEmail: email,
        contactPhone: "",
        description: "",
        verified: false,
      };
      return { ...s, businesses: [...s.businesses, profile], session: { role, userId: id } };
    });
  }, []);

  const logout = useCallback(() => setState((s) => ({ ...s, session: null })), []);

  const updateStudentProfile = useCallback<AppActions["updateStudentProfile"]>(async (patch) => {
    await delay();
    setState((s) => ({
      ...s,
      students: s.students.map((p) => (p.id === s.session?.userId ? { ...p, ...patch } : p)),
    }));
  }, []);

  const setAvailability = useCallback<AppActions["setAvailability"]>(async (blocks, period) => {
    await delay();
    setState((s) => {
      const userId = s.session?.userId;
      if (!userId) return s;
      return {
        ...s,
        availability: { ...s.availability, [userId]: blocks },
        students:
          period === undefined
            ? s.students
            : s.students.map((p) => (p.id === userId ? { ...p, availabilityPeriod: period } : p)),
      };
    });
  }, []);

  const applyToVacancy = useCallback(async (vacancyId: string) => {
    await delay();
    setState((s) => {
      const studentId = s.session?.userId;
      if (!studentId) return s;
      if (s.applications.some((a) => a.vacancyId === vacancyId && a.studentId === studentId)) return s;
      const now = todayISO();
      return {
        ...s,
        applications: [
          ...s.applications,
          { id: uid("ap"), vacancyId, studentId, status: "recibida", createdAt: now, updatedAt: now },
        ],
      };
    });
  }, []);

  const updateBusinessProfile = useCallback<AppActions["updateBusinessProfile"]>(async (patch) => {
    await delay();
    setState((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === s.session?.userId ? { ...b, ...patch } : b)),
    }));
  }, []);

  const saveVacancy = useCallback<AppActions["saveVacancy"]>(async (input, id) => {
    await delay();
    const vacancyId = id ?? uid("v");
    setState((s) => {
      const businessId = s.session?.userId;
      if (!businessId) return s;
      if (id) {
        return {
          ...s,
          vacancies: s.vacancies.map((v) =>
            v.id === id && v.businessId === businessId ? { ...v, ...input } : v
          ),
        };
      }
      const vacancy: Vacancy = {
        ...input,
        id: vacancyId,
        businessId,
        status: "activa",
        createdAt: todayISO(),
      };
      return { ...s, vacancies: [vacancy, ...s.vacancies] };
    });
    return vacancyId;
  }, []);

  const setVacancyStatus = useCallback(async (id: string, status: VacancyStatus) => {
    await delay(200);
    setState((s) => ({
      ...s,
      vacancies: s.vacancies.map((v) =>
        v.id === id && v.businessId === s.session?.userId ? { ...v, status } : v
      ),
    }));
  }, []);

  const setApplicationStatus = useCallback(async (id: string, status: ApplicationStatus) => {
    await delay(200);
    setState((s) => {
      const app = s.applications.find((a) => a.id === id);
      const vacancy = app && s.vacancies.find((v) => v.id === app.vacancyId);
      if (!app || !vacancy || vacancy.businessId !== s.session?.userId) return s;
      const business = s.businesses.find((b) => b.id === vacancy.businessId);
      const notification: AppNotification = {
        id: uid("n"),
        userId: app.studentId,
        title: "Tu postulación cambió de estado",
        body: `${business?.name ?? "El negocio"} marcó tu postulación a "${vacancy.title}" como ${APPLICATION_STATUS_LABELS[status]}.`,
        createdAt: todayISO(),
        read: false,
      };
      return {
        ...s,
        applications: s.applications.map((a) =>
          a.id === id ? { ...a, status, updatedAt: todayISO() } : a
        ),
        notifications: [notification, ...s.notifications],
      };
    });
  }, []);

  const markNotificationsRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.userId === s.session?.userId ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const saveServiceOffer = useCallback<AppActions["saveServiceOffer"]>(async (input, id) => {
    await delay();
    const offerId = id ?? uid("so");
    setState((s) => {
      if (s.session?.role !== "estudiante") return s;
      const studentId = s.session.userId;
      if (id) {
        return {
          ...s,
          serviceOffers: s.serviceOffers.map((o) =>
            o.id === id && o.studentId === studentId ? { ...o, ...input } : o
          ),
        };
      }
      const offer: ServiceOffer = { ...input, id: offerId, studentId, status: "activo", createdAt: todayISO() };
      return { ...s, serviceOffers: [offer, ...s.serviceOffers] };
    });
    return offerId;
  }, []);

  const setServiceOfferStatus = useCallback(async (id: string, status: ServiceOfferStatus) => {
    await delay(200);
    setState((s) => {
      if (s.session?.role !== "estudiante") return s;
      const studentId = s.session.userId;
      return {
        ...s,
        serviceOffers: s.serviceOffers.map((o) =>
          o.id === id && o.studentId === studentId ? { ...o, status } : o
        ),
      };
    });
  }, []);

  const sendServiceRequest = useCallback<AppActions["sendServiceRequest"]>(async (input) => {
    await delay();
    setState((s) => {
      if (s.session?.role !== "negocio") return s;
      const businessId = s.session.userId;
      const offer = s.serviceOffers.find((o) => o.id === input.offerId && o.status === "activo");
      if (!offer) return s;
      // Una sola solicitud abierta por servicio y negocio.
      const open = s.serviceRequests.some(
        (r) =>
          r.offerId === offer.id &&
          r.businessId === businessId &&
          (r.status === "enviada" || r.status === "aceptada")
      );
      if (open) return s;
      const now = todayISO();
      const business = s.businesses.find((b) => b.id === businessId);
      const request: ServiceRequest = {
        id: uid("sr"),
        offerId: offer.id,
        businessId,
        message: input.message,
        ...(offer.modality === "remoto" ? {} : { days: input.days, start: input.start, end: input.end }),
        status: "enviada",
        createdAt: now,
        updatedAt: now,
      };
      const notification: AppNotification = {
        id: uid("n"),
        userId: offer.studentId,
        title: "Nueva solicitud de servicio",
        body: `${business?.name ?? "Un negocio"} te envió una solicitud para "${offer.title}".`,
        createdAt: now,
        read: false,
      };
      return {
        ...s,
        serviceRequests: [request, ...s.serviceRequests],
        notifications: [notification, ...s.notifications],
      };
    });
  }, []);

  const respondServiceRequest = useCallback<AppActions["respondServiceRequest"]>(async (id, status) => {
    await delay(200);
    setState((s) => {
      if (s.session?.role !== "estudiante") return s;
      const request = s.serviceRequests.find((r) => r.id === id);
      const offer = request && s.serviceOffers.find((o) => o.id === request.offerId);
      if (!request || !offer || offer.studentId !== s.session.userId || request.status !== "enviada") return s;
      const student = s.students.find((st) => st.id === offer.studentId);
      const now = todayISO();
      const notification: AppNotification = {
        id: uid("n"),
        userId: request.businessId,
        title: status === "aceptada" ? "Solicitud aceptada" : "Solicitud rechazada",
        body: `${student?.fullName ?? "El estudiante"} ${status === "aceptada" ? "aceptó" : "rechazó"} tu solicitud para "${offer.title}".`,
        createdAt: now,
        read: false,
      };
      return {
        ...s,
        serviceRequests: s.serviceRequests.map((r) => (r.id === id ? { ...r, status, updatedAt: now } : r)),
        notifications: [notification, ...s.notifications],
      };
    });
  }, []);

  const completeServiceRequest = useCallback(async (id: string) => {
    await delay(200);
    setState((s) => {
      if (s.session?.role !== "negocio") return s;
      const request = s.serviceRequests.find((r) => r.id === id);
      const offer = request && s.serviceOffers.find((o) => o.id === request.offerId);
      if (!request || !offer || request.businessId !== s.session.userId || request.status !== "aceptada") return s;
      const business = s.businesses.find((b) => b.id === request.businessId);
      const now = todayISO();
      const notification: AppNotification = {
        id: uid("n"),
        userId: offer.studentId,
        title: "Servicio completado",
        body: `${business?.name ?? "El negocio"} marcó como completado "${offer.title}".`,
        createdAt: now,
        read: false,
      };
      return {
        ...s,
        serviceRequests: s.serviceRequests.map((r) =>
          r.id === id ? { ...r, status: "completada", updatedAt: now } : r
        ),
        notifications: [notification, ...s.notifications],
      };
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateStudentProfile,
      setAvailability,
      applyToVacancy,
      updateBusinessProfile,
      saveVacancy,
      setVacancyStatus,
      setApplicationStatus,
      markNotificationsRead,
      saveServiceOffer,
      setServiceOfferStatus,
      sendServiceRequest,
      respondServiceRequest,
      completeServiceRequest,
    }),
    [
      state,
      login,
      register,
      logout,
      updateStudentProfile,
      setAvailability,
      applyToVacancy,
      updateBusinessProfile,
      saveVacancy,
      setVacancyStatus,
      setApplicationStatus,
      markNotificationsRead,
      saveServiceOffer,
      setServiceOfferStatus,
      sendServiceRequest,
      respondServiceRequest,
      completeServiceRequest,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}

/** Datos del estudiante autenticado. Solo expone su propia información. */
export function useCurrentStudent() {
  const { session, students, availability, applications, notifications } = useApp();
  const id = session?.role === "estudiante" ? session.userId : null;
  return useMemo(
    () => ({
      profile: students.find((s) => s.id === id) ?? null,
      blocks: (id && availability[id]) || [],
      applications: applications.filter((a) => a.studentId === id),
      notifications: notifications.filter((n) => n.userId === id),
    }),
    [id, students, availability, applications, notifications]
  );
}

/**
 * Datos del negocio autenticado. Los perfiles de estudiantes solo se incluyen
 * si se postularon a alguna de sus vacantes (misma regla que la RLS).
 */
export function useCurrentBusiness() {
  const { session, businesses, vacancies, applications, students, availability } = useApp();
  const id = session?.role === "negocio" ? session.userId : null;
  return useMemo(() => {
    const myVacancies = vacancies.filter((v) => v.businessId === id);
    const vacancyIds = new Set(myVacancies.map((v) => v.id));
    const received = applications.filter((a) => vacancyIds.has(a.vacancyId));
    const applicantIds = new Set(received.map((a) => a.studentId));
    return {
      profile: businesses.find((b) => b.id === id) ?? null,
      vacancies: myVacancies,
      applications: received,
      applicants: students.filter((s) => applicantIds.has(s.id)),
      /** Solo para calcular compatibilidad; la UI de negocio nunca muestra los bloques. */
      applicantAvailability: (studentId: string) =>
        applicantIds.has(studentId) ? availability[studentId] ?? [] : [],
    };
  }, [id, businesses, vacancies, applications, students, availability]);
}
