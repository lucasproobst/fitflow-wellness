import { useState, useEffect } from "react";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { WaterTracker } from "@/components/WaterTracker";
import { AchievementBadges } from "@/components/AchievementBadges";
import { useProfile } from "@/lib/use-profile";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useDailyLog, useAddWater, useStreak, useWeeklySummary } from "@/lib/use-tracking";
import { useCheckAchievements } from "@/lib/use-achievements";
import { useNotificationReminders } from "@/lib/use-notifications";
import { Flame, Dumbbell, ChevronRight, TrendingDown, TrendingUp, Utensils, BarChart3, X, Download, Smartphone, Droplets } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  useTheme();
  const { data: dailyLog } = useDailyLog();
  const addWater = useAddWater();
  const { data: streak } = useStreak();
  const { data: weeklySummary } = useWeeklySummary();
  const streakCount = streak ?? 0;
  const initials = user?.email?.slice(0, 2).toUpperCase() || "FF";
  useCheckAchievements();
  useNotificationReminders();

  const [showWeekly, setShowWeekly] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(() => localStorage.getItem("install-banner-dismissed") === "1");
  const [isAppInstalled, setIsAppInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);

  useEffect(() => {
    if (weeklySummary && weeklySummary.daysLogged > 0) {
      const lastDismissed = sessionStorage.getItem("weekly-summary-dismissed");
      if (!lastDismissed) setShowWeekly(true);
    }
  }, [weeklySummary]);

  useEffect(() => {
    if (isAppInstalled || installDismissed) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setIsAppInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [isAppInstalled, installDismissed]);

  const handleInstallBanner = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsAppInstalled(true);
    setInstallPrompt(null);
  };

  const dismissInstallBanner = () => {
    setInstallDismissed(true);
    localStorage.setItem("install-banner-dismissed", "1");
  };

  const showInstallBanner = !isAppInstalled && !installDismissed;

  const calorieTarget = profile?.goal === "lose_weight" ? 1800 : profile?.goal === "gain_muscle" ? 2600 : 2200;
  const consumed = dailyLog?.calories_total || 0;
  const meals = dailyLog?.meals || [];
  const waterGlasses = dailyLog?.water_glasses || 0;
  const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);

  const fadeIn = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay },
  });

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#22c55e] flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Bem-vindo de volta</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Flame size={14} className="text-orange-400" />
          <span className="text-xs font-semibold text-white">{streakCount}</span>
        </div>
      </div>

      {/* Weekly summary */}
      {showWeekly && weeklySummary && (
        <motion.div {...fadeIn(0)} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4 mb-4 relative">
          <button
            onClick={() => { setShowWeekly(false); sessionStorage.setItem("weekly-summary-dismissed", "1"); }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
          >
            <X size={12} className="text-white/30" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-[#22c55e]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#22c55e]">Esta Semana</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Utensils size={12} className="text-white/25" />
              </div>
              <p className="text-lg font-bold text-white">{weeklySummary.avgCaloriesPerDay.toLocaleString()}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Méd cal/dia</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Dumbbell size={12} className="text-white/25" />
              </div>
              <p className="text-lg font-bold text-white">{weeklySummary.workoutsCompleted}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Treinos</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {weeklySummary.weightChange !== null && weeklySummary.weightChange <= 0
                  ? <TrendingDown size={12} className="text-[#22c55e]" />
                  : <TrendingUp size={12} className="text-white/25" />}
              </div>
              <p className="text-lg font-bold text-white">
                {weeklySummary.weightChange !== null
                  ? `${weeklySummary.weightChange > 0 ? "+" : ""}${weeklySummary.weightChange.toFixed(1)}`
                  : "—"}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Variação kg</p>
            </div>
          </div>
          <p className="text-[10px] text-white/20 mt-3 text-center">
            {weeklySummary.daysLogged} dia{weeklySummary.daysLogged !== 1 ? "s" : ""} registrado{weeklySummary.daysLogged !== 1 ? "s" : ""} • {weeklySummary.totalCalories.toLocaleString()} calorias totais
          </p>
        </motion.div>
      )}

      {/* Install banner */}
      {showInstallBanner && (
        <motion.div {...fadeIn(0.05)} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4 mb-4 relative">
          <button
            onClick={dismissInstallBanner}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors z-10"
          >
            <X size={12} className="text-white/30" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#22c55e]/10 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-[#22c55e]" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <p className="text-sm font-semibold text-white mb-0.5">Instale o FitFlow</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Adicione à sua tela inicial para acesso rápido e experiência completa.
              </p>
            </div>
          </div>
          {installPrompt ? (
            <button
              onClick={handleInstallBanner}
              className="mt-3 w-full h-10 rounded-xl bg-[#22c55e] text-white text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Download size={14} />
              Instalar Agora
            </button>
          ) : (
            <Link
              to="/install"
              className="mt-3 w-full h-10 rounded-xl bg-white/[0.04] text-white/50 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-white/[0.06]"
            >
              <Download size={14} />
              Como instalar
            </Link>
          )}
        </motion.div>
      )}

      {/* Calorie Ring */}
      <motion.div {...fadeIn(0.1)} className="flex justify-center mb-8">
        <CalorieRing consumed={consumed} target={calorieTarget} />
      </motion.div>

      {/* Macros */}
      <motion.div {...fadeIn(0.15)} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4 mb-4 space-y-4">
        <MacroBar label="Proteína" current={totalProtein} target={150} />
        <MacroBar label="Carboidratos" current={totalCarbs} target={200} />
        <MacroBar label="Gordura" current={totalFat} target={60} />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hydration */}
        <motion.div {...fadeIn(0.2)} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">HIDRATAÇÃO</h3>
          <WaterTracker
            glasses={waterGlasses}
            onAdd={() => addWater.mutate()}
          />
        </motion.div>

        {/* Workout shortcut */}
        <motion.div {...fadeIn(0.25)}>
          <Link to="/workout">
            <div className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4 hover:border-white/[0.1] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                    <Dumbbell size={18} className="text-white/30" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Treino de Hoje</p>
                    <p className="text-xs text-white/30">Superior · 6 exercícios</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/20" />
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Streak */}
      <motion.div {...fadeIn(0.3)} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4 mt-4">
        <div className="flex items-center gap-3">
          <Flame size={24} className="text-orange-400" />
          <div>
            <p className="text-lg font-semibold text-white">Sequência de {streakCount} Dia{streakCount !== 1 ? "s" : ""}</p>
            <p className="text-xs text-white/30">
              {streakCount > 0 ? "Continue assim! Você está arrasando" : "Registre refeições e treinos para começar sua sequência"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div {...fadeIn(0.35)}>
        <Link to="/achievements">
          <div className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4 mt-4 hover:border-white/[0.1] transition-colors">
            <AchievementBadges />
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
