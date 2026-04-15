import { ReactNode, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Utensils, Dumbbell, Camera, TrendingUp, User, Moon, Sun, Plus, Trophy, Users, Bell } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { getNotificationPrefs } from "@/lib/use-notifications";

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/diet", icon: Utensils, label: "Dieta" },
  { to: "/workout", icon: Dumbbell, label: "Treino" },
  { to: "/scanner", icon: Camera, label: "Scanner" },
  { to: "/progress", icon: TrendingUp, label: "Progresso" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 p-4 sticky top-0 h-screen">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Fit<span className="text-fitflow-primary">Flow</span>
          </h1>
        </div>
        <nav className="flex-1 space-y-1">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-fitflow-primary/10 text-fitflow-primary" : "text-foreground/50 hover:text-foreground/80 hover:bg-white/5"
                }`
              }
            >
              <t.icon size={20} />
              {t.label}
            </NavLink>
          ))}
          <div className="h-px bg-white/5 my-4" />
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-fitflow-primary/10 text-fitflow-primary" : "text-foreground/50 hover:text-foreground/80 hover:bg-white/5"
              }`
            }
          >
            <User size={20} />
            Perfil
          </NavLink>
          <NavLink
            to="/sleep"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-fitflow-primary/10 text-fitflow-primary" : "text-foreground/50 hover:text-foreground/80 hover:bg-white/5"
              }`
            }
          >
            <Moon size={20} />
            Sono
          </NavLink>
          <NavLink
            to="/achievements"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-fitflow-primary/10 text-fitflow-primary" : "text-foreground/50 hover:text-foreground/80 hover:bg-white/5"
              }`
            }
          >
            <Trophy size={20} />
            Conquistas
          </NavLink>
          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-fitflow-primary/10 text-fitflow-primary" : "text-foreground/50 hover:text-foreground/80 hover:bg-white/5"
              }`
            }
          >
            <Users size={20} />
            Ranking
          </NavLink>
        </nav>
        <div className="mt-auto space-y-2">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/50 hover:text-foreground/80 hover:bg-white/5 w-full transition-all"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-h-screen w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-12 border-b border-white/5 sticky top-0 bg-background/90 backdrop-blur-lg z-40">
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Fit<span className="text-fitflow-primary">Flow</span>
          </h1>
          <div className="flex items-center gap-2">
            <NavLink
              to="/profile"
              className="relative w-9 h-9 rounded-full bg-gradient-to-br from-fitflow-primary to-fitflow-accent flex items-center justify-center active:scale-90 transition-transform"
            >
              <User size={16} className="text-white" />
              {/* Notification dot */}
              {typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && getNotificationPrefs().enabled && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fitflow-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-fitflow-accent border-2 border-background" />
                </span>
              )}
            </NavLink>
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex-1 pb-28 lg:pb-6"
        >
          {children}
        </motion.main>

        {/* Barra de navegação mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-white/5 safe-bottom z-50">
          <div className="flex justify-around items-center h-16">
            {tabs.map(t => {
              const active = t.to === "/" ? location.pathname === "/" : location.pathname.startsWith(t.to);
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center"
                >
                  <t.icon size={20} className={active ? "text-fitflow-primary" : "text-foreground/40"} />
                  <span className={`text-[10px] font-medium ${active ? "text-fitflow-primary" : "text-foreground/40"}`}>
                    {t.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* FAB */}
        <NavLink
          to="/diary"
          className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 w-14 h-14 rounded-full bg-fitflow-primary flex items-center justify-center shadow-lg shadow-fitflow-primary/25 active:scale-95 transition-transform z-50"
        >
          <Plus size={24} className="text-white" />
        </NavLink>
      </div>
    </div>
  );
}
