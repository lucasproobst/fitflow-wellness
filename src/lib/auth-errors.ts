// Traduz mensagens comuns do Supabase Auth para português
const map: Array<{ match: RegExp; pt: string }> = [
  { match: /invalid login credentials/i, pt: "E-mail ou senha incorretos" },
  { match: /invalid email or password/i, pt: "E-mail ou senha incorretos" },
  { match: /email not confirmed/i, pt: "Confirme seu e-mail antes de entrar" },
  { match: /user already registered|already registered|user already exists/i, pt: "Este e-mail já está cadastrado" },
  { match: /password should be at least (\d+)/i, pt: "A senha deve ter pelo menos 6 caracteres" },
  { match: /unable to validate email address|invalid email/i, pt: "E-mail inválido" },
  { match: /signup.*disabled|signups not allowed/i, pt: "Cadastros estão temporariamente desativados" },
  { match: /email rate limit exceeded|over_email_send_rate_limit/i, pt: "Muitos e-mails enviados. Aguarde alguns minutos e tente novamente" },
  { match: /rate limit|too many requests/i, pt: "Muitas tentativas. Aguarde um momento e tente novamente" },
  { match: /user not found/i, pt: "Usuário não encontrado" },
  { match: /token has expired|expired/i, pt: "Link expirado. Solicite um novo" },
  { match: /invalid token|invalid.*recovery/i, pt: "Link inválido ou já utilizado" },
  { match: /new password should be different/i, pt: "A nova senha deve ser diferente da anterior" },
  { match: /weak password|password.*weak/i, pt: "Senha muito fraca. Use letras, números e símbolos" },
  { match: /network|fetch failed|failed to fetch/i, pt: "Erro de conexão. Verifique sua internet" },
  { match: /captcha/i, pt: "Falha na verificação. Tente novamente" },
  { match: /provider is not enabled|oauth.*not.*enabled/i, pt: "Este método de login não está disponível" },
  { match: /session.*missing|auth session missing/i, pt: "Sessão expirada. Faça login novamente" },
];

export function translateAuthError(err: unknown, fallback = "Algo deu errado. Tente novamente"): string {
  const msg = (err as any)?.message || (typeof err === "string" ? err : "") || "";
  if (!msg) return fallback;
  for (const { match, pt } of map) {
    if (match.test(msg)) return pt;
  }
  return msg;
}
