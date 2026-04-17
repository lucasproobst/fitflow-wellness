import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Utensils, Dumbbell, BarChart3, Plus, X, Camera, Salad, Download, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/use-profile";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationsPopover } from "@/components/NotificationsPopover";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/diet", icon: Utensils, label: "Dieta" },
  { to: "/workout", icon: Dumbbell, label: "Treino" },
  { to: "/progress", icon: BarChart3, label: "Stats" },
] as const;

const HIDE_CHROME_ROUTES = ["/onboarding", "/auth", "/landing"];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) { setIsInstalled(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  useEffect(() => { setFabOpen(false); }, [location.pathname]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const showInstallButton = !isInstalled && deferredPrompt;
  const hideChrome = HIDE_CHROME_ROUTES.some(r => location.pathname.startsWith(r));

  const initials = (profile?.display_name || user?.email || "?")
    .replace(/[^a-zA-ZÀ-ÿ0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  const fabActions = [
    { icon: Camera, title: "Escanear Alimento", subtitle: "Aponte a câmera para qualquer comida", onClick: () => navigate("/scanner") },
    { icon: Salad, title: "Gerar Dieta", subtitle: "Nova dieta personalizada", onClick: () => navigate("/diet?generate=1") },
    { icon: Dumbbell, title: "Gerar Treino", subtitle: "Novo treino na medida", onClick: () => navigate("/workout?generate=1") },
    { icon: Trophy, title: "Ranking", subtitle: "Veja sua posição entre os atletas", onClick: () => navigate("/leaderboard") },
  ];

  // No-chrome routes (auth/onboarding/landing): render bare
  if (hideChrome) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-[#0a0a0a]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <AppSidebar onNewClick={() => setFabOpen(o => !o)} />
        </div>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <header
            className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl z-40 border-b border-white/[0.06]"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-center justify-between px-5 lg:px-8 h-14 lg:h-16">
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger className="hidden lg:flex text-white/60 hover:text-white" />
                {/* Mobile-only greeting (desktop has it in sidebar) */}
                <div className="min-w-0 lg:hidden">
                  <p className="text-[11px] text-[#6b7280] font-medium">Olá,</p>
                  <h1 className="text-[15px] font-bold text-white truncate max-w-[180px]">
                    {profile?.display_name || user?.email?.split("@")[0] || "Atleta"}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showInstallButton && (
                  <button
                    onClick={handleInstall}
                    className="h-8 lg:h-9 px-3 lg:px-4 rounded-full bg-[#22c55e]/15 text-[#22c55e] flex items-center gap-1.5 active:scale-90 transition-all text-[11px] lg:text-[12px] font-bold"
                  >
                    <Download size={12} />
                    Instalar
                  </button>
                )}
                {/* Desktop quick action */}
                <button
                  onClick={() => setFabOpen(o => !o)}
                  className="hidden lg:flex h-9 px-4 rounded-full bg-[#22c55e] text-white items-center gap-1.5 text-[13px] font-bold active:scale-95 transition-transform"
                  style={{ boxShadow: "0 4px 14px rgba(34,197,94,0.35)" }}
                  aria-label="Ações rápidas"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  Novo
                </button>
                {/* Notifications */}
                <NotificationsPopover />
                {/* Avatar — both mobile and desktop */}
                <button
                  onClick={() => navigate("/profile")}
                  aria-label="Abrir perfil"
                  className="w-9 h-9 rounded-full overflow-hidden bg-[#141414] border border-white/[0.08] flex items-center justify-center text-[12px] font-bold text-white active:scale-90 transition-all"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Main content */}
          <AnimatePresence mode="wait">
            <motion.main
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-1 pb-32 lg:pb-12"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

        {/* FAB menu overlay */}
        <AnimatePresence>
          {fabOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFabOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              />
              <div
                className="fixed left-1/2 -translate-x-1/2 lg:left-auto lg:right-8 lg:translate-x-0 lg:bottom-8 z-50 w-full max-w-[480px] lg:max-w-[360px] px-5 lg:px-0 pointer-events-none"
                style={{ bottom: `calc(100px + env(safe-area-inset-bottom, 0px))` }}
              >
                <div className="space-y-2.5 pointer-events-auto">
                  {fabActions.map((a, i) => (
                    <motion.button
                      key={a.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.25, delay: (fabActions.length - 1 - i) * 0.05, ease: "easeOut" }}
                      onClick={() => { a.onClick(); setFabOpen(false); }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[#1a1a1a] border border-white/[0.08] active:scale-[0.98] transition-transform"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#22c55e]/15 flex items-center justify-center shrink-0">
                        <a.icon size={18} className="text-[#22c55e]" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-[15px] font-bold text-white leading-tight">{a.title}</p>
                        <p className="text-[12px] text-[#6b7280] mt-0.5 truncate">{a.subtitle}</p>
                      </div>
                      <span className="text-[#6b7280] text-lg">→</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Nav — mobile only */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0a0a0a] border-t border-white/[0.06] z-50 safe-bottom lg:hidden"
        >
          <div className="relative h-[72px] grid grid-cols-5 items-center px-2">
            {tabs.slice(0, 2).map(t => <BottomTab key={t.to} {...t} />)}

            {/* Center FAB */}
            <div className="flex items-center justify-center">
              <button
                onClick={() => setFabOpen(o => !o)}
                aria-label="Ações rápidas"
                className="w-14 h-14 rounded-full bg-[#22c55e] flex items-center justify-center -mt-7 active:scale-95 transition-transform"
                style={{ boxShadow: "0 4px 20px rgba(34,197,94,0.4)" }}
              >
                <motion.div
                  animate={{ rotate: fabOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {fabOpen ? <X size={26} className="text-white" strokeWidth={2.5} /> : <Plus size={26} className="text-white" strokeWidth={2.5} />}
                </motion.div>
              </button>
            </div>

            {tabs.slice(2).map(t => <BottomTab key={t.to} {...t} />)}
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
}

function BottomTab({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className="flex flex-col items-center justify-center gap-1 min-h-[44px]"
    >
      {({ isActive }) => (
        <>
          <Icon
            size={22}
            className={isActive ? "text-[#22c55e]" : "text-[#6b7280]"}
            strokeWidth={isActive ? 2.5 : 2}
            fill={isActive ? "rgba(34,197,94,0.15)" : "none"}
          />
          <span className={`text-[10px] font-medium ${isActive ? "text-[#22c55e]" : "text-[#6b7280]"}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
