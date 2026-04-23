// Persistência do redirect pós-login (sobrevive a refresh, OAuth e troca de aba).
// Usamos localStorage (com TTL) em vez de sessionStorage porque o fluxo OAuth do
// Google pode abrir nova aba/contexto e perder o sessionStorage.

const KEY = "postAuthRedirect";
const TTL_MS = 30 * 60 * 1000; // 30 minutos

export type PostAuthIntent = "checkout-plus";

interface StoredIntent {
  intent: PostAuthIntent;
  ts: number;
}

export function setPostAuthRedirect(intent: PostAuthIntent) {
  try {
    const payload: StoredIntent = { intent, ts: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
    // mantém também em sessionStorage para retrocompatibilidade
    sessionStorage.setItem(KEY, intent);
  } catch {
    // storage indisponível (modo privado etc.) — silencioso
  }
}

export function getPostAuthRedirect(): PostAuthIntent | null {
  try {
    // 1. URL param tem prioridade (?redirect=checkout-plus)
    const fromUrl = new URLSearchParams(window.location.search).get("redirect");
    if (fromUrl === "checkout-plus") return "checkout-plus";

    // 2. localStorage com TTL
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredIntent;
        if (parsed?.intent && Date.now() - parsed.ts < TTL_MS) {
          return parsed.intent;
        }
        // expirado — limpa
        localStorage.removeItem(KEY);
      } catch {
        // valor antigo simples (string) — aceita
        if (raw === "checkout-plus") return "checkout-plus";
      }
    }

    // 3. sessionStorage fallback
    const ss = sessionStorage.getItem(KEY);
    if (ss === "checkout-plus") return "checkout-plus";

    return null;
  } catch {
    return null;
  }
}

export function clearPostAuthRedirect() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    // noop
  }
}

const KIWIFY_PLUS_URL_FALLBACK = "https://pay.kiwify.com.br/SUA_URL_AQUI";

export function buildKiwifyCheckoutUrl(user: { id: string; email?: string | null }) {
  const baseUrl =
    (import.meta.env.VITE_KIWIFY_CHECKOUT_URL_PLUS as string | undefined) ||
    KIWIFY_PLUS_URL_FALLBACK;
  const successUrl = `${window.location.origin}/checkout/sucesso`;
  const url = new URL(baseUrl);
  url.searchParams.set("utm_content", user.id);
  if (user.email) url.searchParams.set("email", user.email);
  url.searchParams.set("redirect_url", successUrl);
  return url.toString();
}
