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
  mockServiceUpdates,
  mockStudents,
  mockVacancies,
} from "@/data/mock";
import { APPLICATION_STATUS_LABELS, SERVICE_REQUEST_OPEN } from "@/lib/constants";
import { formatDate, todayISO, uid } from "@/lib/format";
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
  ServiceRequestStatus,
  ServiceUpdate,
  ServiceUpdateKind,
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
  serviceUpdates: ServiceUpdate[];
}

interface TransitionSpec {
  actor: Role;
  from: ServiceRequestStatus[];
  patch: Partial<ServiceRequest>;
  update?: { kind: ServiceUpdateKind; message: string; link?: string };
  notify: (names: { student: string; business: string; title: string }) => { title: string; body: string };
}

/**
 * Aplica una transición del seguimiento de servicios si el usuario en sesión es la parte
 * correcta y la solicitud está en un estado de origen válido. Registra la bitácora (si aplica)
 * y notifica a la otra parte con enlace a su detalle. Misma regla que el trigger de Supabase.
 */
function applyServiceTransition(s: AppState, requestId: string, spec: TransitionSpec): AppState {
  if (s.session?.role !== spec.actor) return s;
  const request = s.serviceRequests.find((r) => r.id === requestId);
  const offer = request && s.serviceOffers.find((o) => o.id === request.offerId);
  if (!request || !offer || !spec.from.includes(request.status)) return s;
  const isParty =
    spec.actor === "estudiante" ? offer.studentId === s.session.userId : request.businessId === s.session.userId;
  if (!isParty) return s;

  const now = todayISO();
  const names = {
    student: s.students.find((st) => st.id === offer.studentId)?.fullName ?? "El prestador",
    business: s.businesses.find((b) => b.id === request.businessId)?.name ?? "El negocio",
    title: offer.title,
  };
  const { title, body } = spec.notify(names);
  const toBusiness = spec.actor === "estudiante";
  const notification: AppNotification = {
    id: uid("n"),
    userId: toBusiness ? request.businessId : offer.studentId,
    kind: "solicitud_servicio",
    link: toBusiness ? `/negocio/solicitud/${request.id}` : `/estudiante/solicitud/${request.id}`,
    title,
    body,
    createdAt: now,
    read: false,
  };
  const entry: ServiceUpdate | null = spec.update
    ? { id: uid("su"), requestId: request.id, ...spec.update, createdAt: now }
    : null;

  return {
    ...s,
    serviceRequests: s.serviceRequests.map((r) =>
      r.id === requestId ? { ...r, ...spec.patch, updatedAt: now } : r
    ),
    serviceUpdates: entry ? [...s.serviceUpdates, entry] : s.serviceUpdates,
    notifications: [notification, ...s.notifications],
  };
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
  markNotificationRead: (id: string) => void;
  saveServiceOffer: (input: ServiceOfferInput, id?: string) => Promise<string>;
  setServiceOfferStatus: (id: string, status: ServiceOfferStatus) => Promise<void>;
  sendServiceRequest: (input: ServiceRequestInput) => Promise<void>;
  /** Aceptar exige fecha estimada de entrega (AAAA-MM-DD). */
  respondServiceRequest: (id: string, status: "aceptada" | "rechazada", estimatedDate?: string) => Promise<void>;
  startServiceRequest: (id: string) => Promise<void>;
  addServiceProgress: (id: string, input: { message: string; link?: string }) => Promise<void>;
  changeServiceEstimatedDate: (id: string, input: { estimatedDate: string; reason: string }) => Promise<void>;
  deliverServiceRequest: (id: string, input: { message?: string; link?: string }) => Promise<void>;
  confirmServiceCompletion: (id: string) => Promise<void>;
  requestServiceAdjustments: (id: string, note: string) => Promise<void>;
  /** Cualquiera de las dos partes, solo en estado enviada o aceptada. */
  cancelServiceRequest: (id: string, reason: string) => Promise<void>;
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
    serviceUpdates: mockServiceUpdates,
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
      if (s.session?.role !== "estudiante") return s;
      const studentId = s.session.userId;
      if (s.applications.some((a) => a.vacancyId === vacancyId && a.studentId === studentId)) return s;
      const vacancy = s.vacancies.find((v) => v.id === vacancyId && v.status === "activa");
      if (!vacancy) return s;
      const student = s.students.find((st) => st.id === studentId);
      const now = todayISO();
      // Solo nombre y vacante: nunca correo ni disponibilidad del estudiante.
      const notification: AppNotification = {
        id: uid("n"),
        userId: vacancy.businessId,
        kind: "postulacion",
        link: `/negocio/postulaciones?vacancy=${vacancy.id}`,
        title: "Nueva postulación",
        body: `${student?.fullName ?? "Un estudiante"} se postuló a "${vacancy.title}".`,
        createdAt: now,
        read: false,
      };
      return {
        ...s,
        applications: [
          ...s.applications,
          { id: uid("ap"), vacancyId, studentId, status: "recibida", createdAt: now, updatedAt: now },
        ],
        notifications: [notification, ...s.notifications],
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
        kind: "postulacion",
        link: `/estudiante/vacante/${vacancy.id}`,
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

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.id === id && n.userId === s.session?.userId ? { ...n, read: true } : n
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
        (r) => r.offerId === offer.id && r.businessId === businessId && SERVICE_REQUEST_OPEN.includes(r.status)
      );
      if (open) return s;
      const now = todayISO();
      const business = s.businesses.find((b) => b.id === businessId);
      const requestId = uid("sr");
      const request: ServiceRequest = {
        id: requestId,
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
        kind: "solicitud_servicio",
        link: `/estudiante/solicitud/${requestId}`,
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

  const respondServiceRequest = useCallback<AppActions["respondServiceRequest"]>(async (id, status, estimatedDate) => {
    await delay(200);
    if (status === "aceptada" && !estimatedDate) return;
    setState((s) =>
      applyServiceTransition(s, id, {
        actor: "estudiante",
        from: ["enviada"],
        patch: status === "aceptada" ? { status, estimatedDate } : { status },
        notify: ({ student, title }) =>
          status === "aceptada"
            ? { title: "Solicitud aceptada", body: `${student} aceptó tu solicitud para "${title}". Entrega estimada: ${formatDate(estimatedDate!)}.` }
            : { title: "Solicitud rechazada", body: `${student} rechazó tu solicitud para "${title}".` },
      })
    );
  }, []);

  const startServiceRequest = useCallback(async (id: string) => {
    await delay(200);
    setState((s) =>
      applyServiceTransition(s, id, {
        actor: "estudiante",
        from: ["aceptada"],
        patch: { status: "en_proceso" },
        notify: ({ student, title }) => ({ title: "Trabajo iniciado", body: `${student} comenzó a trabajar en "${title}".` }),
      })
    );
  }, []);

  const addServiceProgress = useCallback<AppActions["addServiceProgress"]>(async (id, { message, link }) => {
    await delay(200);
    setState((s) =>
      applyServiceTransition(s, id, {
        actor: "estudiante",
        from: ["en_proceso"],
        patch: {},
        update: { kind: "avance", message, link },
        notify: ({ student, title }) => ({ title: "Nuevo avance", body: `${student} publicó un avance en "${title}".` }),
      })
    );
  }, []);

  const changeServiceEstimatedDate = useCallback<AppActions["changeServiceEstimatedDate"]>(
    async (id, { estimatedDate, reason }) => {
      await delay(200);
      setState((s) =>
        applyServiceTransition(s, id, {
          actor: "estudiante",
          from: ["en_proceso"],
          patch: { estimatedDate },
          update: { kind: "cambio_fecha", message: `Nueva fecha: ${formatDate(estimatedDate)}. ${reason}` },
          notify: ({ student, title }) => ({
            title: "Cambio de fecha estimada",
            body: `${student} movió la entrega de "${title}" al ${formatDate(estimatedDate)}.`,
          }),
        })
      );
    },
    []
  );

  const deliverServiceRequest = useCallback<AppActions["deliverServiceRequest"]>(async (id, { message, link }) => {
    await delay(200);
    setState((s) => {
      const offer = s.serviceOffers.find((o) => o.id === s.serviceRequests.find((r) => r.id === id)?.offerId);
      // En servicios remotos la entrega exige una nota o un enlace.
      if (offer?.modality === "remoto" && !message && !link) return s;
      return applyServiceTransition(s, id, {
        actor: "estudiante",
        from: ["en_proceso"],
        patch: { status: "entregada" },
        update: { kind: "entrega", message: message || "Entrega registrada sin nota.", link },
        notify: ({ student, title }) => ({
          title: "Servicio entregado",
          body: `${student} marcó como entregado "${title}". Revisa y confirma.`,
        }),
      });
    });
  }, []);

  const confirmServiceCompletion = useCallback(async (id: string) => {
    await delay(200);
    setState((s) =>
      applyServiceTransition(s, id, {
        actor: "negocio",
        from: ["entregada"],
        patch: { status: "completada" },
        notify: ({ business, title }) => ({
          title: "Servicio finalizado",
          body: `${business} confirmó como finalizado "${title}".`,
        }),
      })
    );
  }, []);

  const requestServiceAdjustments = useCallback(async (id: string, note: string) => {
    await delay(200);
    setState((s) =>
      applyServiceTransition(s, id, {
        actor: "negocio",
        from: ["entregada"],
        patch: { status: "en_proceso" },
        update: { kind: "ajuste", message: note },
        notify: ({ business, title }) => ({ title: "Ajustes solicitados", body: `${business} pidió ajustes en "${title}".` }),
      })
    );
  }, []);

  const cancelServiceRequest = useCallback(async (id: string, reason: string) => {
    await delay(200);
    setState((s) => {
      const actor = s.session?.role;
      if (!actor) return s;
      return applyServiceTransition(s, id, {
        actor,
        from: ["enviada", "aceptada"],
        patch: { status: "cancelada", cancelReason: reason, cancelledBy: actor },
        notify: ({ student, business, title }) => ({
          title: "Solicitud cancelada",
          body: `${actor === "estudiante" ? student : business} canceló la solicitud de "${title}". Motivo: ${reason}`,
        }),
      });
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
      markNotificationRead,
      saveServiceOffer,
      setServiceOfferStatus,
      sendServiceRequest,
      respondServiceRequest,
      startServiceRequest,
      addServiceProgress,
      changeServiceEstimatedDate,
      deliverServiceRequest,
      confirmServiceCompletion,
      requestServiceAdjustments,
      cancelServiceRequest,
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
      markNotificationRead,
      saveServiceOffer,
      setServiceOfferStatus,
      sendServiceRequest,
      respondServiceRequest,
      startServiceRequest,
      addServiceProgress,
      changeServiceEstimatedDate,
      deliverServiceRequest,
      confirmServiceCompletion,
      requestServiceAdjustments,
      cancelServiceRequest,
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
  const { session, businesses, vacancies, applications, students, availability, notifications } = useApp();
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
      notifications: notifications.filter((n) => n.userId === id),
    };
  }, [id, businesses, vacancies, applications, students, availability, notifications]);
}
