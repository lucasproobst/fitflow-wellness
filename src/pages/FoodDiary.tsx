import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { WaterTracker } from "@/components/WaterTracker";
import { useDailyLog, useUpsertDailyLog, useAddWater, DailyLogMeal } from "@/lib/use-tracking";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

const commonFoods: DailyLogMeal[] = [
  { name: "Chicken Breast (100g)", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Brown Rice (1 cup)", calories: 216, protein: 5, carbs: 45, fat: 1.8 },
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Egg (1 large)", calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { name: "Oatmeal (1 cup)", calories: 154, protein: 5.3, carbs: 27, fat: 2.6 },
  { name: "Greek Yogurt (170g)", calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { name: "Salmon (100g)", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Avocado (half)", calories: 120, protein: 1.5, carbs: 6, fat: 11 },
  { name: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Almonds (28g)", calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: "Sweet Potato (medium)", calories: 103, protein: 2.3, carbs: 24, fat: 0.1 },
  { name: "Broccoli (1 cup)", calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
  { name: "Tuna (100g)", calories: 130, protein: 29, carbs: 0, fat: 0.6 },
  { name: "Whole Wheat Bread (1 slice)", calories: 81, protein: 4, carbs: 14, fat: 1.1 },
  { name: "Cottage Cheese (1 cup)", calories: 206, protein: 28, carbs: 6, fat: 9 },
  { name: "Quinoa (1 cup cooked)", calories: 222, protein: 8, carbs: 39, fat: 3.5 },
  { name: "Peanut Butter (2 tbsp)", calories: 188, protein: 7, carbs: 7, fat: 16 },
  { name: "Milk 2% (1 cup)", calories: 122, protein: 8, carbs: 12, fat: 5 },
  { name: "Turkey Breast (100g)", calories: 135, protein: 30, carbs: 0, fat: 1 },
  { name: "Blueberries (1 cup)", calories: 85, protein: 1.1, carbs: 21, fat: 0.5 },
  { name: "Spinach (1 cup raw)", calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1 },
  { name: "Orange", calories: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  { name: "Tofu (100g)", calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: "Pasta (1 cup cooked)", calories: 220, protein: 8, carbs: 43, fat: 1.3 },
  { name: "White Rice (1 cup)", calories: 206, protein: 4.3, carbs: 45, fat: 0.4 },
];

export default function FoodDiary() {
  const [search, setSearch] = useState("");
  const { data: dailyLog } = useDailyLog();
  const upsert = useUpsertDailyLog();
  const addWater = useAddWater();

  const meals = dailyLog?.meals || [];
  const waterGlasses = dailyLog?.water_glasses || 0;
  const totalCals = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);

  const filtered = search
    ? commonFoods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const addFood = (food: DailyLogMeal) => {
    const newMeals = [...meals, food];
    upsert.mutate({ meals: newMeals }, {
      onSuccess: () => toast.success(`${food.name} added`),
    });
    setSearch("");
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Food Diary</h1>

      <div className="flex justify-center mb-6">
        <CalorieRing consumed={totalCals} target={2000} size={180} />
      </div>

      <GlassCard className="mb-4 space-y-3">
        <MacroBar label="Protein" current={totalProtein} target={150} />
        <MacroBar label="Carbs" current={totalCarbs} target={200} />
        <MacroBar label="Fat" current={totalFat} target={60} />
      </GlassCard>

      <GlassCard className="mb-4">
        <h3 className="label-style text-[10px] mb-3">HYDRATION</h3>
        <WaterTracker glasses={waterGlasses} onAdd={() => addWater.mutate()} />
      </GlassCard>

      {/* Quick add */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search foods to add..."
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:border-fitflow-primary transition-colors placeholder:text-foreground/30"
        />
        {search && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-white/10 rounded-2xl overflow-hidden z-10 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-foreground/40">No foods found</p>
            ) : (
              filtered.map((f, i) => (
                <button
                  key={i}
                  onClick={() => addFood(f)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm text-foreground">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fitflow-accent">{f.calories} cal</span>
                    <Plus size={14} className="text-fitflow-primary" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <h2 className="label-style text-[10px] mb-3">TODAY'S MEALS</h2>
      {meals.length === 0 ? (
        <GlassCard className="py-8 text-center">
          <p className="text-sm text-foreground/40">No meals logged today</p>
          <p className="text-xs text-foreground/30 mt-1">Search above or use the scanner</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {meals.map((meal, i) => (
            <GlassCard key={i} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{meal.name}</p>
                <p className="text-xs text-foreground/40">P:{meal.protein}g · C:{meal.carbs}g · F:{meal.fat}g</p>
              </div>
              <span className="text-sm font-semibold text-fitflow-accent">{meal.calories}</span>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
