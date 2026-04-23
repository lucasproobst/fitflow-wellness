import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PlayCircle, Check, RefreshCw, X, Lock, CheckCircle2, Repeat, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/use-profile";
import { usePro } from "@/lib/use-pro";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { GenerationProgress } from "@/components/GenerationProgress";
import { ProGenButton } from "@/components/ProGenButton";

// Smart suggestion: maps activity level → suggested workout days (indices: 0=Mon … 6=Sun)
const activitySuggestions: Record<string, { days: number[]; label: string; reason: string }> = {
  sedentary:   { days: [0, 3],          label: "Sedentário",  reason: "Comece leve com 2 dias para criar o hábito" },
  light:       { days: [0, 2, 4],       label: "Leve",        reason: "3 dias intercalados são ideais para iniciantes" },
  moderate:    { days: [0, 1, 3, 4],    label: "Moderado",    reason: "4 dias equilibram esforço e recuperação" },
  active:      { days: [0, 1, 2, 4, 5], label: "Ativo",       reason: "5 dias mantêm seu ritmo ativo" },
  very_active: { days: [0, 1, 2, 3, 4, 5], label: "Muito Ativo", reason: "6 dias para treino intenso, 1 de descanso" },
};
const defaultSuggestion = activitySuggestions.light;

const shortDays = ["S", "T", "Q", "Q", "S", "S", "D"];
const fullDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const dayNamesPt = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  muscle_group: string;
  difficulty: string;
}
interface DayPlan { day: string; focus: string; exercises: Exercise[]; }
interface WorkoutPlanData { days: DayPlan[]; }

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getWeekStart() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return formatLocalDate(monday);
}
function getWeekDates(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatLocalDate(d);
  });
}

// Pool of swap alternatives by muscle group
const swapPool: Record<string, Omit<Exercise, "difficulty">[]> = {
  Peito: [
    { name: "Supino Reto com Halteres", sets: 4, reps: 10, muscle_group: "Peito" },
    { name: "Crucifixo Inclinado", sets: 3, reps: 12, muscle_group: "Peito" },
    { name: "Flexão de Braço", sets: 3, reps: 15, muscle_group: "Peito" },
    { name: "Crossover na Polia", sets: 3, reps: 12, muscle_group: "Peito" },
    { name: "Supino Inclinado", sets: 4, reps: 10, muscle_group: "Peito" },
  ],
  Costas: [
    { name: "Puxada Frontal", sets: 4, reps: 10, muscle_group: "Costas" },
    { name: "Remada Curvada", sets: 4, reps: 10, muscle_group: "Costas" },
    { name: "Remada Cavalinho", sets: 3, reps: 12, muscle_group: "Costas" },
    { name: "Pulldown Triângulo", sets: 3, reps: 12, muscle_group: "Costas" },
    { name: "Barra Fixa", sets: 3, reps: 8, muscle_group: "Costas" },
  ],
  Pernas: [
    { name: "Agachamento Livre", sets: 4, reps: 10, muscle_group: "Pernas" },
    { name: "Leg Press 45°", sets: 4, reps: 12, muscle_group: "Pernas" },
    { name: "Cadeira Extensora", sets: 3, reps: 15, muscle_group: "Pernas" },
    { name: "Mesa Flexora", sets: 3, reps: 12, muscle_group: "Pernas" },
    { name: "Stiff", sets: 3, reps: 10, muscle_group: "Pernas" },
  ],
  Ombros: [
    { name: "Desenvolvimento com Halteres", sets: 4, reps: 10, muscle_group: "Ombros" },
    { name: "Elevação Lateral", sets: 3, reps: 12, muscle_group: "Ombros" },
    { name: "Elevação Frontal", sets: 3, reps: 12, muscle_group: "Ombros" },
    { name: "Crucifixo Invertido", sets: 3, reps: 12, muscle_group: "Ombros" },
  ],
  Bíceps: [
    { name: "Rosca Direta", sets: 3, reps: 12, muscle_group: "Bíceps" },
    { name: "Rosca Alternada", sets: 3, reps: 10, muscle_group: "Bíceps" },
    { name: "Rosca Martelo", sets: 3, reps: 12, muscle_group: "Bíceps" },
    { name: "Rosca Scott", sets: 3, reps: 10, muscle_group: "Bíceps" },
  ],
  Tríceps: [
    { name: "Tríceps Pulley", sets: 3, reps: 12, muscle_group: "Tríceps" },
    { name: "Tríceps Francês", sets: 3, reps: 10, muscle_group: "Tríceps" },
    { name: "Tríceps Testa", sets: 3, reps: 10, muscle_group: "Tríceps" },
    { name: "Mergulho no Banco", sets: 3, reps: 12, muscle_group: "Tríceps" },
  ],
  Abdômen: [
    { name: "Prancha", sets: 3, reps: 60, muscle_group: "Abdômen" },
    { name: "Abdominal Crunch", sets: 3, reps: 20, muscle_group: "Abdômen" },
    { name: "Elevação de Pernas", sets: 3, reps: 15, muscle_group: "Abdômen" },
    { name: "Russian Twist", sets: 3, reps: 20, muscle_group: "Abdômen" },
  ],
};

