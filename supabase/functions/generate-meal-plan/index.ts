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

    // Auth check
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

    // Get user profile
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

    const restrictions = (profile.food_restrictions as string[]) || [];
    const goal = profile.goal || "maintain";
    const activityLevel = profile.activity_level || "moderate";
    const weight = profile.weight_kg || 70;
    const targetWeight = profile.target_weight_kg || weight;

    let calorieTarget = 2000;
    if (goal === "lose_weight") calorieTarget = 1600;
    else if (goal === "gain_muscle") calorieTarget = 2600;

    // Check for swap mode
    let body: any = {};
    try { body = await req.json(); } catch { /* no body = full generation */ }
    const swapDay: string | undefined = body?.swapDay;
    const swapMealType: string | undefined = body?.swapMealType;
    const existingPlan: any = body?.existingPlan;

    const mealSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
      required: ["name", "description", "calories", "protein", "carbs", "fat"],
    };

    if (swapDay && swapMealType && existingPlan) {
      // --- Swap single meal ---
      const currentMeal = existingPlan.days?.find((d: any) => d.day === swapDay)?.meals?.[swapMealType];
      const swapPrompt = `You are a certified nutritionist. Replace ONLY the ${swapMealType} meal for ${swapDay}.
All meal names and descriptions MUST be in Brazilian Portuguese.
Rules:
- Target ~${calorieTarget / 4} calories for this meal
- Goal: ${goal.replace("_", " ")}
- NEVER include these foods: ${restrictions.length > 0 ? restrictions.join(", ") : "none"}
- Must be DIFFERENT from: "${currentMeal?.name || "unknown"}"
- Realistic macros
- Use the provided tool to return the single replacement meal`;

      const swapResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: swapPrompt },
            { role: "user", content: `Generate a replacement ${swapMealType} meal for ${swapDay}.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_single_meal",
              description: "Return a single replacement meal",
              parameters: {
                type: "object",
                properties: { meal: mealSchema },
                required: ["meal"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_single_meal" } },
        }),
      });

      if (!swapResp.ok) {
        const text = await swapResp.text();
        console.error("Swap AI error:", swapResp.status, text);
        return new Response(JSON.stringify({ error: "Failed to swap meal" }), {
          status: swapResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const swapData = await swapResp.json();
      const swapTool = swapData.choices?.[0]?.message?.tool_calls?.[0];
      if (!swapTool) {
        return new Response(JSON.stringify({ error: "No replacement meal returned" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newMeal = JSON.parse(swapTool.function.arguments).meal;

      // Patch existing plan
      const updatedPlan = { ...existingPlan };
      updatedPlan.days = updatedPlan.days.map((d: any) => {
        if (d.day === swapDay) {
          return { ...d, meals: { ...d.meals, [swapMealType]: newMeal } };
        }
        return d;
      });

      // Save
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
      const weekStart = monday.toISOString().split("T")[0];
      await supabase.from("meal_plans").delete().eq("user_id", userId).eq("week_start", weekStart);
      await supabase.from("meal_plans").insert({ user_id: userId, week_start: weekStart, plan_data: updatedPlan });

      return new Response(JSON.stringify(updatedPlan), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Full plan generation ---
    const systemPrompt = `You are a certified nutritionist. Create a complete 7-day meal plan.
All meal names and descriptions MUST be in Brazilian Portuguese.
Rules:
- Target ${calorieTarget} calories per day
- Goal: ${goal.replace("_", " ")}
- Activity level: ${activityLevel.replace("_", " ")}
- Current weight: ${weight}kg, target: ${targetWeight}kg
- NEVER include these foods (restrictions): ${restrictions.length > 0 ? restrictions.join(", ") : "none"}
- Each meal must have realistic macros that add up correctly
- Provide variety across the week
- Use the provided tool to return the structured plan`;

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
          { role: "user", content: "Generate my personalized 7-day meal plan for this week." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_meal_plan",
              description: "Return a structured 7-day meal plan",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
                        meals: {
                          type: "object",
                          properties: {
                            breakfast: mealSchema,
                            lunch: mealSchema,
                            dinner: mealSchema,
                            snack: mealSchema,
                          },
                          required: ["breakfast", "lunch", "dinner", "snack"],
                        },
                      },
                      required: ["day", "meals"],
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_meal_plan" } },
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
      return new Response(JSON.stringify({ error: "Failed to generate meal plan" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No meal plan returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = JSON.parse(toolCall.function.arguments);

    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const weekStart = monday.toISOString().split("T")[0];

    await supabase.from("meal_plans").delete().eq("user_id", userId).eq("week_start", weekStart);
    await supabase.from("meal_plans").insert({ user_id: userId, week_start: weekStart, plan_data: plan });

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-meal-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
