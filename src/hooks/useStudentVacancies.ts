import { useMemo } from "react";

import { compareCompatibility, evaluateCompatibility, type CompatibilityResult } from "@/lib/compatibility";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import type { Application, BusinessProfile, Vacancy } from "@/types";

export interface StudentVacancyItem {
  vacancy: Vacancy;
  business: BusinessProfile | undefined;
  compatibility: CompatibilityResult;
  application: Application | undefined;
}

/** Vacantes activas con su compatibilidad para el estudiante actual, ordenadas por compatibilidad. */
export function useStudentVacancies(): StudentVacancyItem[] {
  const { vacancies, businesses } = useApp();
  const { blocks, applications } = useCurrentStudent();
  return useMemo(
    () =>
      vacancies
        .filter((v) => v.status === "activa")
        .map((vacancy) => ({
          vacancy,
          business: businesses.find((b) => b.id === vacancy.businessId),
          compatibility: evaluateCompatibility(blocks, vacancy),
          application: applications.find((a) => a.vacancyId === vacancy.id),
        }))
        .sort((a, b) => compareCompatibility(a.compatibility, b.compatibility)),
    [vacancies, businesses, blocks, applications]
  );
}
