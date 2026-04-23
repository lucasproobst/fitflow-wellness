import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RefreshCw, Shuffle, Heart, ChevronRight, X, Clock, ChefHat, Lightbulb, ArrowLeft, ArrowUp, SlidersHorizontal, Coffee, UtensilsCrossed, Moon, Apple } from "lucide-react";
import { RecipeShareCard } from "@/components/RecipeShareCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePro } from "@/lib/use-pro";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerationProgress } from "@/components/GenerationProgress";
import { ProGenButton } from "@/components/ProGenButton";

const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const shortDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const mealTypes = ["breakfast", "lunch", "snack", "dinner", "preworkout"] as const;
const mealTypeLabels: Record<string, string> = {
  breakfast: "CAFÉ DA MANHÃ",
  lunch: "ALMOÇO",
  dinner: "JANTAR",
  snack: "LANCHE",
  preworkout: "PRÉ-TREINO",
};

const mealIcons: Record<string, any> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  snack: Apple,
  dinner: Moon,
  preworkout: Coffee,
};

const filters = ["Todos", "Vegetariano", "Low-carb", "Alta proteína"];

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

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekStart() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return formatLocalDate(monday);
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
  const todayIdx = (() => { const d = new Date().getDay(); return (d + 6) % 7; })();
  const [selectedDay, setSelectedDay] = useState(todayIdx);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const recipesScrollRef = useRef<HTMLDivElement>(null);
  const recipesCache = useRef<Record<number, Recipe[]>>({});
  const { user } = useAuth();
  const { isPro, requirePro } = usePro();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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

  // Auto-trigger generation from FAB ?generate=1
  useEffect(() => {
    if (searchParams.get("generate") === "1" && !generate.isPending) {
      if (requirePro("Gerar plano alimentar")) generate.mutate();
      searchParams.delete("generate");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-5 pt-4 pb-32">
      {/* Top bar: back / title / filter */}
      <div className="flex items-center justify-between h-10 mb-4">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-[#6b7280] active:scale-90 transition-transform"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[18px] font-bold text-white">Diet Plan</h1>
        <ProGenButton
          variant="icon"
          onClick={() => generate.mutate()}
          loading={generate.isPending}
          requireProLabel="Gerar plano alimentar"
          ariaLabel="Atualizar plano"
          className="-mr-2"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 px-[18px] py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 ${
              activeFilter === f
                ? "bg-[#22c55e] text-white"
                : "border border-white/[0.12] text-[#6b7280]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Day selector — circles */}
      <div className="flex items-center justify-between mb-5">
        {shortDays.map((d, i) => {
          const isActive = selectedDay === i;
          const isToday = todayIdx === i;
          const isPast = i < todayIdx;
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(i)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                {d}
              </span>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold transition-all ${
                  isActive
                    ? "bg-[#22c55e] text-white"
                    : isPast
                      ? "border border-[#22c55e]/40 text-[#22c55e]"
                      : isToday
                        ? "border border-white/20 text-white"
                        : "text-[#6b7280]"
                }`}
              >
                {i + 1}
              </div>
            </button>
          );
        })}
      </div>

      {/* Calorie summary */}
      {currentDay && (
        <div className="rounded-2xl bg-[#141414] border border-white/[0.07] p-4 mb-5">
          <div className="flex items-baseline justify-between mb-2.5">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#6b7280] font-semibold">Calorias do dia</p>
              <p className="text-[26px] font-extrabold text-white tabular-nums leading-none mt-1">
                {dayTotals.calories.toLocaleString("pt-BR")}
                <span className="text-[12px] font-medium text-[#6b7280] ml-1.5">kcal</span>
              </p>
            </div>
            <div className="flex gap-3 text-right">
              <div><p className="text-[10px] text-[#6b7280] uppercase">P</p><p className="text-[13px] font-bold text-white">{dayTotals.protein}g</p></div>
              <div><p className="text-[10px] text-[#6b7280] uppercase">C</p><p className="text-[13px] font-bold text-white">{dayTotals.carbs}g</p></div>
              <div><p className="text-[10px] text-[#6b7280] uppercase">G</p><p className="text-[13px] font-bold text-white">{dayTotals.fat}g</p></div>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06] flex">
            <div className="h-full bg-[#22c55e] transition-all duration-500" style={{ width: `${proteinPct}%` }} />
            <div className="h-full bg-[#22c55e]/60 transition-all duration-500" style={{ width: `${carbsPct}%` }} />
            <div className="h-full bg-[#22c55e]/30 transition-all duration-500" style={{ width: `${fatPct}%` }} />
          </div>
        </div>
      )}

      {/* Generation progress */}
      <GenerationProgress
        active={generate.isPending}
        steps={[
          "Analisando seu perfil e objetivos...",
          "Calculando calorias e macros ideais...",
          "Selecionando refeições balanceadas...",
          "Montando o plano semanal...",
          "Finalizando os detalhes...",
        ]}
      />

      <GenerationProgress
        active={generate.isPending}
        steps={[
          "Analisando seu perfil e objetivos...",
          "Calculando calorias e macros ideais...",
          "Selecionando refeições balanceadas...",
          "Montando o plano semanal...",
          "Finalizando os detalhes...",
        ]}
      />

      {/* Loading skeleton */}
      {isLoading && !generate.isPending && !planData && (
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
          <ProGenButton
            variant="primary"
            onClick={() => generate.mutate()}
            loading={generate.isPending}
            requireProLabel="Gerar plano alimentar"
            label="Gerar Seu Plano"
            proLabel="Gerar Seu Plano • FitFlow+"
          />
        </div>
      )}

      {/* Meal sections */}
      {currentDay && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-5"
          >
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((type, index) => {
              const meal = currentDay.meals?.[type];
              if (!meal) return null;
              const isSwapping = swappingMeal === `${dayNames[selectedDay]}-${type}`;
              const favKey = `${selectedDay}-${type}`;
              const isFav = favorites.has(favKey);
              const Icon = mealIcons[type] || UtensilsCrossed;

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <Icon size={12} className="text-[#6b7280]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">
                      {mealTypeLabels[type]}
                    </span>
                  </div>

                  {/* Meal card */}
                  <div
                    className={`rounded-2xl bg-[#141414] border border-white/[0.07] p-4 active:scale-[0.99] transition-transform ${
                      isSwapping ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-[17px] font-bold text-white leading-tight flex-1 min-w-0">
                        {meal.name}
                      </p>
                      <span className="text-[15px] font-bold text-[#22c55e] tabular-nums shrink-0">
                        {meal.calories} kcal
                      </span>
                    </div>

                    {meal.description && (
                      <p className="text-[13px] text-[#6b7280] leading-snug line-clamp-2 mb-3">
                        {meal.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        {[
                          { letter: "P", value: meal.protein },
                          { letter: "C", value: meal.carbs },
                          { letter: "G", value: meal.fat },
                        ].map(m => (
                          <div key={m.letter} className="flex items-baseline gap-1">
                            <span className="text-[11px] font-medium text-[#6b7280] uppercase">{m.letter}</span>
                            <span className="text-[13px] font-bold text-white tabular-nums">{m.value}g</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleFavorite(favKey)}
                          aria-label="Favoritar"
                          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Heart size={14} className={isFav ? "text-[#22c55e] fill-[#22c55e]" : "text-[#6b7280]"} />
                        </button>
                        <button
                          onClick={() => { if (requirePro("Trocar refeição")) swapMeal.mutate({ day: dayNames[selectedDay], mealType: type }); }}
                          disabled={isSwapping || swapMeal.isPending}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[11px] uppercase tracking-wider font-bold text-white active:scale-95 transition-all disabled:opacity-40"
                        >
                          <Shuffle size={10} className={isSwapping ? "animate-spin" : ""} />
                          Swap meal
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* "View recipes" floating button — sits above bottom nav */}
      {currentDay && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] px-5 pointer-events-none"
          style={{ bottom: `calc(80px + env(safe-area-inset-bottom, 0px))` }}
        >
          <button
            onClick={handleViewRecipes}
            disabled={loadingRecipes}
            className="pointer-events-auto w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#22c55e] text-white text-[13px] font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
            style={{ boxShadow: "0 8px 24px rgba(34,197,94,0.25)" }}
          >
            {loadingRecipes ? (
              <><RefreshCw size={14} className="animate-spin" /> Gerando receitas...</>
            ) : (
              <>Ver receitas do dia <ChevronRight size={14} /></>
            )}
          </button>
        </div>
      )}

      {/* Recipes Sheet */}
      <Sheet open={recipesOpen} onOpenChange={setRecipesOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-3xl bg-[#0f1117] border-t border-white/[0.06] p-0 flex flex-col"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/[0.04] shrink-0">
            <div>
              <SheetTitle className="text-lg font-bold text-white">Receitas do Dia</SheetTitle>
              <p className="text-xs text-[#6b7280] mt-0.5">{shortDays[selectedDay]} — {recipes.length} receitas</p>
            </div>
          </SheetHeader>

          <div className="h-0.5 w-full bg-white/[0.04] shrink-0 overflow-hidden">
            <div
              className="h-full bg-[#22c55e] transition-[width] duration-75 ease-out"
              style={{ width: `${readProgress}%` }}
            />
          </div>

          <div
            ref={recipesScrollRef}
            onScroll={(e) => {
              const el = e.target as HTMLDivElement;
              setShowBackToTop(el.scrollTop > 400);
              const max = el.scrollHeight - el.clientHeight;
              setReadProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
            }}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain relative"
          >
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

              {[...recipes].sort((a, b) => {
                const mealOrder = ["CAFÉ DA MANHÃ", "ALMOÇO", "LANCHE", "JANTAR", "PRÉ-TREINO"];
                const aIdx = mealOrder.indexOf(a.meal_type?.toUpperCase?.() || "");
                const bIdx = mealOrder.indexOf(b.meal_type?.toUpperCase?.() || "");
                return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
              }).map((recipe, i) => {
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
                                    <span className="text-white/70 leading-relaxed min-w-0 break-words">{step}</span>
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
          </div>

          <AnimatePresence>
            {showBackToTop && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.2 }}
                onClick={() => recipesScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                aria-label="Voltar ao topo"
                className="absolute bottom-5 right-5 w-11 h-11 rounded-full bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/30 flex items-center justify-center active:scale-95 transition-transform z-10"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </div>
  );
}
