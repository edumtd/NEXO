import { useMemo } from "react";

import { useApp } from "@/store/AppStore";
import type { PublicStudent, ServiceOffer, StudentProfile } from "@/types";

export interface MarketplaceItem {
  offer: ServiceOffer;
  student: PublicStudent;
}

/** Solo los campos que un negocio puede ver; nunca correo ni disponibilidad. */
export function toPublicStudent(s: StudentProfile): PublicStudent {
  return {
    id: s.id,
    fullName: s.fullName,
    career: s.career,
    university: s.university,
    zone: s.zone,
    skills: s.skills,
    academicStatus: s.academicStatus,
  };
}

/** Servicios activos visibles para negocios en la sección Talento. */
export function useMarketplaceOffers(): MarketplaceItem[] {
  const { session, serviceOffers, students } = useApp();
  const isBusiness = session?.role === "negocio";
  return useMemo(() => {
    if (!isBusiness) return [];
    const items: MarketplaceItem[] = [];
    for (const offer of serviceOffers) {
      if (offer.status !== "activo") continue;
      const student = students.find((s) => s.id === offer.studentId);
      if (student) items.push({ offer, student: toPublicStudent(student) });
    }
    return items.sort((a, b) => b.offer.createdAt.localeCompare(a.offer.createdAt));
  }, [isBusiness, serviceOffers, students]);
}

/** Servicios publicados por el estudiante autenticado. */
export function useMyServiceOffers(): ServiceOffer[] {
  const { session, serviceOffers } = useApp();
  const id = session?.role === "estudiante" ? session.userId : null;
  return useMemo(() => serviceOffers.filter((o) => o.studentId === id), [id, serviceOffers]);
}
