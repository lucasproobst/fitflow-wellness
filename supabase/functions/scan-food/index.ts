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

    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a nutrition analysis expert. Analyze the food in the image and return structured nutrition data. All food names and serving descriptions MUST be in Brazilian Portuguese. Always respond using the provided tool.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta imagem de alimento. Identifique o alimento, estime o tamanho da porção e forneça dados nutricionais incluindo calorias, proteína, carboidratos e gordura. Responda em português do Brasil." },
              { type: "image_url", image_url: { url: image_base64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_nutrition",
              description: "Return structured nutrition data for the identified food",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Name of the food item" },
                  serving: { type: "string", description: "Estimated serving size, e.g. '1 cup (240g)'" },
                  calories: { type: "number", description: "Total calories" },
                  protein: { type: "number", description: "Protein in grams" },
                  carbs: { type: "number", description: "Carbohydrates in grams" },
                  fat: { type: "number", description: "Fat in grams" },
                },
                required: ["name", "serving", "calories", "protein", "carbs", "fat"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_nutrition" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage credits exhausted. Please add funds in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to analyze image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No nutrition data returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nutrition = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(nutrition), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-food error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
