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
    const { data: claims, error: authError } = await supabase.auth.getUser(token);
    if (authError || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.user.id;

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
      lose_weight: "fat loss with higher rep ranges, HIIT-style circuits, and active recovery",
      gain_muscle: "hypertrophy with progressive overload, compound lifts, 3-4 sets of 8-12 reps",
      maintain: "balanced fitness maintenance with moderate volume",
      improve_health: "general health with a mix of strength, cardio, and flexibility",
    };

    const activityAdjust: Record<string, string> = {
      sedentary: "3 workout days, lower intensity, more recovery days",
      light: "4 workout days, moderate intensity",
      moderate: "5 workout days, good intensity mix",
      active: "5-6 workout days, higher volume",
      very_active: "6 workout days, high volume and intensity",
    };

    const systemPrompt = `You are an elite personal trainer. Create a complete 7-day workout plan.
All exercise names, focus areas, muscle groups, and difficulty levels MUST be in Brazilian Portuguese.
Rules:
- Goal: ${goal.replace("_", " ")} — ${goalDescriptions[goal] || goalDescriptions.maintain}
- Activity level: ${activity.replace("_", " ")} — ${activityAdjust[activity] || activityAdjust.moderate}
- Include rest days appropriate for the activity level
- Each exercise needs: name, sets, reps (or seconds for timed exercises), target muscle group, difficulty level
- Muscle groups in Portuguese: Peito, Costas, Ombros, Braços, Pernas, Core, Corpo Inteiro, Cardio
- Difficulty in Portuguese: Iniciante, Intermediário, Avançado
- Rest days should have "Descanso" or "Recuperação Ativa" as the focus
- Use the provided tool to return the structured plan`;

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
          { role: "user", content: "Generate my personalized 7-day workout plan." },
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
                        day: { type: "string", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
                        focus: { type: "string", description: "e.g. Upper Body, Legs, Rest Day, HIIT" },
                        exercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              sets: { type: "number" },
                              reps: { type: "number", description: "Reps or seconds for timed exercises" },
                              muscle_group: { type: "string" },
                              difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
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

    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const weekStart = monday.toISOString().split("T")[0];

    await supabase.from("workout_plans").delete().eq("user_id", userId).eq("week_start", weekStart);
    await supabase.from("workout_plans").insert({
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
