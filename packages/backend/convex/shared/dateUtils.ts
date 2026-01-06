import { UTCDate } from "@date-fns/utc";
import { format, parseISO } from "date-fns";

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

export function normalizeToUTCMidnight(timestamp: number): number {
  const date = new Date(timestamp);
  const utcDate = new UTCDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
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

export function daysBetween(startTimestamp: number, endTimestamp: number): number {
  return Math.round((endTimestamp - startTimestamp) / MS_PER_DAY) + 1;
}
