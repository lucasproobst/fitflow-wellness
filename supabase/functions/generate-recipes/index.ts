import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const body = await req.json();
    const meals = body?.meals;

    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return new Response(JSON.stringify({ error: "No meals provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mealList = meals.map((m: any, i: number) =>
      `${i + 1}. ${m.type}: ${m.name} (${m.calories} kcal, P:${m.protein}g C:${m.carbs}g G:${m.fat}g)`
    ).join("\n");

    const systemPrompt = `You are a professional Brazilian chef and nutritionist. Generate detailed recipes in Portuguese (Brazil) for each meal provided. Each recipe must include:
- ingredients: array of strings with quantities (e.g., "200g de peito de frango")
- instructions: array of step-by-step strings
- prep_time: preparation time in minutes (number)
- cook_time: cooking time in minutes (number)
- tips: one practical tip string

Keep recipes practical, using common Brazilian ingredients. Use the provided tool to return all recipes.`;

    const recipeSchema = {
      type: "object",
      properties: {
        meal_name: { type: "string" },
        meal_type: { type: "string" },
        ingredients: { type: "array", items: { type: "string" } },
        instructions: { type: "array", items: { type: "string" } },
        prep_time: { type: "number" },
        cook_time: { type: "number" },
        tips: { type: "string" },
      },
      required: ["meal_name", "meal_type", "ingredients", "instructions", "prep_time", "cook_time", "tips"],
    };

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
          { role: "user", content: `Generate detailed recipes for these meals:\n${mealList}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_recipes",
            description: "Return detailed recipes for all meals",
            parameters: {
              type: "object",
              properties: {
                recipes: { type: "array", items: recipeSchema },
              },
              required: ["recipes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_recipes" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to generate recipes" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No recipes returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recipes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
