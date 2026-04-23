// Kiwify webhook → ativa is_pro=true no user_profile somente quando a compra é aprovada.
// Suporta plano com expiração (subscription/curso por X dias): se o payload trouxer
// uma data de validade, ela é gravada em pro_expires_at.
// Eventos negativos (refund, chargeback, subscription_canceled) desativam is_pro.
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

// Eventos que desativam o plano (revogação imediata)
const DEACTIVATING_EVENTS = new Set([
  "order_refunded", "compra_reembolsada", "refund", "refunded",
  "chargeback", "order_chargeback",
  "subscription_canceled", "subscription_cancelled",
]);

// Eventos que sabemos que NÃO devem liberar nem revogar (apenas log neutro)
const KNOWN_NEUTRAL_EVENTS = new Set([
  "order_rejected", "compra_recusada", "rejected",
  "pix_created", "billet_created", "boleto_created", "waiting_payment",
  "subscription_renewed",
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

    // ── 4. Classifica o evento: aprovação, desativação ou neutro ──────────────
    const isApproved =
      APPROVED_STATUSES.has(rawStatus) || APPROVED_EVENTS.has(rawEvent);
    const isDeactivating = DEACTIVATING_EVENTS.has(rawEvent) || ["refunded", "chargeback"].includes(rawStatus);

    if (!isApproved && !isDeactivating) {
      const isKnownNeutral = KNOWN_NEUTRAL_EVENTS.has(rawEvent);
      logEvent(isKnownNeutral ? "info" : "warn", "event_ignored_not_actionable", {
        status: rawStatus, event: rawEvent, orderId, productId, knownNeutral: isKnownNeutral,
      });
      return json(200, { ok: true, ignored: true, reason: "not_actionable" });
    }

    // ── 5. Extrai user_id de qualquer formato conhecido da Kiwify ─────────────
    // A Kiwify entrega o parâmetro extra do checkout em campos diferentes
    // dependendo do tipo de evento, layout do checkout e versão da API.
    // Verificamos uma whitelist de fontes em ordem de prioridade.
    const sources: Array<{ source: string; value: unknown }> = [
      // Tracking parameters (camelCase e snake_case)
      { source: "tracking.utm_content",          value: payload?.tracking?.utm_content },
      { source: "TrackingParameters.utm_content",value: payload?.TrackingParameters?.utm_content },
      { source: "tracking_parameters.utm_content", value: payload?.tracking_parameters?.utm_content },
      { source: "tracking.s1",                   value: payload?.tracking?.s1 },
      { source: "TrackingParameters.s1",         value: payload?.TrackingParameters?.s1 },
      { source: "tracking.s2",                   value: payload?.tracking?.s2 },
      { source: "tracking.sck",                  value: payload?.tracking?.sck },
      // Custom fields enviados pelo checkout
      { source: "custom_fields.user_id",         value: payload?.custom_fields?.user_id },
      { source: "CustomFields.user_id",          value: payload?.CustomFields?.user_id },
      { source: "custom_fields.userId",          value: payload?.custom_fields?.userId },
      { source: "metadata.user_id",              value: payload?.metadata?.user_id },
      { source: "Customer.metadata.user_id",     value: payload?.Customer?.metadata?.user_id },
      // Body fallback — root level
      { source: "user_id",                       value: payload?.user_id },
      { source: "userId",                        value: payload?.userId },
      { source: "s1",                            value: payload?.s1 },
      { source: "external_id",                   value: payload?.external_id },
      { source: "external_reference",            value: payload?.external_reference },
    ];

    let userId = "";
    let userIdSource: string | null = null;
    for (const { source, value } of sources) {
      if (typeof value === "string" && value.trim()) {
        userId = value.trim();
        userIdSource = source;
        break;
      }
    }

    if (!userId) {
      logEvent("error", "approved_purchase_without_user_id", {
        orderId, productId, status: rawStatus, event: rawEvent,
        availableKeys: Object.keys(payload),
      });
      return json(400, {
        error: "user_id ausente no payload",
        detected_user_id: null,
        detected_source: null,
        order_id: orderId,
      });
    }

    if (!UUID_RE.test(userId)) {
      logEvent("error", "invalid_user_id_format", {
        userId, source: userIdSource, orderId,
      });
      return json(400, {
        error: "user_id em formato inválido (esperado UUID)",
        detected_user_id: userId,
        detected_source: userIdSource,
        order_id: orderId,
      });
    }

    logEvent("info", "user_id_detected", { userId, source: userIdSource, orderId });

    // ── 6. Resolve data de expiração (se houver) ──────────────────────────────
    // A Kiwify pode mandar a validade da assinatura/curso em vários campos.
    // Aceitamos ISO date string OU número de dias de acesso.
    const expirationSources: Array<{ source: string; value: unknown }> = [
      { source: "subscription.next_payment",     value: payload?.subscription?.next_payment },
      { source: "subscription.expires_at",       value: payload?.subscription?.expires_at },
      { source: "Subscription.next_payment",     value: payload?.Subscription?.next_payment },
      { source: "Subscription.expires_at",       value: payload?.Subscription?.expires_at },
      { source: "access.expires_at",             value: payload?.access?.expires_at },
      { source: "access_expires_at",             value: payload?.access_expires_at },
      { source: "expires_at",                    value: payload?.expires_at },
      { source: "valid_until",                   value: payload?.valid_until },
      { source: "end_date",                      value: payload?.end_date },
    ];
    const accessDaysSources: Array<{ source: string; value: unknown }> = [
      { source: "access_days",                   value: payload?.access_days },
      { source: "Product.access_days",           value: payload?.Product?.access_days },
      { source: "product.access_days",           value: payload?.product?.access_days },
      { source: "subscription.access_days",      value: payload?.subscription?.access_days },
    ];

    let proExpiresAt: string | null = null;
    let expirationSource: string | null = null;
    for (const { source, value } of expirationSources) {
      if (typeof value === "string" && value.trim()) {
        const d = new Date(value.trim());
        if (!isNaN(d.getTime())) {
          proExpiresAt = d.toISOString();
          expirationSource = source;
          break;
        }
      } else if (typeof value === "number" && value > 0) {
        proExpiresAt = new Date(value).toISOString();
        expirationSource = source;
        break;
      }
    }
    if (!proExpiresAt) {
      for (const { source, value } of accessDaysSources) {
        const days = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(days) && days > 0) {
          proExpiresAt = new Date(Date.now() + days * 86400000).toISOString();
          expirationSource = source;
          break;
        }
      }
    }

    // ── 7. Atualiza is_pro / pro_expires_at com service role (bypass RLS) ─────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      logEvent("error", "server_misconfigured_missing_supabase_env");
      return json(500, { error: "Server not configured" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const updates: Record<string, unknown> = isDeactivating
      ? { is_pro: false, pro_expires_at: null }
      : { is_pro: true, pro_expires_at: proExpiresAt }; // null se vitalício

    const { data: updated, error } = await supabase
      .from("user_profile")
      .update(updates)
      .eq("user_id", userId)
      .select("user_id, is_pro, pro_expires_at");

    if (error) {
      logEvent("error", "supabase_update_failed", {
        userId, orderId, dbError: error.message,
      });
      return json(500, { error: error.message });
    }

    if (!updated || updated.length === 0) {
      logEvent("warn", "user_profile_not_found", { userId, orderId, productId });
      return json(200, {
        ok: false,
        reason: "user_profile_not_found",
        detected_user_id: userId,
        detected_source: userIdSource,
        order_id: orderId,
      });
    }

    logEvent("info", isDeactivating ? "is_pro_deactivated" : "is_pro_activated", {
      userId, source: userIdSource, orderId, productId,
      status: rawStatus, event: rawEvent,
      pro_expires_at: proExpiresAt, expiration_source: expirationSource,
    });
    return json(200, {
      ok: true,
      activated: !isDeactivating,
      deactivated: isDeactivating,
      detected_user_id: userId,
      detected_source: userIdSource,
      pro_expires_at: isDeactivating ? null : proExpiresAt,
      expiration_source: isDeactivating ? null : expirationSource,
      order_id: orderId,
    });
  } catch (err) {
    logEvent("error", "unhandled_exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return json(500, { error: "Internal error" });
  }
});
