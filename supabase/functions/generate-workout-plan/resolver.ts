/**
 * Pure helpers for resolving which weekday names a generated workout plan
 * should target. Kept in a separate, side-effect-free module so it can be
 * unit-tested without booting the Deno HTTP server or touching Supabase.
 */

export const ALL_DAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

/**
 * Decide which weekday names the workout plan should target.
 * Priority:
 *   1. Valid `bodySelectedDays` from the request body (filtered against ALL_DAYS).
 *   2. Profile `preferred_workout_days` (numeric indices 0=Mon … 6=Sun) mapped to names.
 *   3. Fallback: every day of the week.
 */
export function resolveSelectedDays(
  bodySelectedDays: unknown,
  preferredWorkoutDays: unknown,
): string[] {
  if (Array.isArray(bodySelectedDays) && bodySelectedDays.length > 0) {
    const filtered = bodySelectedDays.filter(
      (d: unknown): d is string =>
        typeof d === "string" && (ALL_DAYS as readonly string[]).includes(d),
    );
    if (filtered.length > 0) return filtered;
  }
  if (Array.isArray(preferredWorkoutDays) && preferredWorkoutDays.length > 0) {
    const mapped = preferredWorkoutDays
      .filter(
        (i: unknown): i is number =>
          typeof i === "number" && Number.isInteger(i) && i >= 0 && i <= 6,
      )
      .map((i: number) => ALL_DAYS[i]);
    if (mapped.length > 0) return mapped;
  }
  return [...ALL_DAYS];
}
