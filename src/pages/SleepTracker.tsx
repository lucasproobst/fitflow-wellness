import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Moon, AlertTriangle } from "lucide-react";

const sleepData = [
  { date: "Mon", hours: 7.5, weight: 82.0 },
  { date: "Tue", hours: 6.0, weight: 82.1 },
  { date: "Wed", hours: 5.5, weight: 82.3 },
  { date: "Thu", hours: 8.0, weight: 82.0 },
  { date: "Fri", hours: 7.0, weight: 81.8 },
  { date: "Sat", hours: 8.5, weight: 81.5 },
  { date: "Sun", hours: 7.0, weight: 81.3 },
];

export default function SleepTracker() {
  const [hours, setHours] = useState(7);
  const lowSleep = hours < 6;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Sleep & Recovery</h1>

      {/* Log slider */}
      <GlassCard className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Moon size={20} className="text-foreground/50" />
          <span className="text-sm font-semibold text-foreground">Log Tonight's Sleep</span>
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
        </div>
      </GlassCard>

      {/* Low sleep warning */}
      {lowSleep && (
        <GlassCard className="mb-4 !border-yellow-500/20 !bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Recovery Tip</p>
              <p className="text-xs text-foreground/50 mt-1">
                Less than 6 hours of sleep can affect recovery. Consider a lighter workout today — try yoga or a walk instead.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Chart */}
      <GlassCard>
        <h2 className="label-style text-[10px] mb-4">SLEEP VS WEIGHT</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sleepData}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="hours" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={30} />
            <YAxis yAxisId="weight" orientation="right" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
            />
            <Line yAxisId="hours" type="monotone" dataKey="hours" stroke="#A8E063" strokeWidth={2} dot={{ fill: "#A8E063", r: 3 }} name="Sleep (h)" />
            <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="#0D9E75" strokeWidth={2} dot={{ fill: "#0D9E75", r: 3 }} name="Weight (kg)" />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
