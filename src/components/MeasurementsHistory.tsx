import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import {
  useWeightLogs,
  useLogWeight,
  useMeasurementLogs,
  useLogMeasurements,
} from "@/lib/use-tracking";

type Metric = "weight" | "waist" | "chest" | "arms";

const METRIC_META: Record<Metric, { label: string; unit: string; color: string }> = {
  weight: { label: "Peso", unit: "kg", color: "#22c55e" },
  waist: { label: "Cintura", unit: "cm", color: "#3b82f6" },
  chest: { label: "Peito", unit: "cm", color: "#a855f7" },
  arms: { label: "Braços", unit: "cm", color: "#f59e0b" },
};

export function MeasurementsHistory() {
  const { data: weightLogs = [] } = useWeightLogs(180);
  const { data: measurements = [] } = useMeasurementLogs(180);
  const logWeight = useLogWeight();
  const logMeasurements = useLogMeasurements();

  const [metric, setMetric] = useState<Metric>("weight");
  const [open, setOpen] = useState(false);
  const [w, setW] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [arms, setArms] = useState("");

  // Merge all logs by date
  const merged = useMemo(() => {
    const map = new Map<string, any>();
    for (const l of weightLogs) {
      map.set(l.date, { date: l.date, weight: l.weight_kg });
    }
    for (const m of measurements) {
      const prev = map.get(m.date) || { date: m.date };
      map.set(m.date, {
        ...prev,
        waist: m.waist_cm ?? prev.waist,
        chest: m.chest_cm ?? prev.chest,
        arms: m.arms_cm ?? prev.arms,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [weightLogs, measurements]);

  const chartData = useMemo(
    () =>
      merged
        .filter(d => d[metric] != null)
        .map(d => ({
          date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          value: d[metric],
        })),
    [merged, metric],
  );

  // Trend = first vs last
  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const diff = last - first;
    return { diff, first, last };
  }, [chartData]);

  const meta = METRIC_META[metric];

  const handleSave = async () => {
    const wn = w ? parseFloat(w.replace(",", ".")) : null;
    const wsn = waist ? parseFloat(waist.replace(",", ".")) : null;
    const cn = chest ? parseFloat(chest.replace(",", ".")) : null;
    const an = arms ? parseFloat(arms.replace(",", ".")) : null;

    if (wn === null && wsn === null && cn === null && an === null) {
      return toast.error("Informe ao menos uma medida");
    }
    for (const [v, name, min, max] of [
      [wn, "Peso", 20, 400],
      [wsn, "Cintura", 30, 250],
      [cn, "Peito", 40, 250],
      [an, "Braços", 15, 100],
    ] as const) {
      if (v !== null && (isNaN(v) || v < min || v > max)) {
        return toast.error(`${name} fora do intervalo válido`);
      }
    }

    try {
      const ops: Promise<unknown>[] = [];
      if (wn !== null) ops.push(logWeight.mutateAsync(wn));
      const m: { waist_cm?: number; chest_cm?: number; arms_cm?: number } = {};
      if (wsn !== null) m.waist_cm = wsn;
      if (cn !== null) m.chest_cm = cn;
      if (an !== null) m.arms_cm = an;
      if (Object.keys(m).length) ops.push(logMeasurements.mutateAsync(m));
      await Promise.all(ops);
      toast.success("Medidas registradas!");
      setW(""); setWaist(""); setChest(""); setArms("");
      setOpen(false);
    } catch {
      toast.error("Falha ao salvar medidas");
    }
  };

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="label-style text-[10px]">HISTÓRICO DE MEDIDAS</h2>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-fitflow-primary hover:opacity-80 transition-opacity"
        >
          <Plus size={12} />
          Registrar
        </button>
      </div>

      {/* Metric tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto -mx-1 px-1 pb-1">
        {(Object.keys(METRIC_META) as Metric[]).map(k => {
          const active = k === metric;
          return (
            <button
              key={k}
              onClick={() => setMetric(k)}
              className={`shrink-0 px-3 h-8 rounded-full text-[11px] font-bold transition-all ${
                active
                  ? "bg-fitflow-primary text-white"
                  : "bg-white/[0.04] text-foreground/50 hover:text-foreground/80"
              }`}
            >
              {METRIC_META[k].label}
            </button>
          );
        })}
      </div>

      {chartData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-center px-6">
          <p className="text-xs text-foreground/40 leading-relaxed">
            Nenhum registro de {meta.label.toLowerCase()} ainda.
            <br />
            Toque em <span className="text-fitflow-primary font-semibold">Registrar</span> para começar.
          </p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-foreground/30">Atual</p>
              <p className="text-base font-bold text-foreground tabular-nums">
                {chartData[chartData.length - 1].value}
                <span className="text-[10px] text-foreground/40 ml-1 font-normal">{meta.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-foreground/30">Inicial</p>
              <p className="text-base font-bold text-foreground tabular-nums">
                {chartData[0].value}
                <span className="text-[10px] text-foreground/40 ml-1 font-normal">{meta.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-foreground/30">Variação</p>
              {trend ? (
                <p
                  className={`text-base font-bold tabular-nums flex items-center gap-1 ${
                    Math.abs(trend.diff) < 0.05
                      ? "text-foreground/60"
                      : trend.diff > 0
                        ? "text-orange-400"
                        : "text-fitflow-primary"
                  }`}
                >
                  {Math.abs(trend.diff) < 0.05 ? (
                    <Minus size={12} />
                  ) : trend.diff > 0 ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {trend.diff > 0 ? "+" : ""}
                  {trend.diff.toFixed(1)}
                  <span className="text-[10px] text-foreground/40 ml-0.5 font-normal">{meta.unit}</span>
                </p>
              ) : (
                <p className="text-base font-bold text-foreground/40">—</p>
              )}
            </div>
          </div>

          <div className="h-44 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="date"
                  stroke="#ffffff20"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#ffffff20"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "#16181f",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "#ffffff80" }}
                  formatter={(v: number) => [`${v} ${meta.unit}`, meta.label]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={meta.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: meta.color }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#16181f] border border-white/[0.08] p-5"
            >
              <p className="text-sm font-bold text-foreground mb-1">Registrar medidas</p>
              <p className="text-[11px] text-foreground/40 mb-5">
                Preencha somente o que quiser atualizar hoje
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Peso (kg)", value: w, set: setW, ph: "75.5" },
                  { label: "Cintura (cm)", value: waist, set: setWaist, ph: "82" },
                  { label: "Peito (cm)", value: chest, set: setChest, ph: "98" },
                  { label: "Braços (cm)", value: arms, set: setArms, ph: "35" },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/40">
                      {f.label}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      className="w-full mt-1 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground text-sm tabular-nums focus:outline-none focus:border-fitflow-primary/40"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] text-foreground/70 text-xs font-bold active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={logWeight.isPending || logMeasurements.isPending}
                  className="flex-1 h-10 rounded-full bg-fitflow-primary text-white text-xs font-bold active:scale-95 disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
