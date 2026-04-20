// Lightweight password strength scoring (0-4) — no external deps
export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface StrengthResult {
  score: StrengthLevel;
  label: string;
  color: string; // tailwind-friendly hex
  percent: number; // 0-100 for the bar
  hint?: string;
}

const COMMON = new Set([
  "123456", "12345678", "123456789", "password", "senha", "qwerty",
  "111111", "abc123", "123123", "admin", "letmein", "iloveyou",
  "fitflow", "1234567", "monkey", "dragon",
]);

export function evaluatePasswordStrength(pw: string): StrengthResult {
  const value = pw || "";
  if (!value) {
    return { score: 0, label: "", color: "#3a3a3a", percent: 0 };
  }

  if (COMMON.has(value.toLowerCase())) {
    return { score: 0, label: "Muito fraca", color: "#ef4444", percent: 15, hint: "Senha muito comum" };
  }

  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  // Cap at 4
  const final = Math.min(4, score) as StrengthLevel;

  const map: Record<StrengthLevel, Omit<StrengthResult, "score">> = {
    0: { label: "Muito fraca", color: "#ef4444", percent: 15, hint: "Use pelo menos 6 caracteres" },
    1: { label: "Fraca",       color: "#ef4444", percent: 30, hint: "Adicione números ou maiúsculas" },
    2: { label: "Razoável",    color: "#f59e0b", percent: 55, hint: "Misture letras, números e símbolos" },
    3: { label: "Forte",       color: "#22c55e", percent: 80 },
    4: { label: "Muito forte", color: "#22c55e", percent: 100 },
  };

  return { score: final, ...map[final] };
}
