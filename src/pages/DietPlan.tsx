import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Shuffle, Heart, ChevronRight, X, Clock, ChefHat, Lightbulb } from "lucide-react";
import { RecipeShareCard } from "@/components/RecipeShareCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const shortDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const mealTypes = ["breakfast", "lunch", "snack", "dinner", "preworkout"] as const;
const mealTypeLabels: Record<string, string> = {
  breakfast: "CAFÉ DA MANHÃ",
  lunch: "ALMOÇO",
  dinner: "JANTAR",
  snack: "LANCHE",
  preworkout: "PRÉ-TREINO",
};

const filters = ["TODOS", "VEGETARIANO", "LOW-CARB", "ALTA PROTEÍNA"];

interface Meal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients?: string[];
}

interface Recipe {
  meal_name: string;
  meal_type: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  tips: string;
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

function parseIngredients(meal: Meal): string[] {
  if (meal.ingredients && meal.ingredients.length > 0) return meal.ingredients;
  if (meal.description) {
    return meal.description
      .split(/[,;•\-\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  return [];
}

export default function DietPlan() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeFilter, setActiveFilter] = useState("TODOS");
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const recipesCache = useRef<Record<number, Recipe[]>>({});
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: planRow, isLoading } = useQuery({
    queryKey: ["meal-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekStart = getWeekStart();
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id, plan_data")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const planData = planRow ? (planRow.plan_data as unknown as MealPlanData) : null;
  const mealPlanId = planRow?.id;

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as MealPlanData;
    },
    onSuccess: async () => {
      recipesCache.current = {};
      // Clear DB recipe cache for old plan
      if (user && mealPlanId) {
        await supabase.from("recipe_cache").delete().eq("meal_plan_id", mealPlanId);
      }
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

  // Load favorites from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from("meal_favorites")
      .select("meal_key")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          setFavorites(new Set(data.map((f: any) => f.meal_key)));
        }
        setFavoritesLoaded(true);
      });
  }, [user]);

  const toggleFavorite = useCallback(async (key: string) => {
    if (!user) return;
    const isFav = favorites.has(key);
    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(key);
      else next.add(key);
      return next;
    });

    if (isFav) {
      await supabase
        .from("meal_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("meal_key", key);
    } else {
      await supabase
        .from("meal_favorites")
        .insert({ user_id: user.id, meal_key: key });
    }
  }, [user, favorites]);

  const handleViewRecipes = async () => {
    if (!currentDay?.meals || !user || !mealPlanId) return;

    // Check in-memory cache first
    const memCached = recipesCache.current[selectedDay];
    if (memCached && memCached.length > 0) {
      setRecipes(memCached);
      setExpandedRecipe(0);
      setRecipesOpen(true);
      return;
    }

    // Check DB cache
    const { data: dbCached } = await supabase
      .from("recipe_cache")
      .select("recipes")
      .eq("meal_plan_id", mealPlanId)
      .eq("day_index", selectedDay)
      .maybeSingle();

    if (dbCached?.recipes && (dbCached.recipes as any[]).length > 0) {
      const cached = dbCached.recipes as unknown as Recipe[];
      recipesCache.current[selectedDay] = cached;
      setRecipes(cached);
      setExpandedRecipe(0);
      setRecipesOpen(true);
      return;
    }

    // Generate new recipes
    setRecipesOpen(true);
    setLoadingRecipes(true);
    setRecipes([]);
    setExpandedRecipe(null);

    const mealsPayload = Object.entries(currentDay.meals).map(([type, meal]) => ({
      type: mealTypeLabels[type] || type,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    }));

    try {
      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: { meals: mealsPayload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data.recipes || [];
      recipesCache.current[selectedDay] = result;
      setRecipes(result);
      setExpandedRecipe(0);

      // Save to DB cache
      await supabase.from("recipe_cache").upsert({
        user_id: user.id,
        meal_plan_id: mealPlanId,
        day_index: selectedDay,
        recipes: result as any,
      }, { onConflict: "meal_plan_id,day_index" });
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar receitas");
      setRecipesOpen(false);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const macroTotal = dayTotals.protein + dayTotals.carbs + dayTotals.fat;
  const proteinPct = macroTotal > 0 ? (dayTotals.protein / macroTotal) * 100 : 33;
  const carbsPct = macroTotal > 0 ? (dayTotals.carbs / macroTotal) * 100 : 33;
  const fatPct = macroTotal > 0 ? (dayTotals.fat / macroTotal) * 100 : 34;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto pb-36 lg:pb-28">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">Plano Alimentar</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Seu plano semanal personalizado</p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#22c55e] text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={generate.isPending ? "animate-spin" : ""} />
          {generate.isPending ? "Gerando..." : planData ? "Regenerar" : "Gerar Plano"}
        </button>
      </div>

      {/* Daily calories + macro bar */}
      {currentDay && (
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-white tabular-nums">
              {dayTotals.calories.toLocaleString("pt-BR")}
            </span>
            <span className="text-sm font-medium text-[#6b7280]">kcal hoje</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06] flex">
            <div className="h-full bg-white/60 transition-all duration-500" style={{ width: `${proteinPct}%` }} />
            <div className="h-full bg-white/30 transition-all duration-500" style={{ width: `${carbsPct}%` }} />
            <div className="h-full bg-white/15 transition-all duration-500" style={{ width: `${fatPct}%` }} />
          </div>
          <div className="flex gap-5 mt-2">
            <span className="text-[11px] font-medium text-[#6b7280]">P {dayTotals.protein}g</span>
            <span className="text-[11px] font-medium text-[#6b7280]">C {dayTotals.carbs}g</span>
            <span className="text-[11px] font-medium text-[#6b7280]">G {dayTotals.fat}g</span>
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
                ? "bg-[#22c55e] text-white"
                : "border border-white/[0.08] text-[#6b7280] hover:border-white/[0.15] hover:text-white/60"
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
                ? "bg-white/[0.08] text-white border border-white/[0.12]"
                : "border border-white/[0.06] text-[#6b7280]/60 hover:text-[#6b7280]"
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
            <div key={i} className="rounded-2xl bg-[#16181f] border border-white/[0.04] p-5 space-y-3">
              <div className="h-3 w-20 bg-white/[0.04] rounded-full animate-pulse" />
              <div className="h-5 w-52 bg-white/[0.04] rounded-full animate-pulse" />
              <div className="h-3 w-36 bg-white/[0.04] rounded-full animate-pulse" />
              <div className="h-3 w-28 bg-white/[0.04] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !generate.isPending && !planData && (
        <div className="rounded-2xl bg-[#16181f] border border-white/[0.04] py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={24} className="text-[#6b7280]" />
          </div>
          <p className="text-[#6b7280] text-sm mb-5">Nenhum plano alimentar ainda</p>
          <button
            onClick={() => generate.mutate()}
            className="px-8 py-3 rounded-xl bg-[#22c55e] text-white text-sm font-bold active:scale-95 transition-all"
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-3"
          >
            {mealTypes.map((type, index) => {
              const meal = currentDay.meals?.[type];
              if (!meal) return null;
              const isSwapping = swappingMeal === `${dayNames[selectedDay]}-${type}`;
              const favKey = `${selectedDay}-${type}`;
              const isFav = favorites.has(favKey);
              const ingredients = parseIngredients(meal);

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
                  className={`group rounded-2xl bg-[#16181f] border border-white/[0.04] overflow-hidden hover:-translate-y-px hover:border-white/[0.08] transition-all duration-300 ${
                    isSwapping ? "opacity-40" : ""
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280]">
                          {mealTypeLabels[type] || type.toUpperCase()}
                        </span>
                        <p className="text-[15px] font-bold text-white mt-1.5 leading-snug">
                          {meal.name}
                        </p>
                        {ingredients.length > 0 && (
                          <ul className="mt-2.5 space-y-1">
                            {ingredients.map((ing, i) => (
                              <li key={i} className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                                <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                {ing}
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Macro bars */}
                        <div className="mt-3 space-y-1.5">
                          {[
                            { label: "Proteína", value: meal.protein, max: 80, color: "bg-white/70" },
                            { label: "Carboidrato", value: meal.carbs, max: 120, color: "bg-white/40" },
                            { label: "Gordura", value: meal.fat, max: 60, color: "bg-white/20" },
                          ].map(m => (
                            <div key={m.label} className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-[#6b7280] w-[70px] shrink-0">{m.label}</span>
                              <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                <div className={`h-full rounded-full ${m.color} transition-all duration-500`} style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-white/60 tabular-nums w-8 text-right">{m.value}g</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-white tabular-nums">
                            {meal.calories}
                          </span>
                          <p className="text-[10px] font-medium text-[#6b7280] -mt-0.5">kcal</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-auto pt-2">
                          <button
                            onClick={() => toggleFavorite(favKey)}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.04] active:scale-90 transition-all"
                          >
                            <Heart
                              size={14}
                              className={isFav ? "text-white fill-white" : "text-white/20"}
                            />
                          </button>
                          <button
                            onClick={() => swapMeal.mutate({ day: dayNames[selectedDay], mealType: type })}
                            disabled={isSwapping || swapMeal.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] text-[10px] uppercase tracking-wider font-bold text-[#6b7280] hover:bg-white/[0.04] hover:text-white/60 active:scale-95 transition-all disabled:opacity-30"
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
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-[#0f1117]/95 backdrop-blur-xl border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <span className="text-xs font-semibold text-[#6b7280]">P {dayTotals.protein}g</span>
              <span className="text-xs font-semibold text-[#6b7280]">C {dayTotals.carbs}g</span>
              <span className="text-xs font-semibold text-[#6b7280]">G {dayTotals.fat}g</span>
              <span className="text-xs font-extrabold text-white ml-1">{dayTotals.calories.toLocaleString("pt-BR")} kcal</span>
            </div>
            <button
              onClick={handleViewRecipes}
              disabled={loadingRecipes}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#22c55e] text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-60"
            >
              {loadingRecipes ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  Ver receitas
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Recipes Sheet */}
      <Sheet open={recipesOpen} onOpenChange={setRecipesOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-3xl bg-[#0f1117] border-t border-white/[0.06] p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/[0.04]">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-bold text-white">Receitas do Dia</SheetTitle>
                <p className="text-xs text-[#6b7280] mt-0.5">{shortDays[selectedDay]} — {recipes.length} receitas</p>
              </div>
              <button
                onClick={() => setRecipesOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
              >
                <X size={14} className="text-[#6b7280]" />
              </button>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(85vh-80px)]">
            <div className="p-5 space-y-4">
              {loadingRecipes && (
                <div className="py-16 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
                  <p className="text-sm text-[#6b7280]">Gerando receitas detalhadas...</p>
                </div>
              )}

              {!loadingRecipes && recipes.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-sm text-[#6b7280]">Nenhuma receita disponível</p>
                </div>
              )}

              {recipes.map((recipe, i) => {
                const isExpanded = expandedRecipe === i;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl bg-[#16181f] border border-white/[0.04] overflow-hidden"
                  >
                    {/* Recipe header — always visible */}
                    <button
                      onClick={() => setExpandedRecipe(isExpanded ? null : i)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280]">
                          {recipe.meal_type}
                        </span>
                        <p className="text-sm font-bold text-white mt-0.5 truncate">{recipe.meal_name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-[#6b7280]">
                            <Clock size={10} />
                            {recipe.prep_time + recipe.cook_time} min
                          </span>
                          <span className="text-[10px] text-[#6b7280]">
                            {recipe.ingredients.length} ingredientes
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div onClick={(e) => e.stopPropagation()}>
                          <RecipeShareCard recipe={recipe} />
                        </div>
                        <ChevronRight
                          size={16}
                          className={`text-[#6b7280] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Recipe details — expanded */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-5 space-y-5 border-t border-white/[0.04] pt-4">
                            {/* Time badges */}
                            <div className="flex gap-3">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04]">
                                <Clock size={12} className="text-[#6b7280]" />
                                <span className="text-[11px] font-medium text-white/70">Preparo: {recipe.prep_time} min</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04]">
                                <ChefHat size={12} className="text-[#6b7280]" />
                                <span className="text-[11px] font-medium text-white/70">Cozimento: {recipe.cook_time} min</span>
                              </div>
                            </div>

                            {/* Ingredients */}
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280] mb-2.5">
                                Ingredientes
                              </h4>
                              <ul className="space-y-1.5">
                                {recipe.ingredients.map((ing, j) => (
                                  <li key={j} className="flex items-start gap-2 text-[12px] text-white/70">
                                    <span className="w-1 h-1 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                                    {ing}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Instructions */}
                            <div>
                              <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280] mb-2.5">
                                Modo de preparo
                              </h4>
                              <ol className="space-y-3">
                                {recipe.instructions.map((step, j) => (
                                  <li key={j} className="flex gap-3 text-[12px]">
                                    <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/40 shrink-0 mt-0.5">
                                      {j + 1}
                                    </span>
                                    <span className="text-white/70 leading-relaxed">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Tip */}
                            {recipe.tips && (
                              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#22c55e]/[0.06] border border-[#22c55e]/10">
                                <Lightbulb size={14} className="text-[#22c55e] shrink-0 mt-0.5" />
                                <p className="text-[11px] text-white/60 leading-relaxed">{recipe.tips}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
