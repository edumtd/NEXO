import { DAYS, SALARY_PERIOD_LABELS } from "./constants";
import type { DayIndex, SalaryPeriod, Vacancy } from "@/types";

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatRange(start: number, end: number): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  return `$${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function formatSalary(amount: number, period: SalaryPeriod): string {
  return `${formatMoney(amount)} / ${SALARY_PERIOD_LABELS[period]}`;
}

/** Agrupa días consecutivos: [0,1,2,3,4] => "Lun–Vie". */
export function formatDays(days: DayIndex[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const groups: DayIndex[][] = [];
  for (const d of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1] === d - 1) last.push(d);
    else groups.push([d]);
  }
  return groups
    .map((g) =>
      g.length >= 3
        ? `${DAYS[g[0]].short}–${DAYS[g[g.length - 1]].short}`
        : g.map((d) => DAYS[d].short).join(", ")
    )
    .join(", ");
}

/** Sueldo equivalente por hora, para comparar vacantes con distintos periodos de pago. */
export function hourlyRate(
  v: Pick<Vacancy, "salary" | "salaryPeriod" | "start" | "end" | "days">
): number {
  const shiftHours = Math.max((v.end - v.start) / 60, 0.5);
  const daysPerWeek = Math.max(v.days.length, 1);
  switch (v.salaryPeriod) {
    case "hora":
      return v.salary;
    case "dia":
      return v.salary / shiftHours;
    case "semana":
      return v.salary / (shiftHours * daysPerWeek);
    case "mes":
      return v.salary / (shiftHours * daysPerWeek * 4.33);
  }
}

export function weeklyHours(v: Pick<Vacancy, "start" | "end" | "days">): number {
  return ((v.end - v.start) / 60) * v.days.length;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const ACCENTS: Record<string, string> = { á: "a", à: "a", ä: "a", â: "a", é: "e", è: "e", ë: "e", ê: "e", í: "i", ì: "i", ï: "i", î: "i", ó: "o", ò: "o", ö: "o", ô: "o", ú: "u", ù: "u", ü: "u", û: "u", ñ: "n" };

/** Texto para búsquedas: sin acentos ni mayúsculas ("Cafetería" → "cafeteria"). */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[áàäâéèëêíìïîóòöôúùüûñ]/g, (c) => ACCENTS[c] ?? c).trim();
}

/** true si todas las palabras de la búsqueda aparecen en alguno de los textos. */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(" "));
  return words.every((w) => haystack.includes(w));
}

/** Fecha AAAA-MM-DD sumando días a hoy. */
export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
