import { useState, useRef, useEffect } from "react";
import { Camera, Plus, AlertTriangle, RotateCcw, Trash2, Pencil, Star, Minus } from "lucide-react";
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

interface FoodFavorite {
  id: string;
  name: string;
  serving: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  base_grams: number;
  created_at: string;
}

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [favorites, setFavorites] = useState<FoodFavorite[]>([]);

  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState("");
  const [mGrams, setMGrams] = useState("100");
  const [mKcal, setMKcal] = useState("");
  const [mProtein, setMProtein] = useState("");
  const [mCarbs, setMCarbs] = useState("");
  const [mFat, setMFat] = useState("");

  const [favOpen, setFavOpen] = useState(false);
  const [favPickGrams, setFavPickGrams] = useState<number>(100);
  const [pickedFav, setPickedFav] = useState<FoodFavorite | null>(null);

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
    supabase
      .from("food_favorites" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setFavorites(data as any);
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

  // ─── Manual entry ───
  const openManual = (preset?: Partial<ScanResult & { base_grams: number }>) => {
    setMName(preset?.name || "");
    setMGrams(String(preset?.base_grams || 100));
    setMKcal(preset?.calories ? String(preset.calories) : "");
    setMProtein(preset?.protein ? String(preset.protein) : "");
    setMCarbs(preset?.carbs ? String(preset.carbs) : "");
    setMFat(preset?.fat ? String(preset.fat) : "");
    setManualOpen(true);
  };

  const submitManual = () => {
    const name = mName.trim();
    const g = parseFloat(mGrams.replace(",", "."));
    const k = parseFloat(mKcal.replace(",", "."));
    if (!name) return toast.error("Informe o nome do alimento");
    if (!g || g <= 0) return toast.error("Informe a gramagem da porção");
    if (!k || k <= 0) return toast.error("Informe as kcal da porção");
    const r: ScanResult = {
      name,
      serving: `${Math.round(g)} g`,
      calories: Math.round(k),
      protein: parseFloat(mProtein.replace(",", ".")) || 0,
      carbs: parseFloat(mCarbs.replace(",", ".")) || 0,
      fat: parseFloat(mFat.replace(",", ".")) || 0,
      confidence: "alta",
    };
    setResult(r);
    setImage(null);
    setNotFound(false);
    setManualOpen(false);
  };

  // ─── Favorites ───
  const saveAsFavorite = async () => {
    if (!result || !user) return;
    // Extract grams from serving like "180 g"
    const gMatch = result.serving?.match(/(\d+(?:[.,]\d+)?)\s*g/i);
    const baseGrams = gMatch ? parseFloat(gMatch[1].replace(",", ".")) : 100;
    try {
      const { data, error } = await supabase
        .from("food_favorites" as any)
        .insert({
          user_id: user.id,
          name: result.name,
          serving: result.serving,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          base_grams: baseGrams,
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (data) setFavorites(prev => [data as any, ...prev]);
      toast.success("Salvo nos favoritos!");
    } catch {
      toast.error("Falha ao favoritar");
    }
  };

  const removeFavorite = async (id: string) => {
    await supabase.from("food_favorites" as any).delete().eq("id", id);
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const openFavPicker = (fav: FoodFavorite) => {
    setPickedFav(fav);
    setFavPickGrams(fav.base_grams || 100);
    setFavOpen(true);
  };

  const useFavorite = () => {
    if (!pickedFav) return;
    const f = favPickGrams / (pickedFav.base_grams || 100);
    setResult({
      name: pickedFav.name,
      serving: `${Math.round(favPickGrams)} g`,
      calories: Math.round(pickedFav.calories * f),
      protein: Math.round(pickedFav.protein * f * 10) / 10,
      carbs: Math.round(pickedFav.carbs * f * 10) / 10,
      fat: Math.round(pickedFav.fat * f * 10) / 10,
      confidence: "alta",
    });
    setImage(null);
    setNotFound(false);
    setFavOpen(false);
    setPickedFav(null);
  };

  const isResultFavorited =
    !!result &&
    favorites.some(
      f => f.name.toLowerCase() === result.name.toLowerCase() && f.serving === result.serving,
    );

  const addToDiary = async () => {
    if (!result || !user) return;
    try {
      const today = new Date().toISOString().split("T")[0];

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
        <p className="text-xs text-white/30 mb-6">Tire uma foto, digite manualmente ou use seus favoritos</p>
      </motion.div>

      {/* Visor */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="relative aspect-square max-w-sm mx-auto rounded-2xl bg-[#141414] border border-white/[0.07] flex items-center justify-center overflow-hidden mb-4"
      >
        {image ? (
          <img src={image} alt="Alimento" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <Camera size={40} />
            <span className="text-xs font-medium tracking-wide">Escaneie um alimento</span>
          </div>
        )}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#22c55e]/60 rounded-tl-sm" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#22c55e]/60 rounded-tr-sm" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#22c55e]/60 rounded-bl-sm" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#22c55e]/60 rounded-br-sm" />
        {scanning && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
            <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-3 max-w-sm mx-auto mb-3">
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
      <div className="max-w-sm mx-auto mb-6">
        <button
          onClick={() => openManual()}
          className="w-full h-10 rounded-full bg-transparent border border-white/[0.08] text-white/70 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-white/[0.04] hover:text-white"
        >
          <Pencil size={14} />
          Digitar manualmente (sem foto)
        </button>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {/* Alimento não encontrado */}
      <AnimatePresence>
        {notFound && !scanning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-2xl bg-[#141414] border border-orange-500/15 p-5"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/[0.08] flex items-center justify-center mb-3">
                <AlertTriangle size={22} className="text-orange-400/80" />
              </div>
              <p className="text-sm font-bold text-white mb-1">Alimento não identificado</p>
              <p className="text-xs text-white/30 mb-4 max-w-[260px] leading-relaxed">
                Não conseguimos reconhecer o alimento na foto. Tente outra foto ou digite manualmente.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { resetScanner(); cameraRef.current?.click(); }}
                  className="h-10 px-4 rounded-full bg-white/[0.06] border border-white/[0.08] text-white text-xs font-bold flex items-center gap-2 active:scale-95 transition-all hover:bg-white/[0.1]"
                >
                  <RotateCcw size={14} />
                  Reescanear
                </button>
                <button
                  onClick={() => { resetScanner(); openManual(); }}
                  className="h-10 px-4 rounded-full bg-[#22c55e] text-white text-xs font-bold flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Pencil size={14} />
                  Digitar
                </button>
              </div>
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
            className="mb-4 rounded-2xl bg-[#141414] border border-white/[0.07] p-5"
          >
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white truncate">{result.name}</p>
                  <button
                    onClick={saveAsFavorite}
                    disabled={isResultFavorited}
                    title={isResultFavorited ? "Já está nos favoritos" : "Salvar nos favoritos"}
                    className={`shrink-0 p-1 rounded-full transition-all active:scale-90 ${
                      isResultFavorited
                        ? "text-yellow-400"
                        : "text-white/30 hover:text-yellow-400"
                    }`}
                  >
                    <Star size={15} fill={isResultFavorited ? "currentColor" : "none"} />
                  </button>
                </div>
                <p className="text-[11px] text-white/30 mt-0.5">{result.serving}</p>
                {result.confidence && (
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] ${
                      result.confidence === "alta"
                        ? "bg-[#22c55e]/10 text-[#22c55e]"
                        : result.confidence === "media"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-orange-500/10 text-orange-400"
                    }`}
                  >
                    Confiança {result.confidence}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-extrabold text-white tabular-nums">{result.calories}</span>
                <p className="text-[10px] text-[#6b7280] -mt-0.5">kcal</p>
              </div>
            </div>

            {/* Itens identificados */}
            {result.items && result.items.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2">
                  Itens identificados
                </p>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] divide-y divide-white/[0.04]">
                  {result.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white/80 truncate capitalize">{it.name}</p>
                        <p className="text-[10px] text-white/30 tabular-nums">{Math.round(it.grams)} g</p>
                      </div>
                      <span className="text-[11px] font-bold text-white/60 tabular-nums shrink-0">
                        {Math.round(it.calories)} kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* Favoritos */}
      {favorites.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="mb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <Star size={11} className="text-yellow-400" fill="currentColor" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Favoritos</h2>
          </div>
          <div className="space-y-2">
            {favorites.map(fav => (
              <div key={fav.id} className="rounded-xl bg-[#141414] border border-white/[0.07] px-4 py-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => openFavPicker(fav)}
                  className="flex-1 min-w-0 text-left active:opacity-60 transition-opacity"
                >
                  <p className="text-xs font-semibold text-white/80 truncate">{fav.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 tabular-nums">
                    {fav.calories} kcal · {fav.base_grams}g · P {fav.protein}g · C {fav.carbs}g · G {fav.fat}g
                  </p>
                </button>
                <button
                  onClick={() => removeFavorite(fav.id)}
                  className="text-white/20 hover:text-red-400 transition-colors shrink-0"
                  title="Remover dos favoritos"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 mb-3">ESCANEAMENTOS SALVOS</h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#141414] border border-white/[0.07] px-4 py-3 flex items-center justify-between">
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

      {/* Modal: Manual entry */}
      <AnimatePresence>
        {manualOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setManualOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#141414] border border-white/[0.08] p-5 max-h-[90vh] overflow-y-auto"
            >
              <p className="text-sm font-bold text-white mb-1">Adicionar manualmente</p>
              <p className="text-[11px] text-white/30 mb-5">Após adicionar, use a estrela para salvar nos favoritos</p>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Alimento</label>
                  <input
                    type="text"
                    value={mName}
                    onChange={e => setMName(e.target.value)}
                    placeholder="Ex: Arroz integral cozido"
                    maxLength={80}
                    className="w-full mt-1 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Porção (g)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={mGrams}
                      onChange={e => setMGrams(e.target.value)}
                      placeholder="100"
                      className="w-full mt-1 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm tabular-nums focus:outline-none focus:border-[#22c55e]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Calorias</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={mKcal}
                      onChange={e => setMKcal(e.target.value)}
                      placeholder="130"
                      className="w-full mt-1 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm tabular-nums focus:outline-none focus:border-[#22c55e]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Proteína", v: mProtein, set: setMProtein },
                    { label: "Carb.", v: mCarbs, set: setMCarbs },
                    { label: "Gordura", v: mFat, set: setMFat },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">{f.label} (g)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={f.v}
                        onChange={e => f.set(e.target.value)}
                        placeholder="0"
                        className="w-full mt-1 h-9 px-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-xs tabular-nums focus:outline-none focus:border-[#22c55e]/40"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setManualOpen(false)}
                  className="flex-1 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/70 text-xs font-bold active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitManual}
                  className="flex-1 h-10 rounded-full bg-[#22c55e] text-white text-xs font-bold active:scale-95"
                >
                  Adicionar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Use favorite (ajustar gramagem) */}
      <AnimatePresence>
        {favOpen && pickedFav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setFavOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#141414] border border-white/[0.08] p-5"
            >
              <p className="text-sm font-bold text-white mb-1 truncate">{pickedFav.name}</p>
              <p className="text-[11px] text-white/30 mb-5">
                Base: {pickedFav.base_grams}g = {pickedFav.calories} kcal
              </p>

              <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                Quantos gramas hoje?
              </label>
              <div className="flex items-center gap-2 mt-2 mb-4">
                <button
                  onClick={() => setFavPickGrams(Math.max(5, favPickGrams - 10))}
                  className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/70 flex items-center justify-center active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={favPickGrams}
                  onChange={e => setFavPickGrams(Math.max(1, Math.min(2000, parseInt(e.target.value) || 0)))}
                  className="w-20 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm font-bold text-center tabular-nums focus:outline-none focus:border-[#22c55e]/40"
                />
                <span className="text-xs text-white/40 font-semibold">g</span>
                <input
                  type="range"
                  min={5}
                  max={Math.max(500, (pickedFav.base_grams || 100) * 3)}
                  step={5}
                  value={favPickGrams}
                  onChange={e => setFavPickGrams(parseInt(e.target.value))}
                  className="flex-1 accent-[#22c55e]"
                />
                <button
                  onClick={() => setFavPickGrams(Math.min(2000, favPickGrams + 10))}
                  className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/70 flex items-center justify-center active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="rounded-xl bg-[#22c55e]/[0.06] border border-[#22c55e]/20 px-3 py-2.5 flex items-center justify-between mb-4">
                <span className="text-[11px] text-white/60">Total estimado</span>
                <span className="text-sm font-extrabold text-[#22c55e] tabular-nums">
                  {Math.round((pickedFav.calories * favPickGrams) / (pickedFav.base_grams || 100))} kcal
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFavOpen(false)}
                  className="flex-1 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/70 text-xs font-bold active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={useFavorite}
                  className="flex-1 h-10 rounded-full bg-[#22c55e] text-white text-xs font-bold active:scale-95"
                >
                  Usar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
