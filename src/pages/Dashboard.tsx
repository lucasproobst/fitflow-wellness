import { GlassCard } from "@/components/GlassCard";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { WaterTracker } from "@/components/WaterTracker";
import { useProfile } from "@/lib/use-profile";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Flame, Sun, Moon, Dumbbell, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { theme, toggle } = useTheme();
  const [waterGlasses, setWaterGlasses] = useState(3);
  const initials = user?.email?.slice(0, 2).toUpperCase() || "FF";

  const calorieTarget = profile?.goal === "lose_weight" ? 1800 : profile?.goal === "gain_muscle" ? 2600 : 2200;
  const consumed = 1240;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fitflow-primary to-fitflow-accent flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Welcome back</p>
            <p className="text-xs text-foreground/50">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs font-semibold text-foreground">7</span>
          </div>
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all lg:hidden"
          >
            {theme === "dark" ? <Sun size={16} className="text-foreground/60" /> : <Moon size={16} className="text-foreground/60" />}
          </button>
        </div>
      </div>

      {/* Calorie ring */}
      <div className="flex justify-center mb-8">
        <CalorieRing consumed={consumed} target={calorieTarget} />
      </div>

      {/* Macros */}
      <GlassCard className="mb-4 space-y-3">
        <MacroBar label="Protein" current={68} target={150} />
        <MacroBar label="Carbs" current={120} target={200} />
        <MacroBar label="Fat" current={35} target={60} />
      </GlassCard>

      {/* Water + Workout in grid on desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="label-style text-[10px] mb-3">HYDRATION</h3>
          <WaterTracker glasses={waterGlasses} onAdd={() => setWaterGlasses(g => g + 1)} />
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

      {/* Streak */}
      <GlassCard className="mt-4">
        <div className="flex items-center gap-3">
          <Flame size={24} className="text-orange-400" />
          <div>
            <p className="text-lg font-semibold text-foreground">7 Day Streak</p>
            <p className="text-xs text-foreground/40">Keep it up! You're on fire</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
