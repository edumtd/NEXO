import { useMemo } from "react";

import { compareCompatibility, evaluateCompatibility, type CompatibilityResult } from "@/lib/compatibility";
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
 * La compatibilidad se calcula sin exponer los bloques del estudiante a la UI
 * (en Supabase lo hará la función `application_compatibility`).
 */
export function useBusinessApplicants(): ApplicantItem[] {
  const { vacancies, applications, applicants, applicantAvailability } = useCurrentBusiness();
  return useMemo(() => {
    const items: ApplicantItem[] = [];
    for (const application of applications) {
      const vacancy = vacancies.find((v) => v.id === application.vacancyId);
      const student = applicants.find((s) => s.id === application.studentId);
      if (!vacancy || !student) continue;
      items.push({
        application,
        vacancy,
        student,
        compatibility: evaluateCompatibility(applicantAvailability(student.id), vacancy),
      });
    }
    return items.sort((a, b) => compareCompatibility(a.compatibility, b.compatibility));
  }, [vacancies, applications, applicants, applicantAvailability]);
}
