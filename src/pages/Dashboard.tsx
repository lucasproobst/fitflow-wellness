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

function AnimCard({
  children,
  delay = 0,
  className = "",
  hoverable = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={hoverable ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`rounded-2xl bg-[#141414] border border-white/[0.07] ${
        hoverable ? "hover:border-white/[0.12] hover:shadow-[0_4px_24px_rgba(34,197,94,0.05)] cursor-pointer" : ""
      } transition-[border-color,box-shadow] duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
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

  const firstName = profile?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "Atleta";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

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
    <div className="mobile-shell px-4 lg:px-8 py-6 pb-28 lg:pb-12">
      {/* Mobile-only top bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-8 lg:hidden"
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-[#22c55e] flex items-center justify-center text-white text-sm font-semibold shrink-0"
          >
            {initials}
          </motion.div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Bem-vindo, {profile?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "Atleta"}</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
        >
          <Flame size={14} className="text-orange-400" />
          <span className="text-xs font-semibold text-white">{streakCount}</span>
        </motion.div>
      </motion.div>

      {/* Desktop hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex items-end justify-between mb-8"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1">Hoje</p>
          <h1 className="text-[32px] font-extrabold tracking-tight text-white leading-tight">Bem-vindo, {profile?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "Atleta"}</h1>
          <p className="text-sm text-white/40 mt-1">Seu resumo de saúde, treino e nutrição</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.04 }}
          className="flex items-center gap-2 px-4 h-10 rounded-full bg-white/[0.04] border border-white/[0.06]"
        >
          <Flame size={16} className="text-orange-400" />
          <span className="text-sm font-bold text-white tabular-nums">{streakCount}</span>
          <span className="text-[11px] text-white/40 font-semibold">dias</span>
        </motion.div>
      </motion.div>

      {/* Banners full width */}
      {showWeekly && weeklySummary && (
        <AnimCard delay={0} className="p-4 mb-4 relative">
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
            {[
              { icon: Utensils, value: weeklySummary.avgCaloriesPerDay.toLocaleString(), label: "Méd cal/dia", highlight: false },
              { icon: Dumbbell, value: weeklySummary.workoutsCompleted, label: "Treinos", highlight: false },
              {
                icon: weeklySummary.weightChange !== null && weeklySummary.weightChange <= 0 ? TrendingDown : TrendingUp,
                value: weeklySummary.weightChange !== null ? `${weeklySummary.weightChange > 0 ? "+" : ""}${weeklySummary.weightChange.toFixed(1)}` : "—",
                label: "Variação kg",
                highlight: weeklySummary.weightChange !== null && weeklySummary.weightChange <= 0,
              },
            ].map((item, i) => (
              <motion.div key={i} whileHover={{ scale: 1.05 }} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <item.icon size={12} className={item.highlight ? "text-[#22c55e]" : "text-white/25"} />
                </div>
                <p className="text-lg font-bold text-white">{item.value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{item.label}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-3 text-center">
            {weeklySummary.daysLogged} dia{weeklySummary.daysLogged !== 1 ? "s" : ""} registrado{weeklySummary.daysLogged !== 1 ? "s" : ""} • {weeklySummary.totalCalories.toLocaleString()} calorias totais
          </p>
        </AnimCard>
      )}

      {showInstallBanner && (
        <AnimCard delay={0.05} className="p-4 mb-4 relative">
          <button
            onClick={dismissInstallBanner}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors z-10"
          >
            <X size={12} className="text-white/30" />
          </button>
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ rotate: 6, scale: 1.05 }} className="w-11 h-11 rounded-2xl bg-[#22c55e]/10 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-[#22c55e]" />
            </motion.div>
            <div className="flex-1 min-w-0 pr-6">
              <p className="text-sm font-semibold text-white mb-0.5">Instale o FitFlow</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Adicione à sua tela inicial para acesso rápido e experiência completa.
              </p>
            </div>
          </div>
          {installPrompt ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleInstallBanner} className="mt-3 w-full h-10 rounded-xl bg-[#22c55e] text-white text-xs font-semibold flex items-center justify-center gap-2">
              <Download size={14} /> Instalar Agora
            </motion.button>
          ) : (
            <Link to="/install">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="mt-3 w-full h-10 rounded-xl bg-white/[0.04] text-white/50 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/[0.06]">
                <Download size={14} /> Como instalar
              </motion.div>
            </Link>
          )}
        </AnimCard>
      )}

      {/* Responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* LEFT — Calorie ring + macros */}
        <div className="lg:col-span-5 space-y-4">
          <AnimCard delay={0.08} className="p-6 flex flex-col items-center">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-4 self-start">CALORIAS DE HOJE</h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <CalorieRing consumed={consumed} target={calorieTarget} />
            </motion.div>
          </AnimCard>

          <AnimCard delay={0.15} hoverable className="p-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">MACROS</h3>
            <MacroBar label="Proteína" current={totalProtein} target={150} />
            <MacroBar label="Carboidratos" current={totalCarbs} target={200} />
            <MacroBar label="Gordura" current={totalFat} target={60} />
          </AnimCard>
        </div>

        {/* RIGHT — Hidratação, Treino, Streak, Achievements (grid 2x2 desktop) */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimCard delay={0.2} hoverable className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Droplets size={14} className="text-[#22c55e]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">HIDRATAÇÃO</h3>
              </div>
              <WaterTracker glasses={waterGlasses} onAdd={() => addWater.mutate()} />
            </AnimCard>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }} whileHover={{ y: -2 }}>
              <Link to="/workout" className="block h-full">
                <div className="rounded-2xl bg-[#141414] border border-white/[0.07] p-5 h-full hover:border-white/[0.12] hover:shadow-[0_4px_24px_rgba(34,197,94,0.05)] transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <motion.div whileHover={{ rotate: -8 }} className="w-11 h-11 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
                      <Dumbbell size={20} className="text-[#22c55e]" />
                    </motion.div>
                    <ChevronRight size={16} className="text-white/30" />
                  </div>
                  <p className="text-sm font-bold text-white">Treino de hoje</p>
                  <p className="text-xs text-white/40 mt-0.5">Toque para abrir</p>
                </div>
              </Link>
            </motion.div>

            <AnimCard delay={0.3} hoverable className="p-5">
              <div className="flex items-start gap-3">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Flame size={20} className="text-orange-400" />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-white tabular-nums">{streakCount} dia{streakCount !== 1 ? "s" : ""}</p>
                  <p className="text-[11px] text-white/40 leading-snug mt-0.5">
                    {streakCount > 0 ? "Continue assim! Você está arrasando" : "Registre para começar"}
                  </p>
                </div>
              </div>
            </AnimCard>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }} whileHover={{ y: -2 }}>
              <Link to="/achievements" className="block h-full">
                <div className="rounded-2xl bg-[#141414] border border-white/[0.07] p-5 h-full hover:border-white/[0.12] hover:shadow-[0_4px_24px_rgba(34,197,94,0.05)] transition-all duration-300">
                  <AchievementBadges />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
