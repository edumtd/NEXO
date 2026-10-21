import { useMemo } from "react";

import { toPublicStudent } from "@/hooks/useServiceOffers";
import { evaluateCompatibility, type CompatibilityResult } from "@/lib/compatibility";
import { SERVICE_CONTACT_VISIBLE } from "@/lib/constants";
import { useApp } from "@/store/AppStore";
import type { BusinessProfile, PublicStudent, ServiceOffer, ServiceRequest, ServiceUpdate } from "@/types";

export interface BusinessRequestItem {
  request: ServiceRequest;
  offer: ServiceOffer;
  student: PublicStudent;
  /** Solo para solicitudes con horario; los bloques del estudiante nunca salen del hook. */
  compatibility: CompatibilityResult | null;
  /** Visible únicamente a partir de que el prestador acepta. */
  contactEmail: string | null;
  /** Bitácora en orden cronológico. */
  updates: ServiceUpdate[];
}

export interface StudentRequestItem {
  request: ServiceRequest;
  offer: ServiceOffer;
  business: BusinessProfile | undefined;
  /** Correo del negocio, visible a partir de que el prestador acepta. */
  contactEmail: string | null;
  updates: ServiceUpdate[];
}

export const hasSchedule = (r: ServiceRequest) =>
  !!r.days?.length && r.start !== undefined && r.end !== undefined;

export const isContactVisible = (r: ServiceRequest) => SERVICE_CONTACT_VISIBLE.includes(r.status);

/** Solicitudes que esperan una acción de la persona que las ve. */
export const needsStudentAction = (r: ServiceRequest) => r.status === "enviada" || r.status === "aceptada" || r.status === "en_proceso";
export const needsBusinessAction = (r: ServiceRequest) => r.status === "entregada";

function updatesFor(all: ServiceUpdate[], requestId: string): ServiceUpdate[] {
  return all.filter((u) => u.requestId === requestId);
}

/** Solicitudes enviadas por el negocio autenticado; primero las que esperan su revisión. */
export function useBusinessServiceRequests(): BusinessRequestItem[] {
  const { session, serviceRequests, serviceOffers, serviceUpdates, students, availability } = useApp();
  const id = session?.role === "negocio" ? session.userId : null;
  return useMemo(() => {
    const items: BusinessRequestItem[] = [];
    for (const request of serviceRequests) {
      if (request.businessId !== id) continue;
      const offer = serviceOffers.find((o) => o.id === request.offerId);
      const student = offer && students.find((s) => s.id === offer.studentId);
      if (!offer || !student) continue;
      items.push({
        request,
        offer,
        student: toPublicStudent(student),
        compatibility: hasSchedule(request)
          ? evaluateCompatibility(availability[student.id] ?? [], {
              days: request.days!,
              start: request.start!,
              end: request.end!,
            })
          : null,
        contactEmail: isContactVisible(request) ? student.email : null,
        updates: updatesFor(serviceUpdates, request.id),
      });
    }
    const priority = (r: ServiceRequest) => (needsBusinessAction(r) ? 0 : 1);
    return items.sort(
      (a, b) =>
        priority(a.request) - priority(b.request) || b.request.updatedAt.localeCompare(a.request.updatedAt)
    );
  }, [id, serviceRequests, serviceOffers, serviceUpdates, students, availability]);
}

/** Solicitudes recibidas en los servicios del estudiante autenticado; las pendientes primero. */
export function useStudentServiceRequests(): StudentRequestItem[] {
  const { session, serviceRequests, serviceOffers, serviceUpdates, businesses } = useApp();
  const id = session?.role === "estudiante" ? session.userId : null;
  return useMemo(() => {
    const items: StudentRequestItem[] = [];
    for (const request of serviceRequests) {
      const offer = serviceOffers.find((o) => o.id === request.offerId);
      if (!offer || offer.studentId !== id) continue;
      const business = businesses.find((b) => b.id === request.businessId);
      items.push({
        request,
        offer,
        business,
        contactEmail: isContactVisible(request) ? business?.contactEmail ?? null : null,
        updates: updatesFor(serviceUpdates, request.id),
      });
    }
    const priority = (r: ServiceRequest) => (r.status === "enviada" ? 0 : needsStudentAction(r) ? 1 : 2);
    return items.sort(
      (a, b) =>
        priority(a.request) - priority(b.request) || b.request.updatedAt.localeCompare(a.request.updatedAt)
    );
  }, [id, serviceRequests, serviceOffers, serviceUpdates, businesses]);
}
