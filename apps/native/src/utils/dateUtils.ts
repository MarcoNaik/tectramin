import type { AssignmentWithTemplates } from "../hooks/useAssignments";

export interface DayData {
  dateKey: string;
  date: Date;
  dayOfWeek: string;
  dayNumber: number;
  isToday: boolean;
  assignments: AssignmentWithTemplates[];
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
    const dateKey = formatDateKey(new Date(assignment.dayDate));
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, assignment]);
  }

  return grouped;
}

export function generateMonthDays(
  referenceDate: Date,
  assignments: AssignmentWithTemplates[]
): { days: DayData[]; todayIndex: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

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
      dayOfWeek: current.toLocaleDateString("es-CL", { weekday: "long" }),
      dayNumber: current.getDate(),
      isToday,
      assignments: assignmentsByDate.get(dateKey) || [],
    });

    current.setDate(current.getDate() + 1);
  }

  return { days, todayIndex };
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
