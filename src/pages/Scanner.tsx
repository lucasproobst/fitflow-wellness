import { useState, useRef } from "react";
import { GlassCard } from "@/components/GlassCard";
import { MacroBar } from "@/components/MacroBar";
import { Camera, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface ScanResult {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

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

  const scanFood = async (base64: string) => {
    setScanning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("scan-food", {
        body: { image_base64: base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as ScanResult);
    } catch (err: any) {
      toast.error(err.message || "Falha ao analisar alimento");
    } finally {
      setScanning(false);
    }
  };

  const addToDiary = async () => {
    if (!result || !user) return;
    try {
      const today = new Date().toISOString().split("T")[0];
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

      setHistory(prev => [result, ...prev].slice(0, 10));
      toast.success(`${result.name} adicionado ao diário!`);
      setResult(null);
      setImage(null);
    } catch {
      toast.error("Falha ao salvar no diário");
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Scanner de Alimentos</h1>
      <p className="text-sm text-foreground/50 mb-6">Tire uma foto para obter informações nutricionais</p>

      {/* Visor */}
      <div
        onClick={() => fileRef.current?.click()}
        className="relative aspect-square max-w-sm mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden mb-6"
      >
        {image ? (
          <img src={image} alt="Alimento" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-foreground/30">
            <Camera size={40} />
            <span className="text-sm font-medium">Toque para escanear</span>
          </div>
        )}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-fitflow-primary rounded-tl" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-fitflow-primary rounded-tr" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-fitflow-primary rounded-bl" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-fitflow-primary rounded-br" />
        {scanning && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-fitflow-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      {/* Resultado */}
      {result && (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{result.name}</p>
              <p className="text-xs text-foreground/40">{result.serving}</p>
            </div>
            <span className="text-lg font-semibold text-fitflow-accent">{result.calories} cal</span>
          </div>
          <div className="space-y-2 mb-4">
            <MacroBar label="Proteína" current={result.protein} target={result.protein} />
            <MacroBar label="Carboidratos" current={result.carbs} target={Math.max(result.carbs, 1)} />
            <MacroBar label="Gordura" current={result.fat} target={result.fat} />
          </div>
          <button
            onClick={addToDiary}
            className="w-full h-12 rounded-xl bg-fitflow-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={16} />
            Adicionar ao Diário
          </button>
        </GlassCard>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <div>
          <h2 className="label-style text-[10px] mb-3">ESCANEAMENTOS RECENTES</h2>
          <div className="space-y-2">
            {history.map((item, i) => (
              <GlassCard key={i} className="py-3 flex items-center justify-between">
                <p className="text-sm text-foreground/60">{item.name}</p>
                <span className="text-xs text-fitflow-accent">{item.calories} cal</span>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
