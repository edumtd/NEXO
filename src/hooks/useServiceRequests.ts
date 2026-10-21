import { useMemo } from "react";

import { toPublicStudent } from "@/hooks/useServiceOffers";
import { evaluateCompatibility, type CompatibilityResult } from "@/lib/compatibility";
import { useApp } from "@/store/AppStore";
import type { BusinessProfile, PublicStudent, ServiceOffer, ServiceRequest } from "@/types";

export interface BusinessRequestItem {
  request: ServiceRequest;
  offer: ServiceOffer;
  student: PublicStudent;
  /** Solo para solicitudes con horario; los bloques del estudiante nunca salen del hook. */
  compatibility: CompatibilityResult | null;
  /** Visible únicamente cuando el estudiante aceptó la solicitud. */
  contactEmail: string | null;
}

export interface StudentRequestItem {
  request: ServiceRequest;
  offer: ServiceOffer;
  business: BusinessProfile | undefined;
}

const hasSchedule = (r: ServiceRequest) =>
  !!r.days?.length && r.start !== undefined && r.end !== undefined;

/** Solicitudes enviadas por el negocio autenticado, más recientes primero. */
export function useBusinessServiceRequests(): BusinessRequestItem[] {
  const { session, serviceRequests, serviceOffers, students, availability } = useApp();
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
        contactEmail:
          request.status === "aceptada" || request.status === "completada" ? student.email : null,
      });
    }
    return items.sort((a, b) => b.request.updatedAt.localeCompare(a.request.updatedAt));
  }, [id, serviceRequests, serviceOffers, students, availability]);
}

/** Solicitudes recibidas en los servicios del estudiante autenticado; las pendientes primero. */
export function useStudentServiceRequests(): StudentRequestItem[] {
  const { session, serviceRequests, serviceOffers, businesses } = useApp();
  const id = session?.role === "estudiante" ? session.userId : null;
  return useMemo(() => {
    const items: StudentRequestItem[] = [];
    for (const request of serviceRequests) {
      const offer = serviceOffers.find((o) => o.id === request.offerId);
      if (!offer || offer.studentId !== id) continue;
      items.push({ request, offer, business: businesses.find((b) => b.id === request.businessId) });
    }
    const pendingFirst = (r: ServiceRequest) => (r.status === "enviada" ? 0 : 1);
    return items.sort(
      (a, b) =>
        pendingFirst(a.request) - pendingFirst(b.request) ||
        b.request.updatedAt.localeCompare(a.request.updatedAt)
    );
  }, [id, serviceRequests, serviceOffers, businesses]);
}
