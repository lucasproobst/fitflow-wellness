import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Moon, AlertTriangle } from "lucide-react";
import { useSleepLogs, useLogSleep } from "@/lib/use-tracking";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SleepTracker() {
  const [hours, setHours] = useState(7);
  const { data: sleepLogs } = useSleepLogs();
  const logSleep = useLogSleep();
  const lowSleep = hours < 6;

  const chartData = (sleepLogs || []).map(l => ({
    date: new Date(l.date).toLocaleDateString("pt-BR", { weekday: "short" }),
    hours: l.hours_slept,
  }));

  const avg = chartData.length > 0
    ? (chartData.reduce((s, d) => s + d.hours, 0) / chartData.length).toFixed(1)
    : null;

  const handleLog = () => {
    logSleep.mutate(hours, {
      onSuccess: () => toast.success(`${hours}h de sono registradas`),
      onError: () => toast.error("Falha ao registrar sono"),
    });
  };

  const fadeIn = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay },
  });

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Sono & Recuperação</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {avg ? `Média: ${avg}h por noite` : "Registre seu sono para acompanhar"}
        </p>
      </div>

      {/* Slider de registro */}
      <motion.div {...fadeIn(0)} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
            <Moon size={18} className="text-white/30" />
          </div>
          <span className="text-sm font-semibold text-white">Registrar Sono de Hoje</span>
        </div>

        <div className="space-y-4">
          {/* Hours display */}
          <div className="text-center">
            <span className="text-4xl font-bold text-white tabular-nums">{hours}</span>
            <span className="text-lg text-white/30 ml-1">h</span>
          </div>

          {/* Slider */}
          <div className="relative px-1">
            <input
              type="range"
              min={3}
              max={12}
              step={0.5}
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/[0.06] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22c55e] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,197,94,0.3)]"
            />
            <div className="flex justify-between text-[10px] text-white/20 mt-1">
              <span>3h</span>
              <span>12h</span>
            </div>
          </div>

          {/* Quality indicators */}
          <div className="flex justify-center gap-2">
            {[
              { min: 3, max: 5, label: "Pouco", color: "bg-red-500/20 text-red-400" },
              { min: 5.5, max: 6.5, label: "Regular", color: "bg-yellow-500/20 text-yellow-400" },
              { min: 7, max: 9, label: "Bom", color: "bg-[#22c55e]/20 text-[#22c55e]" },
              { min: 9.5, max: 12, label: "Demais", color: "bg-blue-500/20 text-blue-400" },
            ].map(q => {
              const active = hours >= q.min && hours <= q.max;
              return (
                <span
                  key={q.label}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                    active ? q.color : "text-white/15"
                  }`}
                >
                  {q.label}
                </span>
              );
            })}
          </div>

          <button
            onClick={handleLog}
            disabled={logSleep.isPending}
            className="w-full h-12 rounded-xl bg-[#22c55e] text-white text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {logSleep.isPending ? "Salvando..." : "Registrar Sono"}
          </button>
        </div>
      </motion.div>

      {/* Low sleep warning */}
      {lowSleep && (
        <motion.div {...fadeIn(0.05)} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-yellow-400/70" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Dica de Recuperação</p>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">
                Menos de 6 horas de sono pode afetar a recuperação. Considere um treino mais leve hoje — tente yoga ou uma caminhada.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Chart */}
      <motion.div {...fadeIn(0.1)} className="rounded-2xl bg-[#16181f] border border-white/[0.06] p-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-4">HISTÓRICO DE SONO</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "#16181f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 12, color: "#fff" }}
                labelStyle={{ color: "rgba(255,255,255,0.4)" }}
              />
              <Line type="monotone" dataKey="hours" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} name="Sono (h)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-sm text-white/20 py-8">Comece a registrar o sono para ver seu histórico</p>
        )}
      </motion.div>
    </div>
  );
}
