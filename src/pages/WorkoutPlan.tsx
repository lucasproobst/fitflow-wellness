import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlayCircle, Check, RefreshCw, X, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { GenerationProgress } from "@/components/GenerationProgress";

const shortDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  muscle_group: string;
  difficulty: string;
}

interface DayPlan {
  day: string;
  focus: string;
  exercises: Exercise[];
}

interface WorkoutPlanData {
  days: DayPlan[];
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekStart() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return formatLocalDate(monday);
}

/** Returns array of date strings (YYYY-MM-DD) for Mon–Sun of current week */
function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatLocalDate(d);
  });
}

export default function WorkoutPlan() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(false);
  const [videoExercise, setVideoExercise] = useState<string | null>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const weekDates = useMemo(() => getWeekDates(), []);

  // Fetch workout sessions for this week
  const { data: weekSessions } = useQuery({
    queryKey: ["workout-sessions-week", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("date")
        .eq("user_id", user!.id)
        .gte("date", weekDates[0])
        .lte("date", weekDates[6]);
      if (error) throw error;
      return data?.map((s) => s.date) ?? [];
    },
  });

  // Set of completed day indices (0=Mon ... 6=Sun)
  const completedDays = useMemo(() => {
    const set = new Set<number>();
    if (!weekSessions) return set;
    weekSessions.forEach((dateStr) => {
      const idx = weekDates.indexOf(dateStr);
      if (idx !== -1) set.add(idx);
    });
    return set;
  }, [weekSessions, weekDates]);

  // Check if Mon–Sat all done → week complete, unlock all
  const weekComplete = useMemo(() => {
    for (let i = 0; i < 6; i++) {
      if (!completedDays.has(i)) return false;
    }
    return true;
  }, [completedDays]);

  const isDayCompleted = (dayIdx: number) => !weekComplete && completedDays.has(dayIdx);

  const { data: planData, isLoading } = useQuery({
    queryKey: ["workout-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekStart = getWeekStart();
      const { data, error } = await supabase
        .from("workout_plans")
        .select("plan_data")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data?.plan_data as unknown) as WorkoutPlanData | null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-workout-plan");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as WorkoutPlanData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-plan"] });
      toast.success("Plano de treino gerado!");
    },
    onError: (err: any) => toast.error(err.message || "Falha ao gerar plano"),
  });

  const toggleSet = (key: string) => {
    setCompletedSets((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const finishWorkout = async () => {
    if (!user) return;
    const day = planData?.days?.[selectedDay];
    if (!day) return;
    const completed = day.exercises.map((ex, idx) => ({
      name: ex.name,
      sets_completed: Array.from({ length: ex.sets }).filter((_, s) => completedSets.has(`${idx}-${s}`)).length,
      total_sets: ex.sets,
    }));
    await supabase.from("workout_sessions").insert({
      user_id: user.id,
      date: weekDates[selectedDay],
      exercises_completed: completed as any,
    });
    toast.success("Treino concluído! 💪");
    setIsActive(false);
    setCompletedSets(new Set());
    qc.invalidateQueries({ queryKey: ["workout-sessions-week"] });
  };

  const currentDay = planData?.days?.[selectedDay];
  const dayLocked = isDayCompleted(selectedDay);

  const totalExercises = currentDay?.exercises?.length ?? 0;
  const completedCount =
    currentDay?.exercises?.reduce((acc, _, idx) => {
      const allDone = Array.from({ length: _.sets }).every((__, s) => completedSets.has(`${idx}-${s}`));
      return acc + (allDone ? 1 : 0);
    }, 0) ?? 0;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Treino</h1>
          <p className="text-sm text-white/40 truncate mt-0.5">
            {currentDay ? `${currentDay.focus} · ${currentDay.exercises.length} exercícios` : "Seu plano semanal personalizado"}
          </p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#22c55e] text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={generate.isPending ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{generate.isPending ? "Gerando..." : planData ? "Regenerar" : "Gerar Plano"}</span>
          <span className="sm:hidden">{generate.isPending ? "..." : planData ? "Novo" : "Gerar"}</span>
        </button>
      </div>

      {/* Week progress */}
      {planData && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-white/25 tracking-wider">Semana</span>
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-[#22c55e] rounded-full"
              animate={{ width: `${(completedDays.size / 6) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[10px] text-white/30 font-medium tabular-nums">{Math.min(completedDays.size, 6)}/6</span>
          {weekComplete && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] text-[#22c55e] font-bold"
            >
              ✓ Completa!
            </motion.span>
          )}
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {shortDays.map((d, i) => {
          const done = isDayCompleted(i);
          return (
            <button
              key={d}
              onClick={() => { setSelectedDay(i); setIsActive(false); setCompletedSets(new Set()); }}
              className={`relative px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                selectedDay === i
                  ? done
                    ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30"
                    : "bg-[#22c55e] text-white"
                  : done
                    ? "border border-[#22c55e]/20 text-[#22c55e]/60"
                    : "border border-white/[0.06] text-white/40 hover:bg-white/[0.03]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {done && <CheckCircle2 size={12} />}
                {d}
              </span>
            </button>
          );
        })}
      </div>

      {/* Generation progress */}
      <GenerationProgress
        active={generate.isPending}
        steps={[
          "Analisando seu perfil e nível...",
          "Definindo divisão de treino...",
          "Selecionando exercícios ideais...",
          "Ajustando séries e repetições...",
          "Finalizando o plano semanal...",
        ]}
      />

      {/* Loading skeleton */}
      {isLoading && !generate.isPending && !planData && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4 flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !generate.isPending && !planData && (
        <div className="rounded-2xl bg-[#16181f] border border-white/[0.06] py-16 text-center">
          <p className="text-white/30 text-sm mb-5">Nenhum plano de treino ainda</p>
          <button
            onClick={() => generate.mutate()}
            className="px-6 py-3 rounded-xl bg-[#22c55e] text-white text-sm font-semibold active:scale-95 transition-all"
          >
            Gerar Seu Plano
          </button>
        </div>
      )}

      {/* Exercises */}
      {currentDay && (
        <>
          {/* Day completed banner */}
          {dayLocked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl bg-[#22c55e]/[0.08] border border-[#22c55e]/20 px-4 py-3 flex items-center gap-3"
            >
              <CheckCircle2 size={18} className="text-[#22c55e] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#22c55e]">Treino concluído!</p>
                <p className="text-xs text-white/30 mt-0.5">Você já treinou neste dia. Descanse e volte amanhã 💪</p>
              </div>
            </motion.div>
          )}

          {/* Progress indicator when active */}
          {isActive && !dayLocked && totalExercises > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full bg-[#22c55e] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / totalExercises) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs text-white/40 font-medium tabular-nums">
                {completedCount}/{totalExercises}
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`space-y-3 mb-6 ${dayLocked ? "opacity-50 pointer-events-none select-none" : ""}`}
            >
              {currentDay.exercises.length === 0 ? (
                <div className="rounded-2xl bg-[#16181f] border border-white/[0.06] py-10 text-center">
                  <p className="text-white/30 text-sm">Dia de descanso — recupere e recarregue 🧘</p>
                </div>
              ) : (
                currentDay.exercises.map((ex, idx) => {
                  const setsCompleted = Array.from({ length: ex.sets }).filter((_, s) => completedSets.has(`${idx}-${s}`)).length;
                  const allDone = setsCompleted === ex.sets;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.04 }}
                      className={`rounded-2xl border transition-all duration-300 ${
                        dayLocked
                          ? "bg-[#22c55e]/[0.04] border-[#22c55e]/10"
                          : allDone && isActive
                            ? "bg-[#22c55e]/[0.06] border-[#22c55e]/20"
                            : "bg-[#16181f] border-white/[0.06]"
                      } p-4`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            dayLocked
                              ? "bg-[#22c55e]/10"
                              : allDone && isActive
                                ? "bg-[#22c55e]/10"
                                : "bg-white/[0.03]"
                          }`}
                        >
                          {dayLocked || (allDone && isActive) ? (
                            <Check size={20} className="text-[#22c55e]" />
                          ) : (
                            <span className="text-lg font-bold text-white/[0.08]">{idx + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-white">{ex.name}</p>
                              <p className="text-xs text-white/35 mt-0.5">
                                {ex.sets} × {ex.reps} reps
                              </p>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-white/25 tracking-wider">{ex.difficulty}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">{ex.muscle_group}</span>
                            {!dayLocked && (
                              <button
                                onClick={() => setVideoExercise(ex.name)}
                                className="flex items-center gap-1 text-white/25 hover:text-white/50 text-[10px] font-medium transition-colors pointer-events-auto"
                              >
                                <PlayCircle size={11} />
                                Assistir
                              </button>
                            )}
                          </div>

                          {/* Set tracker */}
                          {isActive && !dayLocked && (
                            <div className="flex gap-2 mt-3">
                              {Array.from({ length: ex.sets }).map((_, s) => {
                                const key = `${idx}-${s}`;
                                const done = completedSets.has(key);
                                return (
                                  <button
                                    key={s}
                                    onClick={() => toggleSet(key)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all active:scale-90 ${
                                      done
                                        ? "bg-[#22c55e] text-white"
                                        : "border border-white/[0.08] text-white/30 hover:bg-white/[0.03]"
                                    }`}
                                  >
                                    {done ? <Check size={14} /> : s + 1}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom CTA */}
          {currentDay.exercises.length > 0 && (
            dayLocked ? (
              <div className="w-full h-14 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center gap-2 text-white/25 text-sm font-semibold">
                <Lock size={16} />
                Treino do dia concluído
              </div>
            ) : (
              <button
                onClick={() => (isActive ? finishWorkout() : setIsActive(true))}
                className={`w-full h-14 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all ${
                  isActive ? "bg-white text-[#0f1117]" : "bg-[#22c55e] text-white"
                }`}
              >
                {isActive ? "Finalizar Treino" : "Iniciar Treino"}
              </button>
            )
          )}
        </>
      )}

      {/* Video Modal */}
      <AnimatePresence>
        {videoExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setVideoExercise(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-[#16181f] border border-white/[0.06]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white truncate">{videoExercise}</p>
                <button
                  onClick={() => setVideoExercise(null)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(videoExercise + " exercício forma correta")}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={videoExercise}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
