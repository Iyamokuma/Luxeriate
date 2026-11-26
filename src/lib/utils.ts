import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Escape a value for use inside a PostgREST `or()` / `ilike` filter. */
export function escapeFilter(value: string) {
  return value.replace(/[%_,()*\\]/g, " ").trim();
}

export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
