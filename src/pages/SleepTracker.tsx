import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Moon, AlertTriangle } from "lucide-react";
import { useSleepLogs, useLogSleep } from "@/lib/use-tracking";
import { toast } from "sonner";

export default function SleepTracker() {
  const [hours, setHours] = useState(7);
  const { data: sleepLogs } = useSleepLogs();
  const logSleep = useLogSleep();
  const lowSleep = hours < 6;

  const chartData = (sleepLogs || []).map(l => ({
    date: new Date(l.date).toLocaleDateString("pt-BR", { weekday: "short" }),
    hours: l.hours_slept,
  }));

  const handleLog = () => {
    logSleep.mutate(hours, {
      onSuccess: () => toast.success(`${hours}h de sono registradas`),
      onError: () => toast.error("Falha ao registrar sono"),
    });
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Sono & Recuperação</h1>

      {/* Slider de registro */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Moon size={20} className="text-foreground/50" />
          <span className="text-sm font-semibold text-foreground">Registrar Sono de Hoje</span>
        </div>
        <div className="space-y-3">
          <input
            type="range"
            min={3}
            max={12}
            step={0.5}
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
            className="w-full accent-fitflow-primary"
          />
          <div className="flex justify-between text-xs text-foreground/40">
            <span>3h</span>
            <span className="text-lg font-semibold text-foreground">{hours}h</span>
            <span>12h</span>
          </div>
          <button
            onClick={handleLog}
            disabled={logSleep.isPending}
            className="w-full h-11 rounded-xl bg-fitflow-primary text-white text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
          >
            {logSleep.isPending ? "Salvando..." : "Registrar Sono"}
          </button>
        </div>
      </GlassCard>

      {lowSleep && (
        <GlassCard className="mb-4 !border-yellow-500/20 !bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Dica de Recuperação</p>
              <p className="text-xs text-foreground/50 mt-1">
                Menos de 6 horas de sono pode afetar a recuperação. Considere um treino mais leve hoje — tente yoga ou uma caminhada.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="label-style text-[10px] mb-4">HISTÓRICO DE SONO</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="hours" stroke="#A8E063" strokeWidth={2} dot={{ fill: "#A8E063", r: 3 }} name="Sono (h)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-sm text-foreground/30 py-8">Comece a registrar o sono para ver seu histórico</p>
        )}
      </GlassCard>
    </div>
  );
}
