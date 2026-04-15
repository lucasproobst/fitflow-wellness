import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown, TrendingUp, Upload, X, Camera, Share2 } from "lucide-react";
import { useWeightLogs, useLogWeight, useMeasurementLogs, useLogMeasurements, useStreak } from "@/lib/use-tracking";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MilestoneShareCard } from "@/components/MilestoneShareCard";

const timeRanges = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
];

type PhotoType = "before" | "after";

function useProgressPhotos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["progress-photos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const results: Record<PhotoType, string | null> = { before: null, after: null };
      for (const type of ["before", "after"] as PhotoType[]) {
        const { data } = await supabase.storage
          .from("progress-photos")
          .list(`${user!.id}/${type}`, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
        if (data && data.length > 0) {
          const { data: urlData } = await supabase.storage
            .from("progress-photos")
            .createSignedUrl(`${user!.id}/${type}/${data[0].name}`, 3600);
          results[type] = urlData?.signedUrl ?? null;
        }
      }
      return results;
    },
  });
}

function useUploadPhoto() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: PhotoType }) => {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user!.id}/${type}/${Date.now()}.${ext}`;

      const { data: existing } = await supabase.storage
        .from("progress-photos")
        .list(`${user!.id}/${type}`);
      if (existing && existing.length > 0) {
        await supabase.storage
          .from("progress-photos")
          .remove(existing.map(f => `${user!.id}/${type}/${f.name}`));
      }

      const { error } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-photos"] });
      toast.success("Foto enviada!");
    },
    onError: (err: any) => toast.error(err.message || "Falha no envio"),
  });
}

export default function Progress() {
  const [rangeIdx, setRangeIdx] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const range = timeRanges[rangeIdx];
  const { user } = useAuth();
  const { data: weightLogs } = useWeightLogs(range.days);
  const logWeight = useLogWeight();
  const { data: measurementLogs } = useMeasurementLogs();
  const logMeasurements = useLogMeasurements();
  const { data: photos } = useProgressPhotos();
  const uploadPhoto = useUploadPhoto();
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

  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (type: PhotoType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    uploadPhoto.mutate({ file, type });
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Progresso</h1>

      {/* Compartilhar Marco */}
      <button
        onClick={() => setShareOpen(true)}
        className="w-full mb-4 h-12 rounded-xl bg-gradient-to-r from-fitflow-primary to-fitflow-accent text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        <Share2 size={16} />
        Compartilhar Seu Marco
      </button>

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

      {/* Registrar peso */}
      <GlassCard className="mb-4">
        <h2 className="label-style text-[10px] mb-3">REGISTRAR PESO DE HOJE</h2>
        <div className="flex gap-2">
          <input
            type="number"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            placeholder="ex: 75,5"
            className="flex-1 h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:border-fitflow-primary transition-colors placeholder:text-foreground/20"
          />
          <button
            onClick={handleLogWeight}
            disabled={logWeight.isPending}
            className="px-5 h-11 rounded-xl bg-fitflow-primary text-white text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
          >
            {logWeight.isPending ? "..." : "Salvar"}
          </button>
        </div>
      </GlassCard>

      {/* Gráfico de Peso */}
      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Peso</h2>
            {diff !== 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <TrendIcon size={14} className="text-fitflow-primary" />
                <span className="text-xs text-fitflow-primary font-medium">
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
                  rangeIdx === i ? "bg-fitflow-primary text-white" : "border border-white/10 text-foreground/40"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: "rgba(15,17,23,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "rgba(255,255,255,0.5)" }} />
              <Line type="monotone" dataKey="weight" stroke="#0D9E75" strokeWidth={2} dot={{ fill: "#0D9E75", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-sm text-foreground/30 py-8">Registre seu peso para ver o progresso</p>
        )}
      </GlassCard>

      {/* Medidas */}
      <GlassCard className="mb-4">
        <h2 className="label-style text-[10px] mb-4">MEDIDAS CORPORAIS</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "Cintura", value: waist, set: setWaist },
            { label: "Peito", value: chest, set: setChest },
            { label: "Braços", value: arms, set: setArms },
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
        <button
          onClick={handleLogMeasurements}
          disabled={logMeasurements.isPending}
          className="w-full h-10 rounded-xl bg-fitflow-primary/10 text-fitflow-primary text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          Salvar Medidas
        </button>
      </GlassCard>

      {/* Fotos Antes/Depois */}
      <GlassCard className="mb-4">
        <h2 className="label-style text-[10px] mb-4">ANTES & DEPOIS</h2>
        <div className="grid grid-cols-2 gap-3">
          {(["before", "after"] as PhotoType[]).map(type => {
            const url = photos?.[type];
            const label = type === "before" ? "Antes" : "Depois";
            return (
              <div key={type} className="relative">
                <input
                  ref={type === "before" ? beforeRef : afterRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange(type)}
                />
                {url ? (
                  <div
                    className="aspect-[3/4] rounded-xl overflow-hidden relative group cursor-pointer"
                    onClick={() => (type === "before" ? beforeRef : afterRef).current?.click()}
                  >
                    <img src={url} alt={label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={24} className="text-white" />
                    </div>
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] uppercase tracking-wider font-semibold text-white">
                      {label}
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => (type === "before" ? beforeRef : afterRef).current?.click()}
                    className={`aspect-[3/4] rounded-xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-fitflow-primary/30 transition-colors ${
                      uploadPhoto.isPending ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <Upload size={20} className="text-foreground/20" />
                    <span className="text-xs text-foreground/30">{label}</span>
                    <span className="text-[10px] text-foreground/20">Toque para enviar</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
