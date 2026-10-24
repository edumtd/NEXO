// Estado de la app conectado a Supabase.
// - Etapas 1–3 (cuentas, perfiles, vacantes, postulaciones, disponibilidad, Talento y notificaciones)
//   se leen y escriben en Supabase. Cada acción escribe y después recarga lo que el usuario puede ver
//   (la RLS decide qué filas llegan). Las notificaciones las crean triggers del servidor.
// - Etapa 4 (vacantes guardadas, entrevistas y reportes) sigue en memoria por ahora.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState as RNAppState } from "react-native";

import type { CompatibilityLevel } from "@/lib/compatibility";
import {
  applicationFromRow,
  authErrorMessage,
  availabilityFromRow,
  businessFromRow,
  businessPatchToRow,
  dbErrorMessage,
  notificationFromRow,
  publicStudentFromRow,
  serviceOfferFromRow,
  serviceOfferInputToRow,
  serviceRequestFromRow,
  serviceUpdateFromRow,
  studentFromRow,
  studentPatchToRow,
  vacancyFromRow,
  vacancyInputToRow,
  type ApplicationRow,
  type AvailabilityRow,
  type BusinessRow,
  type NotificationRow,
  type ProfileRow,
  type PublicStudentRow,
  type ServiceOfferRow,
  type ServiceRequestRow,
  type ServiceUpdateRow,
  type StudentRow,
  type VacancyRow,
} from "@/lib/db";
import { formatDate, todayISO, uid } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type {
  AcademicStatus,
  AppNotification,
  Application,
  ApplicationStatus,
  AvailabilityBlock,
  BusinessProfile,
  InterviewProposal,
  InterviewSlot,
  Report,
  Role,
  SavedVacancy,
  ServiceOffer,
  ServiceOfferStatus,
  ServiceRequest,
  ServiceUpdate,
  Session,
  StudentProfile,
  Vacancy,
  VacancyStatus,
} from "@/types";

export type VacancyInput = Omit<Vacancy, "id" | "businessId" | "status" | "createdAt">;
export type ServiceOfferInput = Omit<ServiceOffer, "id" | "studentId" | "status" | "createdAt">;
export type ServiceRequestInput = Pick<ServiceRequest, "offerId" | "message" | "days" | "start" | "end">;

/** Resultado de una acción: si hay `error`, ya se mostró en el aviso global. */
export interface ActionResult {
  error?: string;
}

export interface AuthResult {
  role?: Role;
  error?: string;
}

/** Compatibilidad de una postulación calculada en el servidor (el negocio nunca recibe los bloques). */
export interface ApplicationInsight {
  level: CompatibilityLevel;
  fullDays: number;
  totalDays: number;
}

/** Compatibilidad y contacto de una solicitud de servicio, calculados en el servidor. */
export interface RequestInsight {
  level: CompatibilityLevel | null;
  contactEmail: string | null;
}

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
  /** Solo para negocios: por id de postulación. */
  applicationInsights: Record<string, ApplicationInsight>;
  /** Solo para negocios: por id de solicitud de servicio. */
  requestInsights: Record<string, RequestInsight>;
  // Etapa 4: todavía en memoria.
  savedVacancies: SavedVacancy[];
  interviews: InterviewProposal[];
  reports: Report[];
  /** Último error de una acción, para el aviso global. */
  lastError: string | null;
}

const EMPTY_STATE: AppState = {
  session: null,
  students: [],
  businesses: [],
  availability: {},
  vacancies: [],
  applications: [],
  notifications: [],
  serviceOffers: [],
  serviceRequests: [],
  serviceUpdates: [],
  applicationInsights: {},
  requestInsights: {},
  savedVacancies: [],
  interviews: [],
  reports: [],
  lastError: null,
};

