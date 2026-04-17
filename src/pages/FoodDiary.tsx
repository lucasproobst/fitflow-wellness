import { useState } from "react";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { WaterTracker } from "@/components/WaterTracker";
import { useDailyLog, useUpsertDailyLog, useAddWater, DailyLogMeal } from "@/lib/use-tracking";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const commonFoods: DailyLogMeal[] = [
  { name: "Peito de Frango (100g)", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Arroz Integral (1 xícara)", calories: 216, protein: 5, carbs: 45, fat: 1.8 },
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Ovo (1 grande)", calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { name: "Aveia (1 xícara)", calories: 154, protein: 5.3, carbs: 27, fat: 2.6 },
  { name: "Iogurte Grego (170g)", calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { name: "Salmão (100g)", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Abacate (metade)", calories: 120, protein: 1.5, carbs: 6, fat: 11 },
  { name: "Maçã", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Amêndoas (28g)", calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: "Batata Doce (média)", calories: 103, protein: 2.3, carbs: 24, fat: 0.1 },
  { name: "Brócolis (1 xícara)", calories: 55, protein: 3.7, carbs: 11, fat: 0.6 },
  { name: "Atum (100g)", calories: 130, protein: 29, carbs: 0, fat: 0.6 },
  { name: "Pão Integral (1 fatia)", calories: 81, protein: 4, carbs: 14, fat: 1.1 },
  { name: "Queijo Cottage (1 xícara)", calories: 206, protein: 28, carbs: 6, fat: 9 },
  { name: "Quinoa (1 xícara cozida)", calories: 222, protein: 8, carbs: 39, fat: 3.5 },
  { name: "Pasta de Amendoim (2 col.)", calories: 188, protein: 7, carbs: 7, fat: 16 },
  { name: "Leite 2% (1 copo)", calories: 122, protein: 8, carbs: 12, fat: 5 },
  { name: "Peito de Peru (100g)", calories: 135, protein: 30, carbs: 0, fat: 1 },
  { name: "Mirtilos (1 xícara)", calories: 85, protein: 1.1, carbs: 21, fat: 0.5 },
  { name: "Espinafre (1 xícara cru)", calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1 },
  { name: "Laranja", calories: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  { name: "Tofu (100g)", calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: "Macarrão (1 xícara cozido)", calories: 220, protein: 8, carbs: 43, fat: 1.3 },
  { name: "Arroz Branco (1 xícara)", calories: 206, protein: 4.3, carbs: 45, fat: 0.4 },
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
      onSuccess: () => toast.success(`${food.name} adicionado`),
    });
    setSearch("");
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1">Hoje</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-white leading-tight">Diário alimentar</h1>
        <p className="text-xs text-white/40 mt-1">Acompanhe calorias, macros e hidratação</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex justify-center mb-6"
      >
        <CalorieRing consumed={totalCals} target={2000} size={180} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-[#141414] border border-white/[0.07] p-5 mb-4 space-y-3"
      >
        <MacroBar label="Proteína" current={totalProtein} target={150} />
        <MacroBar label="Carboidratos" current={totalCarbs} target={200} />
        <MacroBar label="Gordura" current={totalFat} target={60} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl bg-[#141414] border border-white/[0.07] p-5 mb-4"
      >
        <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 mb-3">HIDRATAÇÃO</h3>
        <WaterTracker glasses={waterGlasses} onAdd={() => addWater.mutate()} />
      </motion.div>

      {/* Busca rápida */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative mb-4"
      >
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar alimentos para adicionar..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#141414] border border-white/[0.07] text-white text-xs focus:outline-none focus:border-white/[0.15] transition-colors placeholder:text-white/20"
        />
        {search && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-white/[0.08] rounded-xl overflow-hidden z-10 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-xs text-white/30">Nenhum alimento encontrado</p>
            ) : (
              filtered.map((f, i) => (
                <button
                  key={i}
                  onClick={() => addFood(f)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-0"
                >
                  <span className="text-xs text-white/70">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white/50 tabular-nums">{f.calories} kcal</span>
                    <Plus size={12} className="text-[#22c55e]" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 mb-3">REFEIÇÕES DE HOJE</h2>
        {meals.length === 0 ? (
          <div className="rounded-2xl bg-[#141414] border border-white/[0.05] py-10 text-center">
            <p className="text-xs text-white/30">Nenhuma refeição registrada hoje</p>
            <p className="text-[10px] text-white/15 mt-1">Busque acima ou use o scanner</p>
          </div>
        ) : (
          <div className="space-y-2">
            {meals.map((meal, i) => (
              <div key={i} className="rounded-xl bg-[#141414] border border-white/[0.05] px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{meal.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">P:{meal.protein}g · C:{meal.carbs}g · G:{meal.fat}g</p>
                </div>
                <span className="text-sm font-extrabold text-white tabular-nums">{meal.calories}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
