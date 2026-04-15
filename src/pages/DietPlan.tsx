import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { RefreshCw, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const shortDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
const mealTypeLabels: Record<string, string> = { breakfast: "CAFÉ DA MANHÃ", lunch: "ALMOÇO", dinner: "JANTAR", snack: "LANCHE" };
const filters = ["Todos", "Vegetariano", "Low-carb", "Alta proteína"];

interface Meal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayPlan {
  day: string;
  meals: Record<string, Meal>;
}

interface MealPlanData {
  days: DayPlan[];
}

function getWeekStart() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().split("T")[0];
}

export default function DietPlan() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: planData, isLoading } = useQuery({
    queryKey: ["meal-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekStart = getWeekStart();
      const { data, error } = await supabase
        .from("meal_plans")
        .select("plan_data")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data?.plan_data as unknown) as MealPlanData | null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as MealPlanData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plan"] });
      toast.success("Plano alimentar gerado!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao gerar plano");
    },
  });

  const swapMeal = useMutation({
    mutationFn: async ({ day, mealType }: { day: string; mealType: string }) => {
      setSwappingMeal(`${day}-${mealType}`);
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: { swapDay: day, swapMealType: mealType, existingPlan: planData },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as MealPlanData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plan"] });
      toast.success("Refeição trocada!");
      setSwappingMeal(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao trocar refeição");
      setSwappingMeal(null);
    },
  });

  const currentDay = planData?.days?.[selectedDay];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Plano Alimentar</h1>
          <p className="text-sm text-foreground/50">Seu plano semanal personalizado</p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-fitflow-primary text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={generate.isPending ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{generate.isPending ? "Gerando..." : planData ? "Regenerar" : "Gerar Plano"}</span>
          <span className="sm:hidden">{generate.isPending ? "..." : planData ? "Novo" : "Gerar"}</span>
        </button>
      </div>

      {/* Seletor de dia */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
        {shortDays.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDay(i)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              selectedDay === i
                ? "bg-fitflow-primary text-white"
                : "border border-white/10 text-foreground/50 hover:bg-white/5"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all active:scale-95 ${
              activeFilter === f
                ? "bg-fitflow-accent/20 text-fitflow-accent"
                : "border border-white/10 text-foreground/40 hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Carregando */}
      {(isLoading || generate.isPending) && !planData && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-64 bg-white/5 rounded animate-pulse" />
              <div className="flex gap-4">
                <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && !generate.isPending && !planData && (
        <GlassCard className="py-12 text-center">
          <p className="text-foreground/40 text-sm mb-4">Nenhum plano alimentar ainda</p>
          <button
            onClick={() => generate.mutate()}
            className="px-6 py-3 rounded-xl bg-fitflow-primary text-white text-sm font-semibold active:scale-95 transition-all"
          >
            Gerar Seu Plano
          </button>
        </GlassCard>
      )}

      {/* Refeições */}
      {currentDay && (
        <div className="space-y-3">
          {mealTypes.map(type => {
            const meal = currentDay.meals?.[type];
            if (!meal) return null;
            const isSwapping = swappingMeal === `${dayNames[selectedDay]}-${type}`;
            return (
              <GlassCard key={type} className={isSwapping ? "opacity-60" : ""}>
                <div className="flex items-center justify-between mb-2">
                  <span className="label-style text-[10px]">{mealTypeLabels[type] || type.toUpperCase()}</span>
                  <span className="text-sm font-semibold text-fitflow-accent">{meal.calories} cal</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">{meal.name}</p>
                <p className="text-xs text-foreground/50 mb-3">{meal.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-3 sm:gap-4 shrink-0">
                    {[
                      { l: "P", v: meal.protein },
                      { l: "C", v: meal.carbs },
                      { l: "G", v: meal.fat },
                    ].map(m => (
                      <div key={m.l} className="text-center">
                        <span className="text-[10px] text-foreground/30 uppercase">{m.l}</span>
                        <p className="text-xs font-semibold text-foreground">{m.v}g</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => swapMeal.mutate({ day: dayNames[selectedDay], mealType: type })}
                    disabled={isSwapping || swapMeal.isPending}
                    className="flex items-center gap-1 px-3 py-1 rounded-full border border-white/10 text-[10px] uppercase tracking-wider font-medium text-foreground/50 hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Shuffle size={10} className={isSwapping ? "animate-spin" : ""} />
                    {isSwapping ? "Trocando..." : "Trocar"}
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
