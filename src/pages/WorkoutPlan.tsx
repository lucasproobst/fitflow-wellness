import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { PlayCircle, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

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

function getWeekStart() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return monday.toISOString().split("T")[0];
}

export default function WorkoutPlan() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

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
    setCompletedSets(prev => {
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
      date: new Date().toISOString().split("T")[0],
      exercises_completed: completed as any,
    });
    toast.success("Treino concluído! 💪");
    setIsActive(false);
    setCompletedSets(new Set());
  };

  const currentDay = planData?.days?.[selectedDay];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Treino</h1>
          <p className="text-sm text-foreground/50 truncate">
            {currentDay ? `${currentDay.focus} · ${currentDay.exercises.length} exercícios` : "Seu plano semanal"}
          </p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-fitflow-primary text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={generate.isPending ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{generate.isPending ? "Gerando..." : planData ? "Regenerar" : "Gerar Plano"}</span>
          <span className="sm:hidden">{generate.isPending ? "..." : planData ? "Novo" : "Gerar"}</span>
        </button>
      </div>

      {/* Seletor de dia */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {shortDays.map((d, i) => (
          <button
            key={d}
            onClick={() => { setSelectedDay(i); setIsActive(false); setCompletedSets(new Set()); }}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              selectedDay === i ? "bg-fitflow-primary text-white" : "border border-white/10 text-foreground/50 hover:bg-white/5"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Carregando */}
      {(isLoading || generate.isPending) && !planData && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 flex gap-3">
              <div className="w-20 h-20 rounded-xl bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && !generate.isPending && !planData && (
        <GlassCard className="py-12 text-center">
          <p className="text-foreground/40 text-sm mb-4">Nenhum plano de treino ainda</p>
          <button
            onClick={() => generate.mutate()}
            className="px-6 py-3 rounded-xl bg-fitflow-primary text-white text-sm font-semibold active:scale-95 transition-all"
          >
            Gerar Seu Plano
          </button>
        </GlassCard>
      )}

      {/* Lista de exercícios */}
      {currentDay && (
        <>
          <div className="space-y-3 mb-6">
            {currentDay.exercises.length === 0 ? (
              <GlassCard className="py-8 text-center">
                <p className="text-foreground/40 text-sm">Dia de descanso — recupere e recarregue 🧘</p>
              </GlassCard>
            ) : (
              currentDay.exercises.map((ex, idx) => (
                <GlassCard key={idx}>
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <span className="text-2xl font-bold text-foreground/10">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                          <p className="text-xs text-foreground/40">{ex.sets} × {ex.reps} reps</p>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-fitflow-accent/10 text-fitflow-accent">
                          {ex.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] uppercase font-bold text-fitflow-primary">{ex.muscle_group}</span>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " exercício forma correta")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-fitflow-primary text-[10px] font-medium"
                        >
                          <PlayCircle size={12} />
                          Assistir
                        </a>
                      </div>
                      {isActive && (
                        <div className="flex gap-2 mt-3">
                          {Array.from({ length: ex.sets }).map((_, s) => {
                            const key = `${idx}-${s}`;
                            return (
                              <button
                                key={s}
                                onClick={() => toggleSet(key)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all active:scale-95 ${
                                  completedSets.has(key) ? "bg-fitflow-primary text-white" : "border border-white/10 text-foreground/40"
                                }`}
                              >
                                {completedSets.has(key) ? <Check size={14} /> : s + 1}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {currentDay.exercises.length > 0 && (
            <button
              onClick={() => isActive ? finishWorkout() : setIsActive(true)}
              className="w-full h-14 rounded-xl bg-fitflow-primary text-white font-semibold text-sm active:scale-95 transition-all"
            >
              {isActive ? "Finalizar Treino" : "Iniciar Treino"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
