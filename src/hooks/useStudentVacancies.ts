import { useMemo } from "react";

import { useStudentWeek } from "@/hooks/useStudentWeek";
import {
  compareCompatibility,
  evaluateCompatibility,
  exceedsWeeklyLimit,
  type CompatibilityResult,
} from "@/lib/compatibility";
import { useApp, useCurrentStudent } from "@/store/AppStore";
import type { Application, BusinessProfile, Vacancy } from "@/types";

export interface StudentVacancyItem {
  vacancy: Vacancy;
  business: BusinessProfile | undefined;
  compatibility: CompatibilityResult;
  application: Application | undefined;
  /** true si aceptarla haría superar el límite semanal del estudiante. */
  exceedsLimit: boolean;
  saved: boolean;
  /** false si la vacante está pausada o cerrada (solo aparece así en Guardadas). */
  available: boolean;
}

function useBuildItem() {
  const { businesses } = useApp();
  const { blocks, applications, savedVacancyIds } = useCurrentStudent();
  const { commitments, maxWeeklyHours } = useStudentWeek();
  return useMemo(
    () =>
      (vacancy: Vacancy): StudentVacancyItem => ({
        vacancy,
        business: businesses.find((b) => b.id === vacancy.businessId),
        compatibility: evaluateCompatibility(blocks, vacancy),
        application: applications.find((a) => a.vacancyId === vacancy.id),
        exceedsLimit: exceedsWeeklyLimit(vacancy, commitments, maxWeeklyHours),
        saved: savedVacancyIds.has(vacancy.id),
        available: vacancy.status === "activa",
      }),
    [businesses, blocks, applications, savedVacancyIds, commitments, maxWeeklyHours]
  );
}

/** Vacantes activas con su compatibilidad para el estudiante actual, ordenadas por compatibilidad. */
export function useStudentVacancies(): StudentVacancyItem[] {
  const { vacancies } = useApp();
  const build = useBuildItem();
  return useMemo(
    () =>
      vacancies
        .filter((v) => v.status === "activa")
        .map(build)
        .sort((a, b) => compareCompatibility(a.compatibility, b.compatibility)),
    [vacancies, build]
  );
}

/** Vacantes guardadas por el estudiante, incluidas las pausadas o cerradas (marcadas como no disponibles). */
export function useSavedVacancies(): StudentVacancyItem[] {
  const { vacancies } = useApp();
  const { savedVacancyIds } = useCurrentStudent();
  const build = useBuildItem();
  return useMemo(
    () =>
      vacancies
        .filter((v) => savedVacancyIds.has(v.id))
        .map(build)
        .sort((a, b) => Number(b.available) - Number(a.available) || compareCompatibility(a.compatibility, b.compatibility)),
    [vacancies, savedVacancyIds, build]
  );
}
