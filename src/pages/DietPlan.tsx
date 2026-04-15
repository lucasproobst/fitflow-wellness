import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Shuffle, Heart, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const shortDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const mealTypes = ["breakfast", "lunch", "dinner", "snack", "preworkout"] as const;
const mealTypeLabels: Record<string, string> = {
  breakfast: "CAFÉ DA MANHÃ",
  lunch: "ALMOÇO",
  dinner: "JANTAR",
  snack: "LANCHE",
  preworkout: "PRÉ-TREINO",
};

const mealAccentColors: Record<string, string> = {
  breakfast: "#f59e0b",
  lunch: "#22c55e",
  dinner: "#8b5cf6",
  snack: "#ec4899",
  preworkout: "#3b82f6",
};

const filters = ["TODOS", "VEGETARIANO", "LOW-CARB", "ALTA PROTEÍNA"];

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
  const [activeFilter, setActiveFilter] = useState("TODOS");
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
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

  const dayTotals = useMemo(() => {
    if (!currentDay?.meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return Object.values(currentDay.meals).reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [currentDay]);

  const toggleFavorite = (key: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const macroTotal = dayTotals.protein + dayTotals.carbs + dayTotals.fat;
  const proteinPct = macroTotal > 0 ? (dayTotals.protein / macroTotal) * 100 : 33;
  const carbsPct = macroTotal > 0 ? (dayTotals.carbs / macroTotal) * 100 : 33;
  const fatPct = macroTotal > 0 ? (dayTotals.fat / macroTotal) * 100 : 34;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto pb-36 lg:pb-28">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Plano Alimentar</h1>
          <p className="text-sm text-foreground/40 mt-0.5">Seu plano semanal personalizado</p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-[#22c55e]/20"
        >
          <RefreshCw size={14} className={generate.isPending ? "animate-spin" : ""} />
          {generate.isPending ? "Gerando..." : planData ? "Regenerar" : "Gerar Plano"}
        </button>
      </div>

      {/* Daily calories + macro bar */}
      {currentDay && (
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="text-3xl font-extrabold text-[#facc15] tabular-nums">
              {dayTotals.calories.toLocaleString("pt-BR")}
            </span>
            <span className="text-sm font-medium text-foreground/30">kcal hoje</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-white/5 flex">
            <div className="h-full bg-[#3b82f6] transition-all duration-500" style={{ width: `${proteinPct}%` }} />
            <div className="h-full bg-[#f97316] transition-all duration-500" style={{ width: `${carbsPct}%` }} />
            <div className="h-full bg-[#facc15] transition-all duration-500" style={{ width: `${fatPct}%` }} />
          </div>
          <div className="flex gap-4 mt-1.5">
            <span className="text-[10px] font-medium text-[#3b82f6]">P {dayTotals.protein}g</span>
            <span className="text-[10px] font-medium text-[#f97316]">C {dayTotals.carbs}g</span>
            <span className="text-[10px] font-medium text-[#facc15]">G {dayTotals.fat}g</span>
          </div>
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
        {shortDays.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDay(i)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              selectedDay === i
                ? "bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/25"
                : "border border-white/10 text-foreground/40 hover:border-white/20 hover:text-foreground/60"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
              activeFilter === f
                ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                : "border border-white/8 text-foreground/30 hover:border-white/15 hover:text-foreground/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {(isLoading || generate.isPending) && !planData && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl bg-[#1a1d27] border border-white/[0.06] p-5 space-y-3">
              <div className="h-3 w-20 bg-white/5 rounded-full animate-pulse" />
              <div className="h-5 w-52 bg-white/5 rounded-full animate-pulse" />
              <div className="h-3 w-72 bg-white/5 rounded-full animate-pulse" />
              <div className="flex gap-3">
                <div className="h-6 w-14 bg-white/5 rounded-full animate-pulse" />
                <div className="h-6 w-14 bg-white/5 rounded-full animate-pulse" />
                <div className="h-6 w-14 bg-white/5 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !generate.isPending && !planData && (
        <div className="rounded-2xl bg-[#1a1d27] border border-white/[0.06] py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={28} className="text-[#22c55e]" />
          </div>
          <p className="text-foreground/30 text-sm mb-5">Nenhum plano alimentar ainda</p>
          <button
            onClick={() => generate.mutate()}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white text-sm font-bold active:scale-95 transition-all shadow-lg shadow-[#22c55e]/20"
          >
            Gerar Seu Plano
          </button>
        </div>
      )}

      {/* Meal cards */}
      {currentDay && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-3"
          >
            {mealTypes.map((type, index) => {
              const meal = currentDay.meals?.[type];
              if (!meal) return null;
              const isSwapping = swappingMeal === `${dayNames[selectedDay]}-${type}`;
              const accent = mealAccentColors[type] || "#22c55e";
              const favKey = `${selectedDay}-${type}`;
              const isFav = favorites.has(favKey);

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
                  className={`group relative rounded-2xl bg-[#1a1d27]/80 backdrop-blur-sm border border-white/[0.06] overflow-hidden hover:-translate-y-0.5 hover:border-white/[0.1] transition-all duration-300 ${
                    isSwapping ? "opacity-50" : ""
                  }`}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                    style={{ backgroundColor: accent }}
                  />

                  <div className="p-5 pl-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Meal type label */}
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.15em]"
                          style={{ color: accent }}
                        >
                          {mealTypeLabels[type] || type.toUpperCase()}
                        </span>

                        {/* Meal name */}
                        <p className="text-[15px] font-bold text-foreground mt-1.5 leading-snug">
                          {meal.name}
                        </p>

                        {/* Description */}
                        <p className="text-xs text-foreground/35 mt-1 leading-relaxed line-clamp-2">
                          {meal.description}
                        </p>

                        {/* Macro badges */}
                        <div className="flex gap-2 mt-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] text-[10px] font-bold">
                            P {meal.protein}g
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f97316]/10 text-[#f97316] text-[10px] font-bold">
                            C {meal.carbs}g
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#facc15]/10 text-[#facc15] text-[10px] font-bold">
                            G {meal.fat}g
                          </span>
                        </div>
                      </div>

                      {/* Calories + actions */}
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className="text-xl font-extrabold text-[#facc15] tabular-nums">
                          {meal.calories}
                        </span>
                        <span className="text-[10px] font-medium text-foreground/25 -mt-2">kcal</span>

                        <div className="flex items-center gap-2 mt-auto">
                          <button
                            onClick={() => toggleFavorite(favKey)}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 active:scale-90 transition-all"
                          >
                            <Heart
                              size={14}
                              className={isFav ? "text-rose-400 fill-rose-400" : "text-foreground/20"}
                            />
                          </button>
                          <button
                            onClick={() => swapMeal.mutate({ day: dayNames[selectedDay], mealType: type })}
                            disabled={isSwapping || swapMeal.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-[10px] uppercase tracking-wider font-bold text-foreground/40 hover:bg-white/5 hover:text-foreground/60 active:scale-95 transition-all disabled:opacity-40"
                          >
                            <Shuffle size={10} className={isSwapping ? "animate-spin" : ""} />
                            TROCAR
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Bottom summary bar */}
      {currentDay && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-[#0f1117]/95 backdrop-blur-xl border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span className="text-xs font-bold text-foreground/60">P {dayTotals.protein}g</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#f97316]" />
                <span className="text-xs font-bold text-foreground/60">C {dayTotals.carbs}g</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#facc15]" />
                <span className="text-xs font-bold text-foreground/60">G {dayTotals.fat}g</span>
              </div>
              <span className="text-xs font-extrabold text-[#facc15] ml-1">{dayTotals.calories.toLocaleString("pt-BR")} kcal</span>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#22c55e] text-white text-xs font-bold active:scale-95 transition-all shadow-lg shadow-[#22c55e]/20">
              Ver receitas
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
