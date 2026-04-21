import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { ALL_DAYS, resolveSelectedDays } from "./resolver.ts";
export { ALL_DAYS, resolveSelectedDays };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Optional body: { selected_days?: string[] } — names in Portuguese
    let bodySelectedDays: unknown = null;
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        bodySelectedDays = body?.selected_days;
      }
    } catch { /* no body / invalid json — fall through */ }

    const { data: profile, error: profileError } = await supabase
      .from("user_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedDays = resolveSelectedDays(
      bodySelectedDays,
      (profile as { preferred_workout_days?: unknown }).preferred_workout_days,
    );
    const restDays = ALL_DAYS.filter((d) => !selectedDays.includes(d));

    const goal = profile.goal || "maintain";
    const activity = profile.activity_level || "moderate";

    const goalDescriptions: Record<string, string> = {
      lose_weight: "perda de gordura — priorize compostos básicos com mais repetições (12-15) + 1-2 finalizadores cardio simples (corrida, bike, polichinelos, burpees). Evite isolamentos avançados.",
      gain_muscle: "hipertrofia — base nos 'big 6' compostos (Supino Reto, Agachamento Livre, Levantamento Terra, Barra Fixa, Remada Curvada, Desenvolvimento Militar) + 1-2 isoladores básicos por treino (Rosca Direta, Tríceps Pulley, Elevação Lateral, Cadeira Extensora, Mesa Flexora, Panturrilha em Pé). Use 3-4 séries de 8-12 reps.",
      maintain: "manutenção — exercícios clássicos full-body 3-4x por semana (Agachamento, Supino, Remada, Desenvolvimento, Prancha, Caminhada/Bike). Volume moderado, foco em consistência.",
      improve_health: "saúde geral — movimentos funcionais simples e conhecidos (Agachamento, Flexão de Braço, Prancha, Caminhada, Remada, Elevação Pélvica, Alongamento). Sem exercícios avançados.",
    };

    const activityAdjust: Record<string, string> = {
      sedentary: "intensidade leve, exercícios mais simples",
      light: "intensidade moderada, exercícios básicos",
      moderate: "boa mistura de intensidade",
      active: "volume mais alto",
      very_active: "alto volume e intensidade",
    };

    const goalPt: Record<string, string> = {
      lose_weight: "perder peso",
      gain_muscle: "ganhar massa muscular",
      maintain: "manter forma física",
      improve_health: "melhorar saúde",
    };

    const systemPrompt = `Você é um personal trainer brasileiro de elite. Crie um plano de treino de 7 dias usando APENAS exercícios famosos, clássicos e simples — os mesmos que qualquer academia ensina no primeiro dia.

REGRA DE OURO — só use exercícios desta lista (ou variações diretas):
PEITO: Supino Reto, Supino Inclinado, Supino Declinado, Crucifixo, Flexão de Braço, Crossover.
COSTAS: Barra Fixa, Puxada Frontal (Pulley), Remada Curvada, Remada Baixa, Remada Unilateral com Halter, Levantamento Terra.
PERNAS: Agachamento Livre, Leg Press, Cadeira Extensora, Mesa Flexora, Stiff, Avanço (Afundo), Panturrilha em Pé, Panturrilha Sentado, Elevação Pélvica (Hip Thrust).
OMBROS: Desenvolvimento Militar, Desenvolvimento com Halter, Elevação Lateral, Elevação Frontal, Crucifixo Inverso.
BRAÇOS: Rosca Direta, Rosca Alternada, Rosca Martelo, Tríceps Pulley, Tríceps Testa, Tríceps Francês, Mergulho no Banco.
CORE: Prancha, Abdominal Reto, Abdominal Bicicleta, Elevação de Pernas, Prancha Lateral, Mountain Climber.
CARDIO/HIIT: Corrida, Caminhada, Bike Ergométrica, Polichinelos, Burpees, Pular Corda, Mountain Climber.

PROIBIDO: nomes técnicos pouco conhecidos, exercícios de CrossFit avançado (Snatch, Clean, Muscle-Up, Pistol Squat), variações exóticas (Zercher, Jefferson, Anderson), nomes em inglês quando houver equivalente em português.

Configurações deste usuário:
- Objetivo: ${goalPt[goal] || goal} — ${goalDescriptions[goal] || goalDescriptions.maintain}
- Nível de atividade: ${activity} — ${activityAdjust[activity] || activityAdjust.moderate}

DIAS DE TREINO ESCOLHIDOS PELO USUÁRIO: ${selectedDays.join(", ")}
DIAS DE DESCANSO OBRIGATÓRIOS: ${restDays.length > 0 ? restDays.join(", ") : "nenhum"}

REGRAS CRÍTICAS DE DIAS:
- Inclua TODOS os 7 dias da semana no array (Segunda a Domingo, em ordem).
- Para cada dia em DIAS DE DESCANSO OBRIGATÓRIOS, use focus = "Descanso" e exercises = [].
- Para cada dia em DIAS DE TREINO ESCOLHIDOS, monte um treino apropriado (4-6 exercícios).
- Distribua os grupos musculares de forma inteligente entre os dias escolhidos (ex: 3 dias = full-body; 4 dias = upper/lower; 5+ dias = split por grupo).

Outras regras:
- Cada exercício: nome em português, 3-4 séries, 8-15 reps (ou segundos para isométricos/cardio), grupo muscular, dificuldade.
- Grupos musculares válidos: Peito, Costas, Ombros, Bíceps, Tríceps, Pernas, Glúteos, Core, Corpo Inteiro, Cardio.
- Dificuldade: Iniciante, Intermediário, Avançado (priorize Iniciante/Intermediário, exceto se atividade = very_active).
- Sem repetir o mesmo exercício no mesmo dia.
- Use a ferramenta fornecida para retornar o plano estruturado.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere meu plano de treino personalizado de 7 dias. Tudo em português brasileiro." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_workout_plan",
              description: "Return a structured 7-day workout plan",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string", enum: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] },
                        focus: { type: "string", description: "Ex: Superior, Inferior, Descanso, HIIT, Corpo Inteiro — em português" },
                        exercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", description: "Nome do exercício em português" },
                              sets: { type: "number" },
                              reps: { type: "number", description: "Repetições ou segundos para exercícios cronometrados" },
                              muscle_group: { type: "string", description: "Grupo muscular em português" },
                              difficulty: { type: "string", enum: ["Iniciante", "Intermediário", "Avançado"] },
                            },
                            required: ["name", "sets", "reps", "muscle_group", "difficulty"],
                          },
                        },
                      },
                      required: ["day", "focus", "exercises"],
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_workout_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to generate workout plan" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No workout plan returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = JSON.parse(toolCall.function.arguments);

    // Enforce rest days server-side: any day not in selectedDays becomes "Descanso"
    if (Array.isArray(plan?.days)) {
      plan.days = plan.days.map((d: { day: string; focus: string; exercises: unknown[] }) => {
        if (!selectedDays.includes(d.day)) {
          return { day: d.day, focus: "Descanso", exercises: [] };
        }
        return d;
      });
      // Ensure all 7 days are present in correct order
      const byDay = new Map(plan.days.map((d: { day: string }) => [d.day, d]));
      plan.days = ALL_DAYS.map((name) =>
        byDay.get(name) ?? { day: name, focus: selectedDays.includes(name) ? "Treino" : "Descanso", exercises: [] }
      );
    }

    // Calculate Monday using local-style date math (matches frontend)
    const now = new Date();
    const dow = now.getDay(); // 0=Sun
    const mondayDate = new Date(now);
    mondayDate.setDate(now.getDate() - ((dow + 6) % 7));
    const weekStart = `${mondayDate.getFullYear()}-${String(mondayDate.getMonth() + 1).padStart(2, "0")}-${String(mondayDate.getDate()).padStart(2, "0")}`;

    // Use service role for mutations to bypass RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("workout_plans").delete().eq("user_id", userId).eq("week_start", weekStart);
    await adminClient.from("workout_plans").insert({
      user_id: userId,
      week_start: weekStart,
      plan_data: plan,
    });

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-workout-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
