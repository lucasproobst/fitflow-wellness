import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
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
import { Flame, Dumbbell, ChevronRight, TrendingDown, TrendingUp, Utensils, BarChart3, X, Download, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  useTheme(); // keep hook call order
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

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Barra superior */}
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

      {/* Resumo semanal */}
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-fitflow-primary">Esta Semana</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Utensils size={12} className="text-foreground/40" />
              </div>
              <p className="text-lg font-bold text-foreground">{weeklySummary.avgCaloriesPerDay.toLocaleString()}</p>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider">Méd cal/dia</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Dumbbell size={12} className="text-foreground/40" />
              </div>
              <p className="text-lg font-bold text-foreground">{weeklySummary.workoutsCompleted}</p>
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider">Treinos</p>
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
              <p className="text-[10px] text-foreground/40 uppercase tracking-wider">Variação kg</p>
            </div>
          </div>
          <p className="text-[10px] text-foreground/30 mt-3 text-center">
            {weeklySummary.daysLogged} dia{weeklySummary.daysLogged !== 1 ? "s" : ""} registrado{weeklySummary.daysLogged !== 1 ? "s" : ""} • {weeklySummary.totalCalories.toLocaleString()} calorias totais
          </p>
        </GlassCard>
      )}

      {/* Banner de instalação */}
      {showInstallBanner && (
        <GlassCard className="mb-4 relative border-fitflow-accent/20 overflow-hidden">
          <button
            onClick={dismissInstallBanner}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors z-10"
          >
            <X size={12} className="text-foreground/40" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fitflow-primary to-fitflow-accent flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <p className="text-sm font-semibold text-foreground mb-0.5">Instale o FitFlow</p>
              <p className="text-xs text-foreground/50 leading-relaxed">
                Adicione à sua tela inicial para acesso rápido e experiência completa.
              </p>
            </div>
          </div>
          {installPrompt ? (
            <button
              onClick={handleInstallBanner}
              className="mt-3 w-full h-10 rounded-xl bg-gradient-to-r from-fitflow-primary to-fitflow-accent text-white text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Download size={14} />
              Instalar Agora
            </button>
          ) : (
            <Link
              to="/install"
              className="mt-3 w-full h-10 rounded-xl bg-fitflow-primary/10 text-fitflow-primary text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Download size={14} />
              Como instalar
            </Link>
          )}
        </GlassCard>
      )}


      <div className="flex justify-center mb-8">
        <CalorieRing consumed={consumed} target={calorieTarget} />
      </div>

      {/* Macros */}
      <GlassCard className="mb-4 space-y-3">
        <MacroBar label="Proteína" current={totalProtein} target={150} />
        <MacroBar label="Carboidratos" current={totalCarbs} target={200} />
        <MacroBar label="Gordura" current={totalFat} target={60} />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="label-style text-[10px] mb-3">HIDRATAÇÃO</h3>
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
                  <p className="text-sm font-semibold text-foreground">Treino de Hoje</p>
                  <p className="text-xs text-foreground/40">Superior · 6 exercícios</p>
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
            <p className="text-lg font-semibold text-foreground">Sequência de {streakCount} Dia{streakCount !== 1 ? "s" : ""}</p>
            <p className="text-xs text-foreground/40">
              {streakCount > 0 ? "Continue assim! Você está arrasando" : "Registre refeições e treinos para começar sua sequência"}
            </p>
          </div>
        </div>
      </GlassCard>
      <Link to="/achievements">
        <GlassCard className="mt-4 hover:border-fitflow-primary/20 transition-colors">
          <AchievementBadges />
        </GlassCard>
      </Link>
    </div>
  );
}
