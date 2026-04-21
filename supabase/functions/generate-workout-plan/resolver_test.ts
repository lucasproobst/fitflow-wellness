import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ALL_DAYS, resolveSelectedDays } from "./resolver.ts";

Deno.test("body selected_days takes precedence over profile preference", () => {
  const result = resolveSelectedDays(
    ["Segunda", "Quarta", "Sexta"],
    [0, 1, 2, 3, 4, 5, 6], // profile says every day — should be ignored
  );
  assertEquals(result, ["Segunda", "Quarta", "Sexta"]);
});

Deno.test("falls back to preferred_workout_days when body has no selected_days (null)", () => {
  // [0,2,4] = Mon, Wed, Fri
  const result = resolveSelectedDays(null, [0, 2, 4]);
  assertEquals(result, ["Segunda", "Quarta", "Sexta"]);
});

Deno.test("falls back to preferred_workout_days when body has no selected_days (undefined)", () => {
  const result = resolveSelectedDays(undefined, [1, 3, 5]);
  assertEquals(result, ["Terça", "Quinta", "Sábado"]);
});

Deno.test("falls back to preferred_workout_days for the 'active' suggestion (5 days)", () => {
  // EditProfileSheet.activityFrequency.active.suggestedDays = [0,1,2,4,5]
  const result = resolveSelectedDays(undefined, [0, 1, 2, 4, 5]);
  assertEquals(result, ["Segunda", "Terça", "Quarta", "Sexta", "Sábado"]);
});

Deno.test("falls back to preferred_workout_days for the 'sedentary' suggestion (2 days)", () => {
  const result = resolveSelectedDays(undefined, [0, 3]);
  assertEquals(result, ["Segunda", "Quinta"]);
});

Deno.test("empty body array still falls back to preferred_workout_days", () => {
  const result = resolveSelectedDays([], [0, 2, 4]);
  assertEquals(result, ["Segunda", "Quarta", "Sexta"]);
});

Deno.test("invalid body day names are filtered, then preference is used if nothing valid remains", () => {
  const result = resolveSelectedDays(["NotADay", 42, null], [0, 2, 4]);
  assertEquals(result, ["Segunda", "Quarta", "Sexta"]);
});

Deno.test("partially valid body keeps only valid day names (does not fall back)", () => {
  const result = resolveSelectedDays(["Segunda", "NotADay", "Sexta"], [1, 3]);
  assertEquals(result, ["Segunda", "Sexta"]);
});

Deno.test("no body and no preference defaults to all 7 days", () => {
  assertEquals(resolveSelectedDays(null, null), [...ALL_DAYS]);
  assertEquals(resolveSelectedDays(undefined, undefined), [...ALL_DAYS]);
  assertEquals(resolveSelectedDays(null, []), [...ALL_DAYS]);
});

Deno.test("preferred indices out of range are filtered", () => {
  // 7 and -1 invalid; only 0,2,4 survive
  const result = resolveSelectedDays(undefined, [-1, 0, 2, 4, 7, 99]);
  assertEquals(result, ["Segunda", "Quarta", "Sexta"]);
});

Deno.test("preferred with non-numeric entries falls back to all 7 if nothing valid remains", () => {
  const result = resolveSelectedDays(undefined, ["0", "2", null]);
  assertEquals(result, [...ALL_DAYS]);
});

Deno.test("preferred preserves the order given by the user", () => {
  // Saturday (5), Monday (0), Wednesday (2) — order should be respected
  const result = resolveSelectedDays(undefined, [5, 0, 2]);
  assertEquals(result, ["Sábado", "Segunda", "Quarta"]);
});