interface AppActions {
  /** Inicia sesión con Supabase Auth; el rol sale del perfil de la cuenta. */
  login: (email: string, password: string) => Promise<AuthResult>;
  /** Crea la cuenta; el perfil lo genera el trigger handle_new_user. */
  register: (input: {
    role: Role;
    name: string;
    email: string;
    password: string;
    academicStatus?: AcademicStatus;
  }) => Promise<AuthResult & { needsConfirmation?: boolean }>;
  logout: () => void;
  /** Vuelve a leer de Supabase todo lo que el usuario puede ver. */
  refresh: () => Promise<void>;
  clearError: () => void;
  updateStudentProfile: (patch: Partial<Omit<StudentProfile, "id">>) => Promise<ActionResult>;
  /** Reemplaza todos los bloques. periodEndDate: "" borra la fecha de fin del periodo. */
  setAvailability: (blocks: AvailabilityBlock[], period?: string, periodEndDate?: string) => Promise<ActionResult>;
  toggleSavedVacancy: (vacancyId: string) => void;
  applyToVacancy: (vacancyId: string) => Promise<ActionResult>;
  updateBusinessProfile: (patch: Partial<Omit<BusinessProfile, "id" | "verified">>) => Promise<ActionResult>;
  saveVacancy: (input: VacancyInput, id?: string) => Promise<ActionResult & { id?: string }>;
  setVacancyStatus: (id: string, status: VacancyStatus) => Promise<ActionResult>;
  setApplicationStatus: (id: string, status: ApplicationStatus) => Promise<ActionResult>;
  markNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  saveServiceOffer: (input: ServiceOfferInput, id?: string) => Promise<ActionResult & { id?: string }>;
  setServiceOfferStatus: (id: string, status: ServiceOfferStatus) => Promise<ActionResult>;
  sendServiceRequest: (input: ServiceRequestInput) => Promise<ActionResult>;
  /** Aceptar exige fecha estimada de entrega (AAAA-MM-DD). */
  respondServiceRequest: (id: string, status: "aceptada" | "rechazada", estimatedDate?: string) => Promise<ActionResult>;
  startServiceRequest: (id: string) => Promise<ActionResult>;
  addServiceProgress: (id: string, input: { message: string; link?: string }) => Promise<ActionResult>;
  changeServiceEstimatedDate: (id: string, input: { estimatedDate: string; reason: string }) => Promise<ActionResult>;
  deliverServiceRequest: (id: string, input: { message?: string; link?: string }) => Promise<ActionResult>;
  confirmServiceCompletion: (id: string) => Promise<ActionResult>;
  requestServiceAdjustments: (id: string, note: string) => Promise<ActionResult>;
  /** Cualquiera de las dos partes, solo en estado enviada o aceptada. */
  cancelServiceRequest: (id: string, reason: string) => Promise<ActionResult>;
  /** El negocio propone 2–3 horarios; pasa la postulación a "entrevista". */
  proposeInterview: (applicationId: string, slots: InterviewSlot[]) => Promise<ActionResult>;
  /** El estudiante elige un horario (índice) o pide otros (null). */
  respondInterview: (proposalId: string, index: number | null) => Promise<void>;
  /** Un reporte por usuario y objetivo. */
  submitReport: (input: Pick<Report, "targetType" | "targetId" | "reason" | "description">) => Promise<"ok" | "duplicado" | "error">;
}

const MISSING_CONFIG = "Falta configurar Supabase: crea el archivo .env con la URL y la clave del proyecto.";
const INVALID_SESSION = "Tu sesión no es válida. Vuelve a iniciar sesión.";

type DbError = { message?: string; code?: string } | null;

/** Notificaciones creadas solo en el dispositivo (p. ej. recordatorio de periodo); no existen en la base. */
const isLocalNotification = (id: string) => id.startsWith("n-");

type AppContextValue = AppState & AppActions & { /** false mientras se restaura la sesión guardada. */ authReady: boolean };

const AppContext = createContext<AppContextValue | null>(null);

