import { useMemo } from "react";

import { compareCompatibility, compatibilityFromSummary, type CompatibilityResult } from "@/lib/compatibility";
import { useCurrentBusiness } from "@/store/AppStore";
import type { Application, StudentProfile, Vacancy } from "@/types";

export interface ApplicantItem {
  application: Application;
  vacancy: Vacancy;
  student: StudentProfile;
  compatibility: CompatibilityResult;
}

/**
 * Postulaciones recibidas por el negocio actual, ordenadas por compatibilidad.
 * La compatibilidad la calcula Supabase (business_application_details): los bloques del
 * estudiante nunca llegan al dispositivo del negocio.
 */
export function useBusinessApplicants(): ApplicantItem[] {
  const { vacancies, applications, applicants, applicationInsights } = useCurrentBusiness();
  return useMemo(() => {
    const items: ApplicantItem[] = [];
    for (const application of applications) {
      const vacancy = vacancies.find((v) => v.id === application.vacancyId);
      const student = applicants.find((s) => s.id === application.studentId);
      if (!vacancy || !student) continue;
      const insight = applicationInsights[application.id];
      items.push({
        application,
        vacancy,
        student,
        compatibility: compatibilityFromSummary(insight?.level ?? "no_compatible", insight?.fullDays ?? 0, vacancy.days),
      });
    }
    return items.sort((a, b) => compareCompatibility(a.compatibility, b.compatibility));
  }, [vacancies, applications, applicants, applicationInsights]);
}
