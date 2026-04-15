import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { WaterTracker } from "@/components/WaterTracker";
import { Search, Plus, X } from "lucide-react";

const commonFoods = [
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
];

export default function FoodDiary() {
  const [search, setSearch] = useState("");
  const [waterGlasses, setWaterGlasses] = useState(4);
  const [loggedMeals, setLoggedMeals] = useState([
    { name: "Oatmeal with Berries", calories: 280, protein: 12, carbs: 45, fat: 6 },
    { name: "Grilled Chicken Salad", calories: 420, protein: 35, carbs: 18, fat: 22 },
  ]);

  const totalCals = loggedMeals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = loggedMeals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = loggedMeals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = loggedMeals.reduce((s, m) => s + m.fat, 0);

  const filtered = search
    ? commonFoods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const addFood = (food: typeof commonFoods[0]) => {
    setLoggedMeals(prev => [...prev, food]);
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
        <WaterTracker glasses={waterGlasses} onAdd={() => setWaterGlasses(g => g + 1)} />
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

      {/* Logged meals */}
      <h2 className="label-style text-[10px] mb-3">TODAY'S MEALS</h2>
      <div className="space-y-2">
        {loggedMeals.map((meal, i) => (
          <GlassCard key={i} className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{meal.name}</p>
              <p className="text-xs text-foreground/40">P:{meal.protein}g · C:{meal.carbs}g · F:{meal.fat}g</p>
            </div>
            <span className="text-sm font-semibold text-fitflow-accent">{meal.calories}</span>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
