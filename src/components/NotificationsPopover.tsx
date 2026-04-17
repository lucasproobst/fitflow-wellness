import { useState, useEffect, useMemo } from "react";
import { Bell, Trophy, Droplet, Utensils, Dumbbell, Moon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAchievements, ACHIEVEMENTS } from "@/lib/use-achievements";
import { useDailyLog } from "@/lib/use-tracking";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface NotificationItem {
  id: string;
  kind: "achievement" | "reminder";
  icon: typeof Bell;
  title: string;
  description: string;
  timestamp: number; // ms
  href?: string;
  emoji?: string;
}

const STORAGE_KEY = "notif:lastSeen";

export function NotificationsPopover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: unlocked } = useAchievements();
  const { data: dailyLog } = useDailyLog();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return v ? Number(v) : 0;
  });

  // Recent workout to power "registre treino" reminder
  const today = new Date().toISOString().split("T")[0];
  const { data: hasWorkoutToday } = useQuery({
    queryKey: ["workout-today", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("date", today);
      return (count ?? 0) > 0;
    },
  });

  const { data: hasSleepToday } = useQuery({
    queryKey: ["sleep-today", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("sleep_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("date", today);
      return (count ?? 0) > 0;
    },
  });

  const items: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // Recent achievements (last 5)
    if (unlocked) {
      const recent = Array.from(unlocked.entries())
        .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
        .slice(0, 5);
      for (const [key, when] of recent) {
        const def = ACHIEVEMENTS.find(a => a.key === key);
        if (!def) continue;
        list.push({
          id: `a:${key}`,
          kind: "achievement",
          icon: Trophy,
          emoji: def.icon,
          title: `${def.title} desbloqueado`,
          description: def.description,
          timestamp: new Date(when).getTime(),
          href: "/achievements",
        });
      }
    }

    // Reminders — only show if condition is true today
    const meals = dailyLog?.meals || [];
    const water = dailyLog?.water_glasses ?? 0;
    const todayMs = new Date().setHours(8, 0, 0, 0); // anchor today 8am

    if (meals.length === 0) {
      list.push({
        id: "r:meals",
        kind: "reminder",
        icon: Utensils,
        title: "Registre uma refeição",
        description: "Você ainda não anotou nada hoje",
        timestamp: todayMs,
        href: "/diary",
      });
    }
    if (water < 8) {
      list.push({
        id: "r:water",
        kind: "reminder",
        icon: Droplet,
        title: `Beba mais água`,
        description: `${water}/8 copos hoje — mantenha o ritmo`,
        timestamp: todayMs + 1, // small offset so order is stable
        href: "/diary",
      });
    }
    if (hasWorkoutToday === false) {
      list.push({
        id: "r:workout",
        kind: "reminder",
        icon: Dumbbell,
        title: "Hora do treino",
        description: "Nenhum treino registrado hoje",
        timestamp: todayMs + 2,
        href: "/workout",
      });
    }
    if (hasSleepToday === false) {
      list.push({
        id: "r:sleep",
        kind: "reminder",
        icon: Moon,
        title: "Registre seu sono",
        description: "Como foi a noite passada?",
        timestamp: todayMs + 3,
        href: "/sleep",
      });
    }

    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
  }, [unlocked, dailyLog, hasWorkoutToday, hasSleepToday]);

  const unreadCount = items.filter(i => i.timestamp > lastSeen).length;

  // When opened, mark all as seen after a tiny delay (so badge clears smoothly)
  useEffect(() => {
    if (open && items.length > 0) {
      const newest = Math.max(...items.map(i => i.timestamp));
      const t = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, String(newest));
        setLastSeen(newest);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [open, items]);

  const handleClick = (item: NotificationItem) => {
    setOpen(false);
    if (item.href) navigate(item.href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notificações"
          className="relative w-9 h-9 rounded-full bg-[#141414] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all"
        >
          <Bell size={16} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#22c55e] text-black text-[10px] font-extrabold tabular-nums flex items-center justify-center border-2 border-[#0a0a0a]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[340px] p-0 bg-[#141414] border-white/[0.08] rounded-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-extrabold text-white">Notificações</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Conquistas e lembretes</p>
          </div>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold text-[#22c55e] tabular-nums">
              {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center px-6">
              <Bell size={20} className="text-white/20 mx-auto mb-2" />
              <p className="text-[11px] text-white/40">Nada por aqui</p>
              <p className="text-[10px] text-white/20 mt-0.5">Você está em dia ✨</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {items.map((item, i) => {
                const Icon = item.icon;
                const isNew = item.timestamp > lastSeen;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleClick(item)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div
                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                        item.kind === "achievement" ? "bg-[#22c55e]/15" : "bg-white/[0.05]"
                      }`}
                    >
                      {item.emoji ? (
                        <span className="text-base leading-none">{item.emoji}</span>
                      ) : (
                        <Icon size={15} className={item.kind === "achievement" ? "text-[#22c55e]" : "text-white/60"} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-bold text-white truncate">{item.title}</p>
                        {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />}
                      </div>
                      <p className="text-[10px] text-white/40 mt-0.5 line-clamp-2">{item.description}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => { setOpen(false); navigate("/achievements"); }}
          className="w-full px-4 py-2.5 border-t border-white/[0.06] text-[11px] font-bold text-[#22c55e] hover:bg-white/[0.03] transition-colors"
        >
          Ver todas as conquistas →
        </button>
      </PopoverContent>
    </Popover>
  );
}
