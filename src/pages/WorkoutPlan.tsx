import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { PlayCircle, Check, RefreshCw } from "lucide-react";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  muscle: string;
  difficulty: string;
}

const sampleWorkout: Exercise[] = [
  { name: "Bench Press", sets: 4, reps: 10, muscle: "Chest", difficulty: "Intermediate" },
  { name: "Overhead Press", sets: 3, reps: 12, muscle: "Shoulders", difficulty: "Intermediate" },
  { name: "Barbell Row", sets: 4, reps: 10, muscle: "Back", difficulty: "Intermediate" },
  { name: "Bicep Curls", sets: 3, reps: 15, muscle: "Arms", difficulty: "Beginner" },
  { name: "Tricep Dips", sets: 3, reps: 12, muscle: "Arms", difficulty: "Intermediate" },
  { name: "Plank Hold", sets: 3, reps: 60, muscle: "Core", difficulty: "Beginner" },
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkoutPlan() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSet = (key: string) => {
    setCompletedSets(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Workout</h1>
          <p className="text-sm text-foreground/50">Upper Body · 6 exercises</p>
        </div>
        <button
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 2000); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-fitflow-primary text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          New Plan
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {weekDays.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDay(i)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              selectedDay === i ? "bg-fitflow-primary text-white" : "border border-white/10 text-foreground/50 hover:bg-white/5"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-3 mb-6">
        {sampleWorkout.map((ex, idx) => (
          <GlassCard key={idx}>
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-foreground/10">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                    <p className="text-xs text-foreground/40">{ex.sets} × {ex.reps} {ex.name === "Plank Hold" ? "sec" : "reps"}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-fitflow-accent/10 text-fitflow-accent">
                    {ex.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] uppercase font-bold text-fitflow-primary">{ex.muscle}</span>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " proper form tutorial")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-fitflow-primary text-[10px] font-medium"
                  >
                    <PlayCircle size={12} />
                    Watch
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
        ))}
      </div>

      <button
        onClick={() => setIsActive(!isActive)}
        className="w-full h-14 rounded-xl bg-fitflow-primary text-white font-semibold text-sm active:scale-95 transition-all"
      >
        {isActive ? "Finish Workout" : "Start Workout"}
      </button>
    </div>
  );
}
