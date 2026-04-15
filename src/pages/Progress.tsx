import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Camera, TrendingDown, Upload } from "lucide-react";

const weightData = [
  { date: "Mar 1", weight: 85 },
  { date: "Mar 8", weight: 84.2 },
  { date: "Mar 15", weight: 83.8 },
  { date: "Mar 22", weight: 83.1 },
  { date: "Mar 29", weight: 82.5 },
  { date: "Apr 5", weight: 82.0 },
  { date: "Apr 12", weight: 81.3 },
];

const completionData = [
  { week: "W1", workouts: 80, calories: 90 },
  { week: "W2", workouts: 100, calories: 85 },
  { week: "W3", workouts: 60, calories: 95 },
  { week: "W4", workouts: 90, calories: 88 },
];

const timeRanges = ["30d", "90d", "180d"];

export default function Progress() {
  const [range, setRange] = useState("30d");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [arms, setArms] = useState("");

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Progress</h1>

      {/* Weight Chart */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Weight</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendingDown size={14} className="text-fitflow-primary" />
              <span className="text-xs text-fitflow-primary font-medium">-3.7 kg</span>
            </div>
          </div>
          <div className="flex gap-1">
            {timeRanges.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 ${
                  range === r ? "bg-fitflow-primary text-white" : "border border-white/10 text-foreground/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={weightData}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "rgba(255,255,255,0.5)" }}
            />
            <Line type="monotone" dataKey="weight" stroke="#0D9E75" strokeWidth={2} dot={{ fill: "#0D9E75", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Measurements */}
      <GlassCard className="mb-4">
        <h2 className="label-style text-[10px] mb-4">BODY MEASUREMENTS</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Waist", value: waist, set: setWaist },
            { label: "Chest", value: chest, set: setChest },
            { label: "Arms", value: arms, set: setArms },
          ].map(m => (
            <div key={m.label}>
              <label className="text-[10px] text-foreground/40 block mb-1">{m.label} (cm)</label>
              <input
                type="number"
                value={m.value}
                onChange={e => m.set(e.target.value)}
                placeholder="—"
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm text-center focus:outline-none focus:border-fitflow-primary transition-colors placeholder:text-foreground/20"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Before/After */}
      <GlassCard className="mb-4">
        <h2 className="label-style text-[10px] mb-4">BEFORE & AFTER</h2>
        <div className="grid grid-cols-2 gap-3">
          {["Before", "After"].map(label => (
            <div
              key={label}
              className="aspect-[3/4] rounded-xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-fitflow-primary/30 transition-colors"
            >
              <Upload size={20} className="text-foreground/20" />
              <span className="text-xs text-foreground/30">{label}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Completion Chart */}
      <GlassCard>
        <h2 className="label-style text-[10px] mb-4">WEEKLY COMPLETION</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={completionData}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
            />
            <Bar dataKey="workouts" fill="#0D9E75" radius={[4, 4, 0, 0]} name="Workouts %" />
            <Bar dataKey="calories" fill="#A8E063" radius={[4, 4, 0, 0]} name="Calories %" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
