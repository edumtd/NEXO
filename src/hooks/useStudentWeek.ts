import { useMemo } from "react";

import {
  committedWeeklyHours,
  studentCommitments,
  totalWeeklyMinutes,
  type WeeklyCommitment,
} from "@/lib/compatibility";
import { useApp, useCurrentStudent } from "@/store/AppStore";

export interface StudentWeek {
  commitments: WeeklyCommitment[];
  /** Horas de bloques libres registrados. */
  freeHours: number;
  /** Horas de turnos y servicios ya comprometidos. */
  committedHours: number;
  maxWeeklyHours?: number;
  /** Horas que aún puede comprometer según su límite; null si no tiene límite. */
  remainingHours: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Carga semanal del estudiante autenticado. Privada: no se expone al negocio. */
export function useStudentWeek(): StudentWeek {
  const { applications, vacancies, serviceRequests, serviceOffers } = useApp();
  const { profile, blocks } = useCurrentStudent();
  return useMemo(() => {
    const commitments = profile
      ? studentCommitments({ studentId: profile.id, applications, vacancies, serviceRequests, serviceOffers })
      : [];
    const committedHours = round1(committedWeeklyHours(commitments));
    const max = profile?.maxWeeklyHours;
    return {
      commitments,
      freeHours: round1(totalWeeklyMinutes(blocks) / 60),
      committedHours,
      maxWeeklyHours: max,
      remainingHours: max ? round1(Math.max(max - committedHours, 0)) : null,
    };
  }, [profile, blocks, applications, vacancies, serviceRequests, serviceOffers]);
}
