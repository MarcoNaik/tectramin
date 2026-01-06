import { UTCDate } from "@date-fns/utc";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { AssignmentWithTemplates } from "../hooks/useAssignments";

export interface DayData {
  dateKey: string;
  date: Date;
  dayOfWeek: string;
  dayNumber: number;
  isToday: boolean;
  assignments: AssignmentWithTemplates[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function dateStringToUTCMidnight(dateString: string): number {
  const parsed = parseISO(dateString);
  const utcDate = new UTCDate(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
  return utcDate.getTime();
}

export function utcMidnightToDateString(timestamp: number): string {
  const utcDate = new UTCDate(timestamp);
  return format(utcDate, "yyyy-MM-dd");
}

export function formatUTCDateKey(timestamp: number): string {
  const utcDate = new UTCDate(timestamp);
  return format(utcDate, "yyyy-MM-dd");
}

export function getTodayUTCMidnight(): number {
  const now = new Date();
  const utcDate = new UTCDate(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  return utcDate.getTime();
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupAssignmentsByDate(
  assignments: AssignmentWithTemplates[]
): Map<string, AssignmentWithTemplates[]> {
  const grouped = new Map<string, AssignmentWithTemplates[]>();

  for (const assignment of assignments) {
    const dateKey = formatUTCDateKey(assignment.dayDate);
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, assignment]);
  }

  return grouped;
}

export function generateMonthDays(
  referenceDate: Date,
  assignments: AssignmentWithTemplates[]
): { days: DayData[]; todayIndex: number } {
  const todayTimestamp = getTodayUTCMidnight();
  const todayKey = formatUTCDateKey(todayTimestamp);

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const assignmentsByDate = groupAssignmentsByDate(assignments);

  const days: DayData[] = [];
  let todayIndex = 0;

  const current = new Date(firstDay);
  while (current <= lastDay) {
    const dateKey = formatDateKey(current);
    const isToday = dateKey === todayKey;

    if (isToday) {
      todayIndex = days.length;
    }

    days.push({
      dateKey,
      date: new Date(current),
      dayOfWeek: format(current, "EEEE", { locale: es }),
      dayNumber: current.getDate(),
      isToday,
      assignments: assignmentsByDate.get(dateKey) || [],
    });

    current.setDate(current.getDate() + 1);
  }

  return { days, todayIndex };
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy", { locale: es });
}

export function formatFullDate(date: Date): string {
  return format(date, "d 'de' MMMM, yyyy", { locale: es });
}

export function formatUTCFullDate(timestamp: number): string {
  const utcDate = new UTCDate(timestamp);
  return format(utcDate, "d 'de' MMMM, yyyy", { locale: es });
}
