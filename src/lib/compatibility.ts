import type {
  Application,
  AvailabilityBlock,
  DayIndex,
  ServiceOffer,
  ServiceRequest,
  Vacancy,
} from "@/types";

export type CompatibilityLevel = "compatible" | "parcial" | "no_compatible";

export interface DayCoverage {
  day: DayIndex;
  /** 0..1 proporción del turno cubierta por la disponibilidad */
  coverage: number;
}

export interface CompatibilityResult {
  level: CompatibilityLevel;
  /** 0..100 proporción promedio del turno cubierta en los días laborales */
  score: number;
  days: DayCoverage[];
  fullyCoveredDays: number;
}

export const COMPATIBILITY_LABELS: Record<CompatibilityLevel, string> = {
  compatible: "Compatible",
  parcial: "Parcialmente compatible",
  no_compatible: "No compatible",
};

type Interval = [number, number];

/** Une bloques contiguos o traslapados de un mismo día (8–10 y 10–12 => 8–12). */
export function mergeBlocks(blocks: AvailabilityBlock[], day: DayIndex): Interval[] {
  const sorted = blocks
    .filter((b) => b.day === day && b.end > b.start)
    .map((b): Interval => [b.start, b.end])
    .sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else merged.push(cur);
  }
  return merged;
}

function coveredMinutes(intervals: Interval[], start: number, end: number): number {
  let total = 0;
  for (const [s, e] of intervals) {
    const overlap = Math.min(e, end) - Math.max(s, start);
    if (overlap > 0) total += overlap;
  }
  return total;
}

/**
 * Compara la disponibilidad del estudiante con el turno de la vacante (sin IA).
 * - Compatible: cubre el turno completo en todos los días laborales.
 * - Parcialmente compatible: cubre al menos una parte del turno.
 * - No compatible: no hay coincidencia.
 */
export function evaluateCompatibility(
  blocks: AvailabilityBlock[],
  vacancy: Pick<Vacancy, "days" | "start" | "end">
): CompatibilityResult {
  const shift = vacancy.end - vacancy.start;
  if (shift <= 0 || vacancy.days.length === 0) {
    return { level: "no_compatible", score: 0, days: [], fullyCoveredDays: 0 };
  }
  const days: DayCoverage[] = vacancy.days.map((day) => {
    const covered = coveredMinutes(mergeBlocks(blocks, day), vacancy.start, vacancy.end);
    return { day, coverage: Math.min(covered / shift, 1) };
  });
  const fullyCoveredDays = days.filter((d) => d.coverage >= 1).length;
  const avg = days.reduce((acc, d) => acc + d.coverage, 0) / days.length;
  const level: CompatibilityLevel =
    fullyCoveredDays === days.length ? "compatible" : avg > 0 ? "parcial" : "no_compatible";
  return { level, score: Math.round(avg * 100), days, fullyCoveredDays };
}

export function totalWeeklyMinutes(blocks: AvailabilityBlock[]): number {
  let total = 0;
  for (let d = 0; d < 7; d++) {
    for (const [s, e] of mergeBlocks(blocks, d as DayIndex)) total += e - s;
  }
  return total;
}

const LEVEL_ORDER: Record<CompatibilityLevel, number> = {
  compatible: 0,
  parcial: 1,
  no_compatible: 2,
};

export function compareCompatibility(a: CompatibilityResult, b: CompatibilityResult): number {
  return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.score - a.score;
}

// ───────── Carga semanal ─────────

/** Un turno que el estudiante ya se comprometió a cubrir cada semana. */
export interface WeeklyCommitment {
  source: "vacante" | "servicio";
  /** id de la vacante o de la solicitud de servicio */
  refId: string;
  title: string;
  days: DayIndex[];
  start: number;
  end: number;
}

/** Horas por semana de un turno repetido en varios días. */
export function shiftWeeklyHours(s: { days: DayIndex[]; start: number; end: number }): number {
  return (Math.max(s.end - s.start, 0) / 60) * s.days.length;
}

/**
 * Turnos comprometidos del estudiante: vacantes con postulación `aceptada` y servicios
 * de Talento con horario en `aceptada` o `en_proceso`. Función pura.
 */
export function studentCommitments(input: {
  studentId: string;
  applications: Application[];
  vacancies: Vacancy[];
  serviceRequests: ServiceRequest[];
  serviceOffers: ServiceOffer[];
}): WeeklyCommitment[] {
  const { studentId, applications, vacancies, serviceRequests, serviceOffers } = input;
  const result: WeeklyCommitment[] = [];
  for (const a of applications) {
    if (a.studentId !== studentId || a.status !== "aceptada") continue;
    const v = vacancies.find((x) => x.id === a.vacancyId);
    if (v) result.push({ source: "vacante", refId: v.id, title: v.title, days: v.days, start: v.start, end: v.end });
  }
  for (const r of serviceRequests) {
    if (r.status !== "aceptada" && r.status !== "en_proceso") continue;
    if (!r.days?.length || r.start === undefined || r.end === undefined) continue;
    const o = serviceOffers.find((x) => x.id === r.offerId);
    if (o?.studentId === studentId) {
      result.push({ source: "servicio", refId: r.id, title: o.title, days: r.days, start: r.start, end: r.end });
    }
  }
  return result;
}

export function committedWeeklyHours(commitments: WeeklyCommitment[]): number {
  return commitments.reduce((acc, c) => acc + shiftWeeklyHours(c), 0);
}

/**
 * true si aceptar esta vacante haría superar el límite semanal.
 * No cuenta dos veces una vacante que el estudiante ya tiene aceptada.
 */
export function exceedsWeeklyLimit(
  vacancy: Pick<Vacancy, "id" | "days" | "start" | "end">,
  commitments: WeeklyCommitment[],
  maxWeeklyHours?: number
): boolean {
  if (!maxWeeklyHours) return false;
  const others = commitments.filter((c) => !(c.source === "vacante" && c.refId === vacancy.id));
  return committedWeeklyHours(others) + shiftWeeklyHours(vacancy) > maxWeeklyHours;
}

/**
 * Convierte el resumen que calcula el servidor (nivel y días cubiertos) en un CompatibilityResult
 * para la UI del negocio. La cobertura por día es aproximada (solo cuenta días completos): el
 * negocio nunca recibe los bloques del estudiante.
 */
export function compatibilityFromSummary(
  level: CompatibilityLevel,
  fullDays: number,
  days: DayIndex[]
): CompatibilityResult {
  const total = days.length;
  return {
    level,
    score: total ? Math.round((fullDays / total) * 100) : 0,
    days: days.map((day, i) => ({ day, coverage: i < fullDays ? 1 : 0 })),
    fullyCoveredDays: fullDays,
  };
}
