import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { RefreshCw, Filter } from "lucide-react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];
const filters = ["All", "Vegetarian", "Low-carb", "High-protein"];

interface Meal {
  name: string;
  calories: number;
  description: string;
  protein: number;
  carbs: number;
  fat: number;
}

const sampleMeals: Record<string, Meal> = {
  Breakfast: { name: "Greek Yogurt Bowl", calories: 340, description: "With granola, berries, and honey", protein: 22, carbs: 45, fat: 8 },
  Lunch: { name: "Grilled Chicken Salad", calories: 480, description: "Mixed greens, avocado, cherry tomatoes", protein: 38, carbs: 24, fat: 22 },
  Dinner: { name: "Salmon & Quinoa", calories: 560, description: "Herb-crusted salmon with steamed vegetables", protein: 42, carbs: 38, fat: 18 },
  Snack: { name: "Protein Smoothie", calories: 220, description: "Banana, whey protein, almond milk", protein: 25, carbs: 22, fat: 5 },
};

export default function DietPlan() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meal Plan</h1>
          <p className="text-sm text-foreground/50">Your personalized weekly plan</p>
        </div>
        <button
          onClick={generatePlan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-fitflow-primary text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Generating..." : "New Plan"}
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {days.map((d, i) => (
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

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
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

      {/* Meals */}
      <div className="space-y-3">
        {mealTypes.map(type => {
          const meal = sampleMeals[type];
          return (
            <GlassCard key={type}>
              <div className="flex items-center justify-between mb-2">
                <span className="label-style text-[10px]">{type}</span>
                <span className="text-sm font-semibold text-fitflow-accent">{meal.calories} cal</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{meal.name}</p>
              <p className="text-xs text-foreground/50 mb-3">{meal.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  {[
                    { l: "P", v: meal.protein },
                    { l: "C", v: meal.carbs },
                    { l: "F", v: meal.fat },
                  ].map(m => (
                    <div key={m.l} className="text-center">
                      <span className="text-[10px] text-foreground/30 uppercase">{m.l}</span>
                      <p className="text-xs font-semibold text-foreground">{m.v}g</p>
                    </div>
                  ))}
                </div>
                <button className="px-3 py-1 rounded-full border border-white/10 text-[10px] uppercase tracking-wider font-medium text-foreground/50 hover:bg-white/5 active:scale-95 transition-all">
                  Swap
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
