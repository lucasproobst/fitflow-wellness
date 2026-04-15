import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { WaterTracker } from "@/components/WaterTracker";
import { useProfile } from "@/lib/use-profile";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useDailyLog, useAddWater, useStreak, useWeeklySummary } from "@/lib/use-tracking";
import { Flame, Sun, Moon, Dumbbell, ChevronRight, TrendingDown, TrendingUp, Utensils, BarChart3, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { theme, toggle } = useTheme();
  const { data: dailyLog } = useDailyLog();
  const addWater = useAddWater();
  const { data: streak } = useStreak();
  const { data: weeklySummary } = useWeeklySummary();
  const streakCount = streak ?? 0;
  const initials = user?.email?.slice(0, 2).toUpperCase() || "FF";

  const [showWeekly, setShowWeekly] = useState(false);

  // Show weekly summary banner once per session if there's data
  useEffect(() => {
    if (weeklySummary && weeklySummary.daysLogged > 0) {
      const lastDismissed = sessionStorage.getItem("weekly-summary-dismissed");
      if (!lastDismissed) setShowWeekly(true);
    }
  }, [weeklySummary]);

  const calorieTarget = profile?.goal === "lose_weight" ? 1800 : profile?.goal === "gain_muscle" ? 2600 : 2200;
  const consumed = dailyLog?.calories_total || 0;
  const meals = dailyLog?.meals || [];
  const waterGlasses = dailyLog?.water_glasses || 0;
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fitflow-primary to-fitflow-accent flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Welcome back</p>
            <p className="text-xs text-foreground/50 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs font-semibold text-foreground">{streakCount}</span>
          </div>
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all lg:hidden"
          >
            {theme === "dark" ? <Sun size={16} className="text-foreground/60" /> : <Moon size={16} className="text-foreground/60" />}
          </button>
        </div>
      </div>

      {/* Weekly Summary Notification */}
      {showWeekly && weeklySummary && (
        <GlassCard className="mb-4 relative border-fitflow-primary/20">
          <button
            onClick={() => { setShowWeekly(false); sessionStorage.setItem("weekly-summary-dismissed", "1"); }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={12} className="text-foreground/40" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-fitflow-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-fitflow-primary">This Week</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Utensils size={12} className="text-foreground/40" />
              </div>
              <p className="text-lg font-bold text-foreground">{weeklySummary.avgCaloriesPerDay.toLocaleString()}</p>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider">Avg cal/day</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Dumbbell size={12} className="text-foreground/40" />
              </div>
              <p className="text-lg font-bold text-foreground">{weeklySummary.workoutsCompleted}</p>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider">Workouts</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {weeklySummary.weightChange !== null && weeklySummary.weightChange <= 0
                  ? <TrendingDown size={12} className="text-fitflow-primary" />
                  : <TrendingUp size={12} className="text-foreground/40" />}
              </div>
              <p className="text-lg font-bold text-foreground">
                {weeklySummary.weightChange !== null
                  ? `${weeklySummary.weightChange > 0 ? "+" : ""}${weeklySummary.weightChange.toFixed(1)}`
                  : "—"}
              </p>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider">kg change</p>
            </div>
          </div>
          <p className="text-[10px] text-foreground/30 mt-3 text-center">
            {weeklySummary.daysLogged} day{weeklySummary.daysLogged !== 1 ? "s" : ""} logged • {weeklySummary.totalCalories.toLocaleString()} total calories
          </p>
        </GlassCard>
      )}

      {/* Calorie ring */}
      <div className="flex justify-center mb-8">
        <CalorieRing consumed={consumed} target={calorieTarget} />
      </div>

      {/* Macros */}
      <GlassCard className="mb-4 space-y-3">
        <MacroBar label="Protein" current={totalProtein} target={150} />
        <MacroBar label="Carbs" current={totalCarbs} target={200} />
        <MacroBar label="Fat" current={totalFat} target={60} />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="label-style text-[10px] mb-3">HYDRATION</h3>
          <WaterTracker
            glasses={waterGlasses}
            onAdd={() => addWater.mutate()}
          />
        </GlassCard>

        <Link to="/workout">
          <GlassCard className="hover:border-fitflow-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fitflow-primary/10 flex items-center justify-center">
                  <Dumbbell size={18} className="text-fitflow-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Today's Workout</p>
                  <p className="text-xs text-foreground/40">Upper Body · 6 exercises</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-foreground/30" />
            </div>
          </GlassCard>
        </Link>
      </div>

      <GlassCard className="mt-4">
        <div className="flex items-center gap-3">
          <Flame size={24} className="text-orange-400" />
          <div>
            <p className="text-lg font-semibold text-foreground">{streakCount} Day Streak</p>
            <p className="text-xs text-foreground/40">
              {streakCount > 0 ? "Keep it up! You're on fire" : "Log meals & workouts to start your streak"}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
