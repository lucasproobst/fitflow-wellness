import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um nutricionista clínico especialista em análise de imagens de alimentos.

Sua tarefa: analisar a foto e calcular os valores nutricionais com a maior precisão possível, como se estivesse pesando os alimentos.

PROCESSO OBRIGATÓRIO (siga em ordem):
1. IDENTIFIQUE cada componente visível no prato separadamente (proteína, carboidrato, vegetais, molhos, gorduras visíveis, bebidas).
2. ESTIME o peso em gramas de CADA componente usando referências visuais (tamanho do prato ~26cm, talheres, mãos, copos padrão de 200ml).
3. CALCULE as macros de cada componente usando valores nutricionais padrão da TBCA / USDA por 100g e multiplique pela porção.
4. SOME os valores de todos os componentes para chegar nos totais.
5. VALIDE: calorias_totais ≈ (proteína × 4) + (carboidratos × 4) + (gordura × 9). A diferença não pode passar de 10%.

REGRAS DE PRECISÃO:
- Considere métodos de preparo visíveis (frito adiciona ~80–120 kcal de óleo por 100g, grelhado não adiciona).
- Inclua óleos, manteigas e molhos visíveis (1 colher de azeite = 9g = 80kcal).
- Para arroz/massa cozidos use ~130kcal/100g, não o valor cru.
- Carnes grelhadas magras: ~165kcal/100g (frango), ~250kcal/100g (carne vermelha).
- Se houver múltiplos itens claramente distintos, retorne a soma e liste cada item em "items".
- Se a imagem estiver embaçada ou ambígua, escolha a estimativa MAIS PROVÁVEL e baixe a confiança.

NOMES E TEXTOS: sempre em português do Brasil. Porção descrita como "X g" ou "X g (1 unidade média)".

Sempre responda chamando a função return_nutrition.`;

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
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem de alimento com máxima precisão. Identifique CADA componente, estime o peso em gramas de cada um, calcule macros por componente e some. Valide que calorias = proteína×4 + carbs×4 + gordura×9 (margem de 10%). Responda em português do Brasil chamando a função.",
              },
              { type: "image_url", image_url: { url: image_base64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_nutrition",
              description: "Retorna dados nutricionais detalhados e validados do alimento identificado",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome do prato/alimento principal em português" },
                  serving: { type: "string", description: "Tamanho total da porção em gramas, ex: '320 g'" },
                  calories: { type: "number", description: "Calorias totais (kcal), número inteiro" },
                  protein: { type: "number", description: "Proteína total em gramas, 1 casa decimal" },
                  carbs: { type: "number", description: "Carboidratos totais em gramas, 1 casa decimal" },
                  fat: { type: "number", description: "Gordura total em gramas, 1 casa decimal" },
                  items: {
                    type: "array",
                    description: "Lista detalhada de cada componente identificado no prato",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome do componente em português" },
                        grams: { type: "number", description: "Peso estimado em gramas" },
                        calories: { type: "number", description: "Calorias deste componente" },
                      },
                      required: ["name", "grams", "calories"],
                      additionalProperties: false,
                    },
                  },
                  confidence: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description: "Confiança da estimativa baseada na clareza da imagem",
                  },
                },
                required: ["name", "serving", "calories", "protein", "carbs", "fat", "items", "confidence"],
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
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione fundos nas configurações do workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Falha ao analisar a imagem" }), {
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

    // Reconcile calories vs macros (Atwater factors). If model drifted >12%, prefer the macro-derived value.
    const macroKcal = (Number(nutrition.protein) || 0) * 4
                    + (Number(nutrition.carbs) || 0) * 4
                    + (Number(nutrition.fat) || 0) * 9;
    const reportedKcal = Number(nutrition.calories) || 0;
    if (macroKcal > 0 && reportedKcal > 0) {
      const diff = Math.abs(macroKcal - reportedKcal) / reportedKcal;
      if (diff > 0.12) {
        nutrition.calories = Math.round(macroKcal);
      } else {
        nutrition.calories = Math.round(reportedKcal);
      }
    }

    // Round macros for clean display
    nutrition.protein = Math.round((Number(nutrition.protein) || 0) * 10) / 10;
    nutrition.carbs   = Math.round((Number(nutrition.carbs)   || 0) * 10) / 10;
    nutrition.fat     = Math.round((Number(nutrition.fat)     || 0) * 10) / 10;

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
