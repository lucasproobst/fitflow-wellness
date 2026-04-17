import { useState, useRef, useEffect } from "react";
import { Camera, Plus, AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";

interface ScanItem {
  name: string;
  grams: number;
  calories: number;
}

interface ScanResult {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items?: ScanItem[];
  confidence?: "alta" | "media" | "baixa";
}

interface SavedScan extends ScanResult {
  id: string;
  created_at: string;
}

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<SavedScan[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("food_scans" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data as any);
      });
  }, [user]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter menos de 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImage(base64);
      scanFood(base64);
    };
    reader.readAsDataURL(file);
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
    setNotFound(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const scanFood = async (base64: string) => {
    setScanning(true);
    setResult(null);
    setNotFound(false);
    try {
      const { data, error } = await supabase.functions.invoke("scan-food", {
        body: { image_base64: base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data || !data.name || data.calories === 0) {
        setNotFound(true);
        return;
      }
      setResult(data as ScanResult);
    } catch (err: any) {
      setNotFound(true);
      toast.error(err.message || "Falha ao analisar alimento");
    } finally {
      setScanning(false);
    }
  };

  const addToDiary = async () => {
    if (!result || !user) return;
    try {
      const today = new Date().toISOString().split("T")[0];

      // Save scan to food_scans table
      const { data: savedScan } = await supabase
        .from("food_scans" as any)
        .insert({
          user_id: user.id,
          name: result.name,
          serving: result.serving,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
        } as any)
        .select()
        .single();

      if (savedScan) {
        setHistory(prev => [savedScan as any, ...prev].slice(0, 20));
      }

      // Also add to daily_log
      const { data: existing } = await supabase
        .from("daily_log")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      const currentMeals = (existing?.meals as any[]) || [];
      const newMeals = [...currentMeals, result];
      const newCalories = newMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);

      if (existing) {
        await supabase
          .from("daily_log")
          .update({ meals: newMeals as any, calories_total: newCalories })
          .eq("id", existing.id);
      } else {
        await supabase.from("daily_log").insert({
          user_id: user.id,
          date: today,
          meals: newMeals as any,
          calories_total: newCalories,
        });
      }

      toast.success(`${result.name} adicionado ao diário!`);
      setResult(null);
      setImage(null);
    } catch {
      toast.error("Falha ao salvar no diário");
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Scanner de Alimentos</h1>
        <p className="text-xs text-white/30 mb-6">Tire uma foto para obter informações nutricionais</p>
      </motion.div>

      {/* Visor */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="relative aspect-square max-w-sm mx-auto rounded-2xl bg-[#16181f] border border-white/[0.06] flex items-center justify-center overflow-hidden mb-4"
      >
        {image ? (
          <img src={image} alt="Alimento" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <Camera size={40} />
            <span className="text-xs font-medium tracking-wide">Escaneie um alimento</span>
          </div>
        )}
        {/* Corner brackets */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#22c55e]/60 rounded-tl-sm" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#22c55e]/60 rounded-tr-sm" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#22c55e]/60 rounded-bl-sm" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#22c55e]/60 rounded-br-sm" />
        {scanning && (
          <div className="absolute inset-0 bg-[#0f1117]/70 flex items-center justify-center backdrop-blur-sm">
            <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-3 max-w-sm mx-auto mb-6">
        <button
          onClick={() => cameraRef.current?.click()}
          className="flex-1 h-11 rounded-full bg-[#22c55e] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Camera size={16} />
          Tirar Foto
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 h-11 rounded-full bg-white/[0.06] border border-white/[0.08] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/[0.1]"
        >
          <Plus size={16} />
          Galeria
        </button>
      </div>

      {/* Hidden inputs — camera capture MUST be separate to preserve gesture chain */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {/* Alimento não encontrado */}
      <AnimatePresence>
        {notFound && !scanning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-2xl bg-[#16181f] border border-orange-500/10 p-5"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/[0.08] flex items-center justify-center mb-3">
                <AlertTriangle size={22} className="text-orange-400/80" />
              </div>
              <p className="text-sm font-bold text-white mb-1">Alimento não identificado</p>
              <p className="text-xs text-white/30 mb-4 max-w-[260px] leading-relaxed">
                Não conseguimos reconhecer o alimento na foto. Tente tirar outra foto com melhor iluminação e ângulo.
              </p>
              <button
                onClick={() => { resetScanner(); cameraRef.current?.click(); }}
                className="h-10 px-5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white text-xs font-bold flex items-center gap-2 active:scale-95 transition-all hover:bg-white/[0.1]"
              >
                <RotateCcw size={14} />
                Escanear Novamente
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-2xl bg-[#16181f] border border-white/[0.06] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-white">{result.name}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{result.serving}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-white tabular-nums">{result.calories}</span>
                <p className="text-[10px] text-[#6b7280] -mt-0.5">kcal</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: "PROTEÍNA", value: result.protein, color: "#3b82f6" },
                { label: "CARBOIDRATOS", value: result.carbs, color: "#22c55e" },
                { label: "GORDURA", value: result.fat, color: "#22c55e" },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">{m.label}</span>
                    <span className="text-[11px] font-semibold text-white/50 tabular-nums">{m.value}g</span>
                  </div>
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((m.value / 50) * 100, 100)}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addToDiary}
              className="w-full h-11 rounded-full bg-[#22c55e] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus size={14} />
              Adicionar ao Diário
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Histórico */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 mb-3">ESCANEAMENTOS SALVOS</h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#16181f] border border-white/[0.04] px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50">{item.name}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")} · P {item.protein}g · C {item.carbs}g · G {item.fat}g
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white/70 tabular-nums">{item.calories} kcal</span>
                  <button
                    onClick={async () => {
                      await supabase.from("food_scans" as any).delete().eq("id", item.id);
                      setHistory(prev => prev.filter(s => s.id !== item.id));
                    }}
                    className="text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
