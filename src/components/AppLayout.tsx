import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Utensils, Dumbbell, Camera, TrendingUp, User, Moon, Sun, Plus, Trophy, Users, Download, Menu, X, BedDouble } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import { getNotificationPrefs } from "@/lib/use-notifications";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/diet", icon: Utensils, label: "Dieta" },
  { to: "/workout", icon: Dumbbell, label: "Treino" },
  { to: "/scanner", icon: Camera, label: "Scanner" },
  { to: "/progress", icon: TrendingUp, label: "Progresso" },
];

const menuItems = [
  { to: "/profile", icon: User, label: "Perfil" },
  { to: "/sleep", icon: BedDouble, label: "Sono & Recuperação" },
  { to: "/achievements", icon: Trophy, label: "Conquistas" },
  { to: "/leaderboard", icon: Users, label: "Ranking" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const showInstallButton = !isInstalled && deferredPrompt;

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
          {menuItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-fitflow-primary/10 text-fitflow-primary" : "text-foreground/50 hover:text-foreground/80 hover:bg-white/5"
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
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
        {/* Mobile header — with safe area for PWA */}
        <header className="lg:hidden sticky top-0 bg-[#0f1117]/95 backdrop-blur-xl z-40 border-b border-white/[0.06]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center justify-between px-4 h-12">
            <h1 className="text-base font-semibold tracking-tight text-white">
              Fit<span className="text-[#22c55e]">Flow</span>
            </h1>
            <div className="flex items-center gap-2">
              {showInstallButton && (
                <button
                  onClick={handleInstall}
                  className="h-8 px-3 rounded-lg bg-[#22c55e]/15 text-[#22c55e] flex items-center gap-1.5 active:scale-90 transition-all text-xs font-semibold"
                >
                  <Download size={13} />
                  Instalar
                </button>
              )}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:bg-white/[0.04] active:scale-90 transition-all"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile hamburger menu overlay */}
        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="lg:hidden fixed inset-0 bg-black/60 z-40"
                onClick={() => setMenuOpen(false)}
                style={{ top: "calc(3rem + env(safe-area-inset-top, 0px))" }}
              />
              {/* Menu panel */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden fixed left-0 right-0 z-50 px-4 pt-2"
                style={{ top: "calc(3rem + env(safe-area-inset-top, 0px))" }}
              >
                <div className="rounded-2xl bg-[#16181f] border border-white/[0.06] overflow-hidden shadow-2xl shadow-black/40">
                  <nav className="p-2 space-y-0.5">
                    {menuItems.map(item => {
                      const active = location.pathname === item.to;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            active
                              ? "bg-[#22c55e]/10 text-[#22c55e]"
                              : "text-white/60 hover:bg-white/[0.03] active:bg-white/[0.05]"
                          }`}
                        >
                          <item.icon size={18} />
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </nav>
                  <div className="border-t border-white/[0.04] p-2">
                    <button
                      onClick={() => { toggle(); setMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:bg-white/[0.03] w-full transition-all"
                    >
                      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                      {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f1117]/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom z-50">
          <div className="flex justify-around items-center h-16">
            {tabs.map(t => {
              const active = t.to === "/" ? location.pathname === "/" : location.pathname.startsWith(t.to);
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center"
                >
                  <t.icon size={20} className={active ? "text-[#22c55e]" : "text-white/30"} />
                  <span className={`text-[10px] font-medium ${active ? "text-[#22c55e]" : "text-white/30"}`}>
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
          className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 w-14 h-14 rounded-full bg-[#22c55e] flex items-center justify-center shadow-lg shadow-[#22c55e]/25 active:scale-95 transition-transform z-50"
        >
          <Plus size={24} className="text-white" />
        </NavLink>
      </div>
    </div>
  );
}
