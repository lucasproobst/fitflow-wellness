import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown, TrendingUp, Share2, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { useWeightLogs, useLogWeight, useMeasurementLogs, useLogMeasurements, useStreak } from "@/lib/use-tracking";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MilestoneShareCard } from "@/components/MilestoneShareCard";
import { ProgressPhotosTimeline } from "@/components/ProgressPhotosTimeline";
import { motion, AnimatePresence } from "framer-motion";

const timeRanges = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
];


export default function Progress() {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const range = timeRanges[rangeIdx];
  const { user } = useAuth();
  const { data: weightLogs } = useWeightLogs(range.days);
  const logWeight = useLogWeight();
  const { data: measurementLogs } = useMeasurementLogs();
  const logMeasurements = useLogMeasurements();
  const { data: streakCount = 0 } = useStreak();

  const { data: workoutCount = 0 } = useQuery({
    queryKey: ["workout-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { count } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("date", since.toISOString().split("T")[0]);
      return count || 0;
    },
  });

  const { data: avgSleep = 0 } = useQuery({
    queryKey: ["avg-sleep", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("sleep_logs")
        .select("hours_slept")
        .eq("user_id", user!.id)
        .gte("date", since.toISOString().split("T")[0]);
      if (!data || data.length === 0) return 0;
      return data.reduce((s, r) => s + r.hours_slept, 0) / data.length;
    },
  });

  const [newWeight, setNewWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [arms, setArms] = useState("");


  const chartData = (weightLogs || []).map(l => ({
    date: new Date(l.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    weight: l.weight_kg,
  }));

  const first = weightLogs?.[0]?.weight_kg;
  const last = weightLogs?.[weightLogs.length - 1]?.weight_kg;
  const diff = first && last ? last - first : 0;
  const TrendIcon = diff <= 0 ? TrendingDown : TrendingUp;

  const handleLogWeight = () => {
    const w = parseFloat(newWeight);
    if (!w || w < 20 || w > 300) { toast.error("Insira um peso válido"); return; }
    logWeight.mutate(w, {
      onSuccess: () => { toast.success("Peso registrado"); setNewWeight(""); },
    });
  };

  const handleLogMeasurements = () => {
    const m: any = {};
    if (waist) m.waist_cm = parseFloat(waist);
    if (chest) m.chest_cm = parseFloat(chest);
    if (arms) m.arms_cm = parseFloat(arms);
    if (Object.keys(m).length === 0) { toast.error("Insira pelo menos uma medida"); return; }
    logMeasurements.mutate(m, {
      onSuccess: () => { toast.success("Medidas salvas"); setWaist(""); setChest(""); setArms(""); },
    });
  };

  const fadeIn = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay },
  });

  return (
    <div className="mobile-shell px-4 lg:px-8 py-6 pb-28 lg:pb-12">
      <div className="flex items-end justify-between mb-6 lg:mb-8 gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1 hidden lg:block">Sua evolução</p>
          <h1 className="text-2xl lg:text-[32px] font-extrabold tracking-tight text-white leading-tight">Progresso</h1>
          <p className="text-sm text-white/40 mt-0.5">Acompanhe sua evolução</p>
        </div>
        <motion.button
          {...fadeIn(0)}
          onClick={() => setShareOpen(true)}
          className="hidden lg:flex h-10 px-4 rounded-full bg-[#22c55e] text-white text-[13px] font-bold items-center gap-2 active:scale-95 transition-all shrink-0"
        >
          <Share2 size={14} />
          Compartilhar marco
        </motion.button>
      </div>

      {/* Mobile share button */}
      <motion.div {...fadeIn(0)} className="lg:hidden">
        <button
          onClick={() => setShareOpen(true)}
          className="w-full mb-4 h-12 rounded-xl bg-[#22c55e] text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Share2 size={16} />
          Compartilhar Seu Marco
        </button>
      </motion.div>

      <MilestoneShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{
          weightLost: Math.abs(diff),
          streakDays: streakCount,
          workoutsCompleted: workoutCount,
          avgSleep,
          userName: user?.user_metadata?.full_name || user?.email?.split("@")[0],
        }}
      />

      {/* Responsive 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* LEFT — big chart + weight input (8/12) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Registrar peso */}
          <motion.div {...fadeIn(0.05)} className="rounded-2xl bg-[#141414] border border-white/[0.07] p-4 lg:p-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">REGISTRAR PESO DE HOJE</h2>
            <div className="flex gap-2">
              <input
                type="number"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="ex: 75,5"
                className="flex-1 h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#22c55e]/40 transition-colors placeholder:text-white/20"
              />
              <button
                onClick={handleLogWeight}
                disabled={logWeight.isPending}
                className="px-5 h-11 rounded-xl bg-[#22c55e] text-white text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
              >
                {logWeight.isPending ? "..." : "Salvar"}
              </button>
            </div>
          </motion.div>

          {/* Gráfico de Peso — bigger on desktop */}
          <motion.div {...fadeIn(0.1)} className="rounded-2xl bg-[#141414] border border-white/[0.07] p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm lg:text-base font-bold text-white">Peso</h2>
                {diff !== 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <TrendIcon size={14} className="text-[#22c55e]" />
                    <span className="text-xs text-[#22c55e] font-medium">
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {timeRanges.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRangeIdx(i)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 ${
                      rangeIdx === i
                        ? "bg-[#22c55e] text-white"
                        : "border border-white/[0.06] text-white/30 hover:bg-white/[0.03]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180} className="lg:!h-[360px]">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, fontSize: 12, color: "#fff" }}
                    labelStyle={{ color: "rgba(255,255,255,0.4)" }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-white/20 py-8 lg:py-24">Registre seu peso para ver o progresso</p>
            )}
          </motion.div>

          {/* Histórico de Treinos — wide column */}
          <WorkoutHistory userId={user?.id} fadeIn={fadeIn} />
        </div>

        {/* RIGHT — sidebar with measurements + photos (4/12) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Medidas */}
          <motion.div {...fadeIn(0.15)} className="rounded-2xl bg-[#141414] border border-white/[0.07] p-4 lg:p-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-4">MEDIDAS CORPORAIS</h2>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 mb-3">
              {[
                { label: "Cintura", value: waist, set: setWaist },
                { label: "Peito", value: chest, set: setChest },
                { label: "Braços", value: arms, set: setArms },
              ].map(m => (
                <div key={m.label} className="lg:flex lg:items-center lg:gap-3">
                  <label className="text-[10px] text-white/30 block mb-1 lg:mb-0 lg:flex-1 lg:text-xs lg:font-semibold lg:text-white/60 lg:uppercase lg:tracking-wider">
                    {m.label} <span className="lg:hidden">(cm)</span>
                  </label>
                  <input
                    type="number"
                    value={m.value}
                    onChange={e => m.set(e.target.value)}
                    placeholder="—"
                    className="w-full lg:w-20 h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm text-center focus:outline-none focus:border-[#22c55e]/40 transition-colors placeholder:text-white/15"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleLogMeasurements}
              disabled={logMeasurements.isPending}
              className="w-full h-10 rounded-xl bg-white/[0.04] text-white/60 text-sm font-semibold hover:bg-white/[0.06] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Salvar Medidas
            </button>
          </motion.div>

          {/* Fotos Antes/Depois */}
          <ProgressPhotosTimeline />
        </div>
      </div>
    </div>
  );
}

interface WorkoutSession {
  id: string;
  date: string;
  exercises_completed: { name: string; sets_completed: number; total_sets: number }[] | null;
}

function WorkoutHistory({ userId, fadeIn }: { userId?: string; fadeIn: (d: number) => any }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: sessions } = useQuery({
    queryKey: ["workout-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, date, exercises_completed")
        .eq("user_id", userId!)
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as unknown) as WorkoutSession[];
    },
  });

  // Group by date
  const grouped = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    const map = new Map<string, WorkoutSession[]>();
    sessions.forEach((s) => {
      const existing = map.get(s.date) || [];
      existing.push(s);
      map.set(s.date, existing);
    });
    return Array.from(map.entries());
  }, [sessions]);

  if (!sessions || sessions.length === 0) return null;

  return (
    <motion.div {...fadeIn(0.25)} className="rounded-2xl bg-[#141414] border border-white/[0.07] p-4 mb-4">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-4 flex items-center gap-2">
        <Dumbbell size={12} className="text-white/20" />
        HISTÓRICO DE TREINOS
      </h2>

      <div className="space-y-2">
        {grouped.map(([date, daySessions]) => {
          const isOpen = expanded === date;
          const exercises = daySessions.flatMap((s) => s.exercises_completed || []);
          const totalSets = exercises.reduce((a, e) => a + e.total_sets, 0);
          const doneSets = exercises.reduce((a, e) => a + e.sets_completed, 0);
          const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

          return (
            <div key={date}>
              <button
                onClick={() => setExpanded(isOpen ? null : date)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                  <Dumbbell size={14} className="text-[#22c55e]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white">
                    {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {exercises.length} exercícios · {pct}% completado
                  </p>
                </div>
                {/* Mini progress */}
                <div className="w-10 h-1 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                  <div className="h-full bg-[#22c55e] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                {isOpen ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-14 pr-3 pb-2 space-y-1.5">
                      {exercises.map((ex, i) => {
                        const done = ex.sets_completed === ex.total_sets;
                        return (
                          <div key={i} className="flex items-center gap-2 py-1.5">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                              done ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-white/[0.04] text-white/20"
                            }`}>
                              {done ? "✓" : i + 1}
                            </div>
                            <span className="flex-1 text-xs text-white/70 truncate">{ex.name}</span>
                            <span className="text-[10px] text-white/25 tabular-nums">
                              {ex.sets_completed}/{ex.total_sets} séries
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
