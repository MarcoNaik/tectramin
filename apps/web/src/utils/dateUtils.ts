import { UTCDate } from "@date-fns/utc";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

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

export function addDaysUTC(timestamp: number, days: number): number {
  return timestamp + days * MS_PER_DAY;
}

export function formatUTCDate(
  timestamp: number,
  formatString: string
): string {
  const utcDate = new UTCDate(timestamp);
  return format(utcDate, formatString, { locale: es });
}

export function getUTCDateParts(timestamp: number): {
  weekday: string;
  day: number;
  month: string;
} {
  const utcDate = new UTCDate(timestamp);
  return {
    weekday: format(utcDate, "EEE", { locale: es }),
    day: utcDate.getUTCDate(),
    month: format(utcDate, "MMM", { locale: es }),
  };
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

export function isSameUTCDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new UTCDate(timestamp1);
  const date2 = new UTCDate(timestamp2);
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}
