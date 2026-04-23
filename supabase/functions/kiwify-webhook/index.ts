// Kiwify webhook → ativa is_pro no user_profile
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("token");
    const tokenFromHeader = req.headers.get("x-kiwify-token");
    const expectedToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");

    if (!expectedToken) {
      console.error("KIWIFY_WEBHOOK_TOKEN não configurado");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providedToken = tokenFromQuery || tokenFromHeader;
    if (providedToken !== expectedToken) {
      console.warn("Token inválido recebido da Kiwify");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Kiwify webhook recebido:", JSON.stringify(payload));

    // Status de pagamento aprovado na Kiwify
    const status: string = payload?.order_status || payload?.status || "";
    const isApproved =
      status === "paid" ||
      status === "approved" ||
      payload?.webhook_event_type === "order_approved";

    // user_id passado via parâmetro `s1` (custom field) ou `tracking.utm_content`
    const userId: string | undefined =
      payload?.tracking?.utm_content ||
      payload?.TrackingParameters?.utm_content ||
      payload?.custom_fields?.user_id ||
      payload?.s1 ||
      payload?.tracking?.s1;

    if (!isApproved) {
      console.log(`Evento ignorado (status=${status})`);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      console.error("user_id ausente no payload da Kiwify", payload);
      return new Response(
        JSON.stringify({ error: "user_id ausente no payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("user_profile")
      .update({ is_pro: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao ativar is_pro:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`is_pro ativado para user_id=${userId}`);
    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro no webhook Kiwify:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
