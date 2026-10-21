import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function localDate(date: Date | string, timezone = "Asia/Manila") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
export function dayDistance(a: string, b: string) {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
}
export function streak(dates: string[], today: string) {
  const days = [...new Set(dates)].sort().reverse();
  if (!days.length || dayDistance(days[0], today) > 1) return 0;
  let count = 1;
  for (
    let i = 1;
    i < days.length && dayDistance(days[i], days[i - 1]) === 1;
    i++
  )
    count++;
  return count;
}
export function level(xp: number) {
  return {
    current: Math.floor(xp / 250) + 1,
    progress: xp % 250,
    remaining: 250 - (xp % 250),
  };
}
export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
export function safeNext(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/learn/dashboard";
}
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
