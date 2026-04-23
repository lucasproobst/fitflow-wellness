// Kiwify webhook → ativa is_pro=true no user_profile somente quando a compra é aprovada.
// Qualquer outro evento (reembolso, chargeback, recusa, teste manual, payload inválido)
// é ignorado/recusado com log estruturado para auditoria.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Whitelist explícita de status/eventos que liberam o plano
const APPROVED_STATUSES = new Set(["paid", "approved", "completed"]);
const APPROVED_EVENTS = new Set([
  "order_approved",
  "compra_aprovada",
  "purchase_approved",
]);

// Eventos que sabemos que NÃO devem liberar (apenas para log mais claro)
const KNOWN_NEGATIVE_EVENTS = new Set([
  "order_refunded", "compra_reembolsada", "refund",
  "chargeback", "order_chargeback",
  "order_rejected", "compra_recusada", "rejected",
  "pix_created", "billet_created", "boleto_created", "waiting_payment",
  "subscription_canceled", "subscription_renewed",
]);

// Validação de UUID v4 (Supabase user_id)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function logEvent(level: "info" | "warn" | "error", msg: string, ctx: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...ctx });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Aceita somente POST (Kiwify envia POST)
  if (req.method !== "POST") {
    logEvent("warn", "method_not_allowed", { method: req.method });
    return json(405, { error: "Method not allowed" });
  }

  try {
    // ── 1. Validação do token (assinatura compartilhada com a Kiwify) ─────────
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("token");
    const tokenFromHeader = req.headers.get("x-kiwify-token");
    const expectedToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");

    if (!expectedToken) {
      logEvent("error", "server_misconfigured_missing_token_secret");
      return json(500, { error: "Server not configured" });
    }

    const providedToken = tokenFromQuery || tokenFromHeader;
    if (!providedToken || providedToken !== expectedToken) {
      logEvent("warn", "invalid_token_rejected", {
        ip: req.headers.get("x-forwarded-for") || "unknown",
        hasQuery: !!tokenFromQuery,
        hasHeader: !!tokenFromHeader,
      });
      return json(401, { error: "Unauthorized" });
    }

    // ── 2. Parse seguro do payload ────────────────────────────────────────────
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      logEvent("warn", "invalid_json_payload");
      return json(400, { error: "Invalid JSON" });
    }

    if (!payload || typeof payload !== "object") {
      logEvent("warn", "payload_not_object");
      return json(400, { error: "Invalid payload" });
    }

    // ── 3. Normaliza status e tipo de evento ──────────────────────────────────
    const rawStatus = String(
      payload.order_status ?? payload.status ?? ""
    ).toLowerCase().trim();

    const rawEvent = String(
      payload.webhook_event_type ?? payload.event ?? payload.event_type ?? ""
    ).toLowerCase().trim();

    const orderId =
      payload.order_id ?? payload.order?.id ?? payload.id ?? null;

    const productId =
      payload.product_id ?? payload.Product?.product_id ?? payload.product?.id ?? null;

    // ── 4. WHITELIST: somente compras aprovadas seguem ────────────────────────
    const isApproved =
      APPROVED_STATUSES.has(rawStatus) || APPROVED_EVENTS.has(rawEvent);

    if (!isApproved) {
      const isKnownNegative = KNOWN_NEGATIVE_EVENTS.has(rawEvent);
      logEvent(isKnownNegative ? "info" : "warn", "event_ignored_not_approved", {
        status: rawStatus,
        event: rawEvent,
        orderId,
        productId,
        knownNegative: isKnownNegative,
      });
      // 200 para a Kiwify não reentregar — recebemos com sucesso, só não ativamos.
      return json(200, { ok: true, ignored: true, reason: "not_approved" });
    }

    // ── 5. Extrai e valida user_id (vindo do checkout via utm_content) ────────
    const rawUserId: unknown =
      payload?.tracking?.utm_content ??
      payload?.TrackingParameters?.utm_content ??
      payload?.custom_fields?.user_id ??
      payload?.s1 ??
      payload?.tracking?.s1;

    const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";

    if (!userId) {
      logEvent("error", "approved_purchase_without_user_id", {
        orderId,
        productId,
        status: rawStatus,
        event: rawEvent,
      });
      return json(400, { error: "user_id ausente no payload" });
    }

    if (!UUID_RE.test(userId)) {
      logEvent("error", "invalid_user_id_format", { userId, orderId });
      return json(400, { error: "user_id inválido" });
    }

    // ── 6. Ativa is_pro com service role (bypass RLS) ─────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      logEvent("error", "server_misconfigured_missing_supabase_env");
      return json(500, { error: "Server not configured" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: updated, error } = await supabase
      .from("user_profile")
      .update({ is_pro: true })
      .eq("user_id", userId)
      .select("user_id, is_pro");

    if (error) {
      logEvent("error", "supabase_update_failed", {
        userId, orderId, dbError: error.message,
      });
      return json(500, { error: error.message });
    }

    if (!updated || updated.length === 0) {
      logEvent("warn", "user_profile_not_found", { userId, orderId, productId });
      // 200 para evitar reentrega; mas registramos para o suporte ativar manualmente.
      return json(200, { ok: false, reason: "user_profile_not_found", userId });
    }

    logEvent("info", "is_pro_activated", { userId, orderId, productId, status: rawStatus, event: rawEvent });
    return json(200, { ok: true, user_id: userId, activated: true });
  } catch (err) {
    logEvent("error", "unhandled_exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return json(500, { error: "Internal error" });
  }
});