/** Lee de Supabase todo lo que el usuario puede ver según su rol (la RLS filtra las filas). */
async function fetchSnapshot(client: SupabaseClient, user: User): Promise<Partial<AppState> | null> {
  const { data: prof, error: profError } = await client
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (profError) throw profError;
  if (!prof) return null;

  const [businesses, vacancies, applications, notifications, offers, requests, updates] = await Promise.all([
    client.from("business_profiles").select("*").returns<BusinessRow[]>(),
    client.from("vacancies").select("*").order("created_at", { ascending: false }).returns<VacancyRow[]>(),
    client.from("applications").select("*").returns<ApplicationRow[]>(),
    client
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<NotificationRow[]>(),
    client.from("service_offers").select("*").order("created_at", { ascending: false }).returns<ServiceOfferRow[]>(),
    client.from("service_requests").select("*").order("updated_at", { ascending: false }).returns<ServiceRequestRow[]>(),
    client.from("service_updates").select("*").order("created_at").returns<ServiceUpdateRow[]>(),
  ]);
  const firstError = [businesses, vacancies, applications, notifications, offers, requests, updates].find((r) => r.error)?.error;
  if (firstError) throw firstError;

  const common: Partial<AppState> = {
    session: { role: prof.role, userId: user.id },
    businesses: (businesses.data ?? []).map(businessFromRow),
    vacancies: (vacancies.data ?? []).map(vacancyFromRow),
    applications: (applications.data ?? []).map(applicationFromRow),
    notifications: (notifications.data ?? []).map(notificationFromRow),
    serviceOffers: (offers.data ?? []).map(serviceOfferFromRow),
    serviceRequests: (requests.data ?? []).map(serviceRequestFromRow),
    serviceUpdates: (updates.data ?? []).map(serviceUpdateFromRow),
  };

  if (prof.role === "estudiante") {
    const [me, blocks] = await Promise.all([
      client.from("student_profiles").select("*").eq("id", user.id).maybeSingle<StudentRow>(),
      client.from("availability_blocks").select("*").eq("student_id", user.id).returns<AvailabilityRow[]>(),
    ]);
    if (me.error) throw me.error;
    if (blocks.error) throw blocks.error;
    if (!me.data) return null;
    return {
      ...common,
      students: [studentFromRow(me.data, user.email ?? "")],
      availability: { [user.id]: (blocks.data ?? []).map(availabilityFromRow) },
      applicationInsights: {},
      requestInsights: {},
    };
  }

  // Negocio: perfiles públicos y datos derivados calculados en el servidor (sin disponibilidad ajena).
  if (!common.businesses?.some((b) => b.id === user.id)) return null;
  const [publicStudents, appDetails, requestDetails] = await Promise.all([
    client.rpc("visible_public_students"),
    client.rpc("business_application_details"),
    client.rpc("business_service_request_details"),
  ]);
  type AppDetail = { application_id: string; level: CompatibilityLevel; full_days: number; total_days: number; contact_email: string | null };
  type RequestDetail = { request_id: string; level: CompatibilityLevel | null; contact_email: string | null };
  const rpcError = [publicStudents, appDetails, requestDetails].find((r) => r.error)?.error;
  if (rpcError) throw rpcError;

  const applicationInsights: Record<string, ApplicationInsight> = {};
  const requestInsights: Record<string, RequestInsight> = {};
  // Correo por estudiante: solo si alguna postulación (entrevista/aceptada) o solicitud aceptada lo permite.
  const emailByStudent: Record<string, string> = {};
  for (const d of (appDetails.data as AppDetail[] | null) ?? []) {
    applicationInsights[d.application_id] = { level: d.level, fullDays: d.full_days, totalDays: d.total_days };
    const app = common.applications?.find((a) => a.id === d.application_id);
    if (d.contact_email && app) emailByStudent[app.studentId] = d.contact_email;
  }
  for (const d of (requestDetails.data as RequestDetail[] | null) ?? []) {
    requestInsights[d.request_id] = { level: d.level, contactEmail: d.contact_email };
  }
  return {
    ...common,
    students: ((publicStudents.data as PublicStudentRow[] | null) ?? []).map((r) => publicStudentFromRow(r, emailByStudent[r.id] ?? "")),
    availability: {},
    applicationInsights,
    requestInsights,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [authReady, setAuthReady] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  /** Usuario autenticado actual, para recargar datos después de cada acción. */
  const userRef = useRef<User | null>(null);

  const fail = useCallback((message: string): ActionResult => {
    setState((s) => ({ ...s, lastError: message }));
    return { error: message };
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, lastError: null })), []);

  /** Carga todo lo visible para el usuario. Devuelve su rol o null si no tiene perfil. */
  const loadAll = useCallback(async (user: User): Promise<Role | null> => {
    if (!supabase) return null;
    try {
      const snapshot = await fetchSnapshot(supabase, user);
      if (!snapshot) return null;
      userRef.current = user;
      setState((s) => ({
        ...s,
        ...snapshot,
        // Conserva las notificaciones locales (recordatorio de periodo) que no viven en la base.
        notifications: [...s.notifications.filter((n) => isLocalNotification(n.id)), ...(snapshot.notifications ?? [])],
      }));
      return snapshot.session?.role ?? null;
    } catch (error) {
      fail(dbErrorMessage(error as DbError, "No pudimos cargar tus datos. Revisa tu conexión."));
      return null;
    }
  }, [fail]);

  const refresh = useCallback(async () => {
    if (userRef.current) await loadAll(userRef.current);
  }, [loadAll]);

  /**
   * Ejecuta una escritura en Supabase con el rol indicado. Si falla, muestra el error en el aviso
   * global; si funciona, recarga los datos (triggers incluidos: notificaciones, fechas, etc.).
   */
  const mutate = useCallback(
    async (
      role: Role | null,
      fallback: string,
      write: (client: SupabaseClient, userId: string) => Promise<DbError>
    ): Promise<ActionResult> => {
      const session = stateRef.current.session;
      if (!supabase) return fail(MISSING_CONFIG);
      if (!session || (role && session.role !== role)) return fail(INVALID_SESSION);
      const error = await write(supabase, session.userId);
      if (error) return fail(dbErrorMessage(error, fallback));
      await refresh();
      return {};
    },
    [fail, refresh]
  );

  // ───────── Cuentas (Supabase Auth) ─────────

  // Restaura la sesión guardada al abrir la app y escucha cierres de sesión.
  useEffect(() => {
    const client = supabase;
    if (!client) {
      setAuthReady(true);
      return;
    }
    let active = true;
    client.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) await loadAll(data.session.user);
      if (active) setAuthReady(true);
    });
    // No llamar a Supabase dentro de este callback (puede bloquear el cliente): solo actualizar estado.
    const { data: sub } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        userRef.current = null;
        setState(EMPTY_STATE);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAll]);

  // Al volver a la app (cambio de pestaña o de aplicación), trae lo nuevo de otras cuentas.
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (status) => {
      if (status === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const login = useCallback<AppActions["login"]>(async (email, password) => {
    if (!supabase) return { error: MISSING_CONFIG };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: authErrorMessage(error) };
    const role = await loadAll(data.user);
    if (!role) {
      await supabase.auth.signOut();
      return { error: "No encontramos el perfil de esta cuenta." };
    }
    return { role };
  }, [loadAll]);

  const register = useCallback<AppActions["register"]>(async ({ role, name, email, password, academicStatus = "activo" }) => {
    if (!supabase) return { error: MISSING_CONFIG };
    // El perfil lo crea el trigger handle_new_user a partir de estos metadatos.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: name, academic_status: academicStatus } },
    });
    if (error) return { error: authErrorMessage(error) };
    // Si el proyecto exige confirmar el correo, todavía no hay sesión.
    if (!data.session || !data.user) return { needsConfirmation: true };
    const loaded = await loadAll(data.user);
    return loaded ? { role: loaded } : { error: "La cuenta se creó, pero no pudimos cargar el perfil." };
  }, [loadAll]);

  const logout = useCallback(() => {
    void supabase?.auth.signOut();
    userRef.current = null;
    // Limpia todo para que la siguiente cuenta no vea datos de la anterior.
    setState(EMPTY_STATE);
  }, []);

  // ───────── Perfiles ─────────

  const updateStudentProfile = useCallback<AppActions["updateStudentProfile"]>(
    (patch) =>
      mutate("estudiante", "No pudimos guardar tu perfil. Inténtalo de nuevo.", async (c, uid) =>
        (await c.from("student_profiles").update(studentPatchToRow(patch)).eq("id", uid)).error
      ),
    [mutate]
  );

  const updateBusinessProfile = useCallback<AppActions["updateBusinessProfile"]>(
    (patch) =>
      mutate("negocio", "No pudimos guardar el perfil del negocio. Inténtalo de nuevo.", async (c, uid) =>
        (await c.from("business_profiles").update(businessPatchToRow(patch)).eq("id", uid)).error
      ),
    [mutate]
  );

  // ───────── Disponibilidad ─────────

  const setAvailability = useCallback<AppActions["setAvailability"]>(
    (blocks, period, periodEndDate) =>
      mutate("estudiante", "No pudimos guardar tu disponibilidad. Inténtalo de nuevo.", async (c, uid) => {
        // Reemplazo completo: se borran los bloques anteriores y se insertan los nuevos.
        const del = await c.from("availability_blocks").delete().eq("student_id", uid);
        if (del.error) return del.error;
        if (blocks.length > 0) {
          const ins = await c.from("availability_blocks").insert(
            blocks.map((b) => ({ student_id: uid, day: b.day, start_minute: b.start, end_minute: b.end }))
          );
          if (ins.error) return ins.error;
        }
        const profilePatch: Record<string, unknown> = {};
        if (period !== undefined) profilePatch.availability_period = period;
        if (periodEndDate !== undefined) profilePatch.period_end_date = periodEndDate || null;
        if (Object.keys(profilePatch).length === 0) return null;
        return (await c.from("student_profiles").update(profilePatch).eq("id", uid)).error;
      }),
    [mutate]
  );

  // ───────── Vacantes y postulaciones ─────────

  const applyToVacancy = useCallback<AppActions["applyToVacancy"]>(
    (vacancyId) =>
      mutate("estudiante", "No pudimos enviar tu postulación. Inténtalo de nuevo.", async (c, uid) =>
        (await c.from("applications").insert({ vacancy_id: vacancyId, student_id: uid })).error
      ),
    [mutate]
  );

  const saveVacancy = useCallback<AppActions["saveVacancy"]>(
    async (input, id) => {
      let savedId = id;
      const result = await mutate("negocio", "No pudimos guardar la vacante. Revisa los datos e inténtalo de nuevo.", async (c, uid) => {
        if (id) return (await c.from("vacancies").update(vacancyInputToRow(input)).eq("id", id).eq("business_id", uid)).error;
        const ins = await c
          .from("vacancies")
          .insert({ ...vacancyInputToRow(input), business_id: uid })
          .select("id")
          .single<{ id: string }>();
        savedId = ins.data?.id;
        return ins.error;
      });
      return result.error ? result : { id: savedId };
    },
    [mutate]
  );

  const setVacancyStatus = useCallback<AppActions["setVacancyStatus"]>(
    (id, status) =>
      mutate("negocio", "No pudimos cambiar el estado de la vacante.", async (c, uid) =>
        (await c.from("vacancies").update({ status }).eq("id", id).eq("business_id", uid)).error
      ),
    [mutate]
  );

  const setApplicationStatus = useCallback<AppActions["setApplicationStatus"]>(
    (id, status) =>
      mutate("negocio", "No pudimos actualizar la postulación.", async (c) =>
        (await c.from("applications").update({ status }).eq("id", id)).error
      ),
    [mutate]
  );

  // ───────── Notificaciones ─────────

  const markNotificationsRead = useCallback(() => {
    const session = stateRef.current.session;
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    if (supabase && session) {
      void supabase.from("notifications").update({ read: true }).eq("user_id", session.userId).eq("read", false);
    }
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    if (supabase && !isLocalNotification(id)) {
      void supabase.from("notifications").update({ read: true }).eq("id", id);
    }
  }, []);

  // ───────── Talento: servicios ─────────

  const saveServiceOffer = useCallback<AppActions["saveServiceOffer"]>(
    async (input, id) => {
      let savedId = id;
      const result = await mutate("estudiante", "No pudimos guardar el servicio. Revisa los datos e inténtalo de nuevo.", async (c, uid) => {
        if (id) return (await c.from("service_offers").update(serviceOfferInputToRow(input)).eq("id", id).eq("student_id", uid)).error;
        const ins = await c
          .from("service_offers")
          .insert({ ...serviceOfferInputToRow(input), student_id: uid })
          .select("id")
          .single<{ id: string }>();
        savedId = ins.data?.id;
        return ins.error;
      });
      return result.error ? result : { id: savedId };
    },
    [mutate]
  );

  const setServiceOfferStatus = useCallback<AppActions["setServiceOfferStatus"]>(
    (id, status) =>
      mutate("estudiante", "No pudimos cambiar el estado del servicio.", async (c, uid) =>
        (await c.from("service_offers").update({ status }).eq("id", id).eq("student_id", uid)).error
      ),
    [mutate]
  );

  // ───────── Talento: solicitudes y seguimiento ─────────
  // Las transiciones válidas por rol las valida el trigger on_service_request_change.

  const sendServiceRequest = useCallback<AppActions["sendServiceRequest"]>(
    (input) =>
      mutate("negocio", "No pudimos enviar la solicitud. Inténtalo de nuevo.", async (c, uid) => {
        const offer = stateRef.current.serviceOffers.find((o) => o.id === input.offerId);
        const remote = offer?.modality === "remoto";
        return (
          await c.from("service_requests").insert({
            offer_id: input.offerId,
            business_id: uid,
            message: input.message,
            days: remote ? null : input.days ?? null,
            start_minute: remote ? null : input.start ?? null,
            end_minute: remote ? null : input.end ?? null,
          })
        ).error;
      }),
    [mutate]
  );

  const updateRequest = useCallback(
    (role: Role, id: string, patch: Record<string, unknown>, fallback: string) =>
      mutate(role, fallback, async (c) => (await c.from("service_requests").update(patch).eq("id", id)).error),
    [mutate]
  );

  const respondServiceRequest = useCallback<AppActions["respondServiceRequest"]>(
    (id, status, estimatedDate) => {
      if (status === "aceptada" && !estimatedDate) return Promise.resolve(fail("Indica la fecha estimada de entrega."));
      return updateRequest(
        "estudiante",
        id,
        status === "aceptada" ? { status, estimated_date: estimatedDate } : { status },
        "No pudimos responder la solicitud."
      );
    },
    [fail, updateRequest]
  );

  const startServiceRequest = useCallback<AppActions["startServiceRequest"]>(
    (id) => updateRequest("estudiante", id, { status: "en_proceso" }, "No pudimos iniciar el trabajo."),
    [updateRequest]
  );

  const addServiceProgress = useCallback<AppActions["addServiceProgress"]>(
    (id, { message, link }) =>
      mutate("estudiante", "No pudimos publicar el avance.", async (c) =>
        (await c.from("service_updates").insert({ request_id: id, kind: "avance", message, link: link ?? null })).error
      ),
    [mutate]
  );

  const changeServiceEstimatedDate = useCallback<AppActions["changeServiceEstimatedDate"]>(
    (id, { estimatedDate, reason }) =>
      mutate("estudiante", "No pudimos cambiar la fecha estimada.", async (c) => {
        // Primero la bitácora (exige que siga en proceso) y después la fecha (notifica al negocio).
        const message = `Nueva fecha: ${formatDate(estimatedDate)}. ${reason}`.slice(0, 300);
        const log = await c.from("service_updates").insert({ request_id: id, kind: "cambio_fecha", message });
        if (log.error) return log.error;
        return (await c.from("service_requests").update({ estimated_date: estimatedDate }).eq("id", id)).error;
      }),
    [mutate]
  );

  const deliverServiceRequest = useCallback<AppActions["deliverServiceRequest"]>(
    (id, { message, link }) => {
      const s = stateRef.current;
      const offer = s.serviceOffers.find((o) => o.id === s.serviceRequests.find((r) => r.id === id)?.offerId);
      // En servicios remotos la entrega exige una nota o un enlace.
      if (offer?.modality === "remoto" && !message && !link) {
        return Promise.resolve(fail("Agrega una nota o un enlace del entregable."));
      }
      return mutate("estudiante", "No pudimos registrar la entrega.", async (c) => {
        // Orden que exige la RLS: la entrega se registra mientras sigue "en proceso".
        const log = await c
          .from("service_updates")
          .insert({ request_id: id, kind: "entrega", message: message || "Entrega registrada sin nota.", link: link ?? null });
        if (log.error) return log.error;
        return (await c.from("service_requests").update({ status: "entregada" }).eq("id", id)).error;
      });
    },
    [fail, mutate]
  );

  const confirmServiceCompletion = useCallback<AppActions["confirmServiceCompletion"]>(
    (id) => updateRequest("negocio", id, { status: "completada" }, "No pudimos confirmar el servicio."),
    [updateRequest]
  );

  const requestServiceAdjustments = useCallback<AppActions["requestServiceAdjustments"]>(
    (id, note) =>
      mutate("negocio", "No pudimos solicitar los ajustes.", async (c) => {
        // Orden que exige la RLS: el ajuste se registra mientras la solicitud sigue "entregada".
        const log = await c.from("service_updates").insert({ request_id: id, kind: "ajuste", message: note });
        if (log.error) return log.error;
        return (await c.from("service_requests").update({ status: "en_proceso" }).eq("id", id)).error;
      }),
    [mutate]
  );

  const cancelServiceRequest = useCallback<AppActions["cancelServiceRequest"]>(
    (id, reason) => {
      const role = stateRef.current.session?.role;
      if (!role) return Promise.resolve(fail(INVALID_SESSION));
      return updateRequest(role, id, { status: "cancelada", cancel_reason: reason, cancelled_by: role }, "No pudimos cancelar la solicitud.");
    },
    [fail, updateRequest]
  );

  // ───────── Etapa 4 (aún en memoria): guardadas, entrevistas y reportes ─────────

  const toggleSavedVacancy = useCallback((vacancyId: string) => {
    setState((s) => {
      if (s.session?.role !== "estudiante") return s;
      const studentId = s.session.userId;
      const saved = s.savedVacancies.some((x) => x.studentId === studentId && x.vacancyId === vacancyId);
      return {
        ...s,
        savedVacancies: saved
          ? s.savedVacancies.filter((x) => !(x.studentId === studentId && x.vacancyId === vacancyId))
          : [...s.savedVacancies, { studentId, vacancyId, savedAt: todayISO() }],
      };
    });
  }, []);

  const proposeInterview = useCallback<AppActions["proposeInterview"]>(
    async (applicationId, slots) => {
      const s = stateRef.current;
      const app = s.applications.find((a) => a.id === applicationId);
      if (!app || app.status === "aceptada" || app.status === "rechazada") return fail("Esta postulación ya está cerrada.");
      const existing = s.interviews.find((p) => p.applicationId === applicationId);
      if (existing?.status === "confirmada") return fail("La entrevista ya está confirmada.");
      if (slots.length < 2 || slots.length > 3) return fail("Propón de 2 a 3 horarios.");
      // El cambio de estado sí se guarda en Supabase (y notifica al estudiante); los horarios, por ahora, en memoria.
      if (app.status !== "entrevista") {
        const result = await setApplicationStatus(applicationId, "entrevista");
        if (result.error) return result;
      }
      const now = todayISO();
      setState((st) => ({
        ...st,
        interviews: existing
          ? st.interviews.map((p) =>
              p.id === existing.id ? { ...p, slots, selectedIndex: undefined, status: "propuesta", updatedAt: now } : p
            )
          : [...st.interviews, { id: uid("iv"), applicationId, slots, status: "propuesta", createdAt: now, updatedAt: now }],
      }));
      return {};
    },
    [fail, setApplicationStatus]
  );

  const respondInterview = useCallback<AppActions["respondInterview"]>(async (proposalId, index) => {
    setState((s) => {
      if (s.session?.role !== "estudiante") return s;
      const proposal = s.interviews.find((p) => p.id === proposalId);
      if (!proposal || proposal.status !== "propuesta") return s;
      if (index !== null && !proposal.slots[index]) return s;
      return {
        ...s,
        interviews: s.interviews.map((p) =>
          p.id === proposalId
            ? { ...p, status: index !== null ? "confirmada" : "reprogramar", selectedIndex: index ?? undefined, updatedAt: todayISO() }
            : p
        ),
      };
    });
  }, []);

  const submitReport = useCallback<AppActions["submitReport"]>(async (input) => {
    // Las funciones de setState se ejecutan después; para responder al instante leemos el estado actual.
    const current = stateRef.current;
    if (!current.session) return "error";
    const reporterId = current.session.userId;
    const isDuplicate = (reports: Report[]) =>
      reports.some((r) => r.reporterId === reporterId && r.targetType === input.targetType && r.targetId === input.targetId);
    if (isDuplicate(current.reports)) return "duplicado";
    const report: Report = { id: uid("rp"), reporterId, ...input, createdAt: todayISO() };
    setState((s) => (isDuplicate(s.reports) ? s : { ...s, reports: [...s.reports, report] }));
    return "ok";
  }, []);

  // Recordatorio de periodo: una sola notificación local por estudiante y fecha de fin vencida.
  const session = state.session;
  const sessionStudent =
    session?.role === "estudiante" ? state.students.find((p) => p.id === session.userId) : undefined;
  const expiredPeriodEnd =
    sessionStudent?.periodEndDate && todayISO() > sessionStudent.periodEndDate ? sessionStudent.periodEndDate : null;
  useEffect(() => {
    if (!sessionStudent || !expiredPeriodEnd) return;
    const reminderId = `n-periodo-${sessionStudent.id}-${expiredPeriodEnd}`;
    setState((s) => {
      if (s.notifications.some((n) => n.id === reminderId)) return s;
      const reminder: AppNotification = {
        id: reminderId,
        userId: sessionStudent.id,
        kind: "sistema",
        link: "/estudiante/disponibilidad",
        title: "Actualiza tu disponibilidad",
        body: `Tu periodo terminó el ${formatDate(expiredPeriodEnd)}. Registra tus bloques del nuevo periodo para que la compatibilidad sea exacta.`,
        createdAt: todayISO(),
        read: false,
      };
      return { ...s, notifications: [reminder, ...s.notifications] };
    });
  }, [sessionStudent?.id, expiredPeriodEnd]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      authReady,
      login,
      register,
      logout,
      refresh,
      clearError,
      updateStudentProfile,
      setAvailability,
      toggleSavedVacancy,
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
      proposeInterview,
      respondInterview,
      submitReport,
    }),
    [
      state,
      authReady,
      login,
      register,
      logout,
      refresh,
      clearError,
      updateStudentProfile,
      setAvailability,
      toggleSavedVacancy,
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
      proposeInterview,
      respondInterview,
      submitReport,
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
  const { session, students, availability, applications, notifications, savedVacancies, interviews } = useApp();
  const id = session?.role === "estudiante" ? session.userId : null;
  return useMemo(
    () => ({
      /** Propuestas de entrevista de sus propias postulaciones. */
      interviews: interviews.filter((p) => applications.some((a) => a.id === p.applicationId && a.studentId === id)),
      savedVacancyIds: new Set(savedVacancies.filter((x) => x.studentId === id).map((x) => x.vacancyId)),
      profile: students.find((s) => s.id === id) ?? null,
      blocks: (id && availability[id]) || [],
      applications: applications.filter((a) => a.studentId === id),
      notifications: notifications.filter((n) => n.userId === id),
    }),
    [id, students, availability, applications, notifications, savedVacancies, interviews]
  );
}

/**
 * Datos del negocio autenticado. Los perfiles de estudiantes solo llegan si se postularon a sus
 * vacantes, tienen un servicio activo o recibieron una solicitud suya (visible_public_students).
 */
export function useCurrentBusiness() {
  const { session, businesses, vacancies, applications, students, notifications, interviews, applicationInsights } = useApp();
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
      /** Compatibilidad calculada en el servidor por postulación; nunca incluye los bloques. */
      applicationInsights,
      notifications: notifications.filter((n) => n.userId === id),
      /** Propuestas de entrevista de las postulaciones a sus vacantes. */
      interviews: interviews.filter((p) => received.some((a) => a.id === p.applicationId)),
    };
  }, [id, businesses, vacancies, applications, students, notifications, interviews, applicationInsights]);
}