function findAlternatives(ex: Exercise): Exercise[] {
  // Try exact match, otherwise fallback to closest key
  const keys = Object.keys(swapPool);
  const matchKey = keys.find(k => ex.muscle_group?.toLowerCase().includes(k.toLowerCase())) ||
                   keys.find(k => k.toLowerCase().includes((ex.muscle_group || "").toLowerCase()));
  const pool = matchKey ? swapPool[matchKey] : Object.values(swapPool).flat();
  return pool
    .filter(p => p.name !== ex.name)
    .slice(0, 6)
    .map(p => ({ ...p, difficulty: ex.difficulty || "Médio" }));
}

export default function WorkoutPlan() {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(0);
  const [muscleFilter, setMuscleFilter] = useState<string>("Todos");
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(false);
  const [videoExercise, setVideoExercise] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ idx: number; ex: Exercise } | null>(null);
  // Local overrides for swapped exercises (per-day index)
  const [overrides, setOverrides] = useState<Record<string, Exercise>>({});
  // Day selection modal
  const [daysPickerOpen, setDaysPickerOpen] = useState(false);
  const [pickedDays, setPickedDays] = useState<Set<number>>(new Set([0, 2, 4])); // Seg, Qua, Sex padrão

  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { requirePro } = usePro();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const weekDates = useMemo(() => getWeekDates(), []);

  const suggestion = useMemo(() => {
    const lvl = profile?.activity_level || "";
    return activitySuggestions[lvl] ?? defaultSuggestion;
  }, [profile?.activity_level]);

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

  const completedDays = useMemo(() => {
    const set = new Set<number>();
    weekSessions?.forEach((dateStr) => {
      const idx = weekDates.indexOf(dateStr);
      if (idx !== -1) set.add(idx);
    });
    return set;
  }, [weekSessions, weekDates]);

  const weekComplete = useMemo(() => {
    for (let i = 0; i < 6; i++) if (!completedDays.has(i)) return false;
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
    mutationFn: async (selectedDayIdxs: number[]) => {
      const selected_days = selectedDayIdxs.map((i) => dayNamesPt[i]);
      const { data, error } = await supabase.functions.invoke("generate-workout-plan", {
        body: { selected_days },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as WorkoutPlanData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-plan"] });
      setOverrides({});
      toast.success("Plano de treino gerado!");
    },
    onError: (err: any) => toast.error(err.message || "Falha ao gerar plano"),
  });

  // Load preferred days from profile once
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_profile")
        .select("preferred_workout_days")
        .eq("user_id", user.id)
        .maybeSingle();
      const pref = (data as any)?.preferred_workout_days as number[] | null;
      if (Array.isArray(pref) && pref.length > 0) {
        setPickedDays(new Set(pref));
      }
    })();
  }, [user]);

  const openDaysPicker = () => {
    if (!requirePro("Gerar plano de treino")) return;
    // Pre-fill with currently active days from existing plan, if any
    if (planData?.days) {
      const current = new Set<number>();
      planData.days.forEach((d, i) => {
        if (d.exercises && d.exercises.length > 0) current.add(i);
      });
      if (current.size > 0) setPickedDays(current);
    }
    setDaysPickerOpen(true);
  };

  const confirmGenerate = async () => {
    const idxs = Array.from(pickedDays).sort((a, b) => a - b);
    if (idxs.length === 0) {
      toast.error("Escolha pelo menos 1 dia de treino");
      return;
    }
    setDaysPickerOpen(false);
    // Persist preference (fire-and-forget)
    if (user) {
      supabase
        .from("user_profile")
        .update({ preferred_workout_days: idxs } as any)
        .eq("user_id", user.id)
        .then(() => {});
    }
    generate.mutate(idxs);
  };

  useEffect(() => {
    if (searchParams.get("generate") === "1" && !generate.isPending) {
      openDaysPicker();
      searchParams.delete("generate");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSet = (key: string) => {
    setCompletedSets((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const swapExercise = (newEx: Exercise) => {
    if (!swapTarget) return;
    setOverrides(prev => ({ ...prev, [`${selectedDay}-${swapTarget.idx}`]: newEx }));
    setSwapTarget(null);
    toast.success("Exercício trocado");
  };

  const rawDay = planData?.days?.[selectedDay];
  const currentDay: DayPlan | undefined = useMemo(() => {
    if (!rawDay) return rawDay;
    return {
      ...rawDay,
      exercises: rawDay.exercises.map((ex, idx) => overrides[`${selectedDay}-${idx}`] ?? ex),
    };
  }, [rawDay, overrides, selectedDay]);

  const dayLocked = isDayCompleted(selectedDay);

  const muscleGroups = useMemo(() => {
    if (!currentDay) return ["Todos"];
    const set = new Set<string>();
    currentDay.exercises.forEach(ex => ex.muscle_group && set.add(ex.muscle_group));
    return ["Todos", ...Array.from(set)];
  }, [currentDay]);

  const filteredExercises = useMemo(() => {
    if (!currentDay) return [];
    if (muscleFilter === "Todos") return currentDay.exercises.map((ex, idx) => ({ ex, idx }));
    return currentDay.exercises
      .map((ex, idx) => ({ ex, idx }))
      .filter(({ ex }) => ex.muscle_group === muscleFilter);
  }, [currentDay, muscleFilter]);

  const totalExercises = currentDay?.exercises?.length ?? 0;
  const completedCount =
    currentDay?.exercises?.reduce((acc, ex, idx) => {
      const allDone = Array.from({ length: ex.sets }).every((__, s) => completedSets.has(`${idx}-${s}`));
      return acc + (allDone ? 1 : 0);
    }, 0) ?? 0;

  const finishWorkout = async () => {
    if (!user || !currentDay) return;
    const completed = currentDay.exercises.map((ex, idx) => ({
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

  return (
    <div className="mobile-shell px-4 lg:px-8 py-6 pb-32 lg:pb-12">
      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-20 lg:space-y-1">
      {/* Header com back + título + ação */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-[#141414] border border-white/[0.07] flex items-center justify-center active:scale-95 transition-all"
        >
          <ArrowLeft size={16} className="text-white/70" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Treino</p>
          <h1 className="text-base font-extrabold text-white leading-tight">
            {currentDay ? currentDay.focus : "Plano semanal"}
          </h1>
        </div>
        <ProGenButton
          variant="icon"
          onClick={openDaysPicker}
          loading={generate.isPending}
          requireProLabel="Gerar plano de treino"
          ariaLabel="Regenerar plano"
        />
      </div>

      {/* Week progress */}
      {planData && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-white/30 tracking-[0.15em]">Semana</span>
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-[#22c55e] rounded-full"
              animate={{ width: `${(completedDays.size / 6) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[10px] text-white/40 font-bold tabular-nums">{Math.min(completedDays.size, 6)}/6</span>
          {weekComplete && (
            <span className="text-[10px] text-[#22c55e] font-bold">✓</span>
          )}
        </div>
      )}

      {/* Day selector — círculos */}
      {planData && (
        <div className="flex justify-between gap-1 mb-5">
          {fullDays.map((d, i) => {
            const done = isDayCompleted(i);
            const active = selectedDay === i;
            return (
              <button
                key={i}
                onClick={() => { setSelectedDay(i); setIsActive(false); setCompletedSets(new Set()); setMuscleFilter("Todos"); }}
                className="flex flex-col items-center gap-1.5 flex-1 active:scale-95 transition-all"
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-white" : "text-white/30"}`}>
                  {d}
                </span>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                    active
                      ? "bg-[#22c55e] text-white shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
                      : done
                      ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                      : "bg-[#141414] border border-white/[0.07] text-white/40"
                  }`}
                >
                  {done && !active ? <CheckCircle2 size={14} /> : i + 1}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Muscle group filter pills */}
      {currentDay && currentDay.exercises.length > 0 && muscleGroups.length > 2 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
          {muscleGroups.map((g) => (
            <button
              key={g}
              onClick={() => setMuscleFilter(g)}
              className={`px-3.5 h-8 rounded-full text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                muscleFilter === g
                  ? "bg-white text-[#0a0a0a]"
                  : "bg-[#141414] border border-white/[0.07] text-white/50"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
          </div>
        </div>

        {/* RIGHT — exercise list (8/12 desktop) */}
        <div className="lg:col-span-8 space-y-0">

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

      {isLoading && !generate.isPending && !planData && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-[#141414] border border-white/[0.07] p-4 flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !generate.isPending && !planData && (
        <div className="rounded-2xl bg-[#141414] border border-white/[0.07] py-16 text-center">
          <p className="text-white/30 text-sm mb-5">Nenhum plano de treino ainda</p>
          <ProGenButton
            variant="primary"
            onClick={openDaysPicker}
            requireProLabel="Gerar plano de treino"
            label="Gerar seu plano"
            proLabel="Gerar seu plano • FitFlow+"
          />
        </div>
      )}

      {currentDay && (
        <>
          {dayLocked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl bg-[#22c55e]/[0.08] border border-[#22c55e]/20 px-4 py-3 flex items-center gap-3"
            >
              <CheckCircle2 size={18} className="text-[#22c55e] shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#22c55e]">Treino concluído!</p>
                <p className="text-xs text-white/30 mt-0.5">Descanse e volte amanhã 💪</p>
              </div>
            </motion.div>
          )}

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
              <span className="text-xs text-white/40 font-bold tabular-nums">{completedCount}/{totalExercises}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedDay}-${muscleFilter}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 mb-6 ${dayLocked ? "opacity-50 pointer-events-none select-none" : ""}`}
            >
              {currentDay.exercises.length === 0 ? (
                <div className="rounded-2xl bg-[#141414] border border-white/[0.07] py-10 text-center">
                  <p className="text-white/30 text-sm">Dia de descanso — recupere e recarregue 🧘</p>
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="rounded-2xl bg-[#141414] border border-white/[0.07] py-8 text-center">
                  <p className="text-white/30 text-xs">Nenhum exercício nesse grupo</p>
                </div>
              ) : (
                filteredExercises.map(({ ex, idx }) => {
                  const setsCompleted = Array.from({ length: ex.sets }).filter((_, s) => completedSets.has(`${idx}-${s}`)).length;
                  const allDone = setsCompleted === ex.sets;
                  const swapped = !!overrides[`${selectedDay}-${idx}`];

                  return (
                    <motion.div
                      key={`${idx}-${ex.name}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`rounded-2xl border transition-all duration-300 ${
                        dayLocked
                          ? "bg-[#22c55e]/[0.04] border-[#22c55e]/10"
                          : allDone && isActive
                          ? "bg-[#22c55e]/[0.06] border-[#22c55e]/20"
                          : "bg-[#141414] border-white/[0.07]"
                      } p-4`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            allDone && isActive ? "bg-[#22c55e]/15" : "bg-white/[0.03]"
                          }`}
                        >
                          {dayLocked || (allDone && isActive) ? (
                            <Check size={18} className="text-[#22c55e]" />
                          ) : (
                            <span className="text-base font-extrabold text-white/[0.12]">{idx + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-white truncate">{ex.name}</p>
                                {swapped && <Sparkles size={11} className="text-[#22c55e] shrink-0" />}
                              </div>
                              <p className="text-xs text-white/40 mt-0.5 tabular-nums">
                                {ex.sets} séries × {ex.reps} reps
                              </p>
                            </div>
                            <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider shrink-0">{ex.difficulty}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] uppercase font-bold text-white/50 tracking-wider">
                              {ex.muscle_group}
                            </span>
                            {!dayLocked && (
                              <>
                                <button
                                  onClick={() => setVideoExercise(ex.name)}
                                  className="flex items-center gap-1 text-white/30 hover:text-white/60 text-[10px] font-bold transition-colors"
                                >
                                  <PlayCircle size={11} />
                                  Vídeo
                                </button>
                                <button
                                  onClick={() => setSwapTarget({ idx, ex })}
                                  className="flex items-center gap-1 text-white/30 hover:text-[#22c55e] text-[10px] font-bold transition-colors"
                                >
                                  <Repeat size={11} />
                                  Trocar
                                </button>
                              </>
                            )}
                          </div>

                          {isActive && !dayLocked && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {Array.from({ length: ex.sets }).map((_, s) => {
                                const key = `${idx}-${s}`;
                                const done = completedSets.has(key);
                                return (
                                  <button
                                    key={s}
                                    onClick={() => toggleSet(key)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all active:scale-90 ${
                                      done ? "bg-[#22c55e] text-white" : "border border-white/[0.08] text-white/30"
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

          {currentDay.exercises.length > 0 && (
            dayLocked ? (
              <div className="w-full h-14 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center gap-2 text-white/30 text-sm font-bold">
                <Lock size={16} />
                Treino do dia concluído
              </div>
            ) : (
              <button
                onClick={() => (isActive ? finishWorkout() : setIsActive(true))}
                className={`w-full h-14 rounded-xl font-bold text-sm active:scale-[0.98] transition-all ${
                  isActive ? "bg-white text-[#0a0a0a]" : "bg-[#22c55e] text-white"
                }`}
              >
                {isActive ? "Finalizar Treino" : "Iniciar Treino"}
              </button>
            )
          )}
        </>
      )}
        </div>
      </div>

      {/* SWAP EXERCISE Sheet */}
      <AnimatePresence>
        {swapTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwapTarget(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] bg-[#141414] border-t border-white/[0.08] rounded-t-3xl p-5 z-50 modal-safe-bottom max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Trocar exercício</p>
                  <h3 className="text-base font-extrabold text-white mt-0.5">{swapTarget.ex.name}</h3>
                </div>
                <button
                  onClick={() => setSwapTarget(null)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>
              <p className="text-[11px] text-white/40 mb-3">
                Alternativas para <span className="text-[#22c55e] font-bold">{swapTarget.ex.muscle_group}</span>
              </p>
              <div className="space-y-2">
                {findAlternatives(swapTarget.ex).map((alt) => (
                  <button
                    key={alt.name}
                    onClick={() => swapExercise(alt)}
                    className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] active:scale-[0.98] hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{alt.name}</p>
                      <p className="text-[11px] text-white/40 mt-0.5 tabular-nums">{alt.sets} × {alt.reps} reps</p>
                    </div>
                    <Repeat size={14} className="text-[#22c55e] shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Days Picker Modal */}
      <AnimatePresence>
        {daysPickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDaysPickerOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="fixed left-0 right-0 bottom-0 mx-auto w-full max-w-[480px] bg-[#141414] border-t border-white/[0.08] rounded-t-3xl p-5 z-[70] modal-safe-bottom max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Personalize</p>
                  <h3 className="text-[15px] font-extrabold text-white mt-0.5 leading-tight">Em quais dias você quer treinar?</h3>
                </div>
                <button
                  onClick={() => setDaysPickerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0"
                  aria-label="Fechar"
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>
              <p className="text-[11px] text-white/40 mb-4">
                Os dias não escolhidos viram <span className="text-[#22c55e] font-bold">descanso</span>.
              </p>

              {/* Smart suggestion banner */}
              <button
                onClick={() => setPickedDays(new Set(suggestion.days))}
                className="w-full mb-5 p-3 rounded-xl bg-gradient-to-br from-[#22c55e]/[0.08] to-[#22c55e]/[0.02] border border-[#22c55e]/20 text-left active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <Sparkles size={12} className="text-[#22c55e] shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#22c55e] truncate">
                    Sugestão · {suggestion.label}
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-white/50 shrink-0">
                    {suggestion.days.length} {suggestion.days.length === 1 ? "dia" : "dias"}
                  </span>
                </div>
                <p className="text-[11px] text-white/60 leading-snug">{suggestion.reason}</p>
              </button>

              <div className="grid grid-cols-7 gap-2 mb-5">
                {fullDays.map((d, i) => {
                  const picked = pickedDays.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setPickedDays((prev) => {
                          const next = new Set(prev);
                          next.has(i) ? next.delete(i) : next.add(i);
                          return next;
                        });
                      }}
                      className="flex flex-col items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${picked ? "text-white" : "text-white/30"}`}>
                        {d}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                          picked
                            ? "bg-[#22c55e] text-white shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
                            : "bg-[#0a0a0a] border border-white/[0.07] text-white/40"
                        }`}
                      >
                        {picked ? <Check size={14} /> : i + 1}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[11px] text-white/40">
                  {pickedDays.size} {pickedDays.size === 1 ? "dia selecionado" : "dias selecionados"}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPickedDays(new Set([0, 2, 4]))}
                    className="text-[11px] font-bold text-white/50 hover:text-white/80"
                  >
                    Seg/Qua/Sex
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    onClick={() => setPickedDays(new Set([0, 1, 2, 3, 4]))}
                    className="text-[11px] font-bold text-white/50 hover:text-white/80"
                  >
                    Seg–Sex
                  </button>
                </div>
              </div>

              <button
                onClick={confirmGenerate}
                disabled={pickedDays.size === 0 || generate.isPending}
                className="w-full h-12 rounded-xl bg-[#22c55e] text-white text-sm font-bold active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {generate.isPending ? "Gerando..." : "Gerar plano"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {videoExercise && (
          <ExerciseVideoModal
            exerciseName={videoExercise}
            onClose={() => setVideoExercise(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Exercise video modal (resolves YouTube videoId via edge function) ---
function ExerciseVideoModal({ exerciseName, onClose }: { exerciseName: string; onClose: () => void }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setVideoId(null);

    const cacheKey = `yt-video:${exerciseName.toLowerCase().trim()}`;
    const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Try cache first
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { videoId: string; ts: number };
        if (parsed.videoId && Date.now() - parsed.ts < TTL_MS) {
          setVideoId(parsed.videoId);
          setLoading(false);
          return () => { cancelled = true; };
        }
      }
    } catch { /* ignore cache errors */ }

    setLoading(true);
    (async () => {
      try {
        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
        const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "";
        const url = `${supabaseUrl}/functions/v1/youtube-search?q=${encodeURIComponent(exerciseName + " exercício forma correta")}`;
        const res = await fetch(url, {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        });
        if (!res.ok) throw new Error("not-ok");
        const json = await res.json();
        if (cancelled) return;
        if (json.videoId) {
          setVideoId(json.videoId);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ videoId: json.videoId, ts: Date.now() }));
          } catch { /* quota — ignore */ }
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [exerciseName]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-[#141414] border border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <p className="text-sm font-bold text-white truncate">{exerciseName}</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="aspect-video w-full bg-black flex items-center justify-center">
          {loading && (
            <div className="w-7 h-7 border-2 border-white/20 border-t-[#22c55e] rounded-full animate-spin" />
          )}
          {!loading && videoId && (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={exerciseName}
            />
          )}
          {!loading && error && (
            <div className="text-center px-6 py-8">
              <p className="text-sm text-white/70 mb-3">Não conseguimos carregar o vídeo aqui.</p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " exercício forma correta")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#22c55e] text-black text-[13px] font-bold active:scale-95 transition-transform"
              >
                Buscar no YouTube
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
