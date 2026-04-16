import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const goal = profile.goal || "maintain";
    const activity = profile.activity_level || "moderate";

    const goalDescriptions: Record<string, string> = {
      lose_weight: "perda de gordura com séries mais altas, circuitos HIIT e recuperação ativa",
      gain_muscle: "hipertrofia com sobrecarga progressiva, exercícios compostos, 3-4 séries de 8-12 repetições",
      maintain: "manutenção equilibrada com volume moderado",
      improve_health: "saúde geral com mistura de força, cardio e flexibilidade",
    };

    const activityAdjust: Record<string, string> = {
      sedentary: "3 dias de treino, intensidade menor, mais dias de descanso",
      light: "4 dias de treino, intensidade moderada",
      moderate: "5 dias de treino, boa mistura de intensidade",
      active: "5-6 dias de treino, volume mais alto",
      very_active: "6 dias de treino, alto volume e intensidade",
    };

    const goalPt: Record<string, string> = {
      lose_weight: "perder peso",
      gain_muscle: "ganhar massa muscular",
      maintain: "manter forma física",
      improve_health: "melhorar saúde",
    };

    const systemPrompt = `Você é um personal trainer de elite brasileiro. Crie um plano de treino completo de 7 dias.
TUDO deve estar em português brasileiro — nomes dos exercícios, foco do dia, grupos musculares, nível de dificuldade.
Regras:
- Objetivo: ${goalPt[goal] || goal} — ${goalDescriptions[goal] || goalDescriptions.maintain}
- Nível de atividade: ${activity} — ${activityAdjust[activity] || activityAdjust.moderate}
- Inclua dias de descanso apropriados para o nível de atividade
- Cada exercício precisa de: nome (em português), séries, repetições (ou segundos para exercícios cronometrados), grupo muscular alvo, nível de dificuldade
- Grupos musculares em português: Peito, Costas, Ombros, Bíceps, Tríceps, Pernas, Glúteos, Core, Corpo Inteiro, Cardio
- Dificuldade em português: Iniciante, Intermediário, Avançado
- Dias de descanso devem ter "Descanso" ou "Recuperação Ativa" como foco
- Use nomes de exercícios em português (ex: Supino Reto, Agachamento, Remada Curvada, Desenvolvimento, Rosca Direta, etc.)
- Use a ferramenta fornecida para retornar o plano estruturado`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
