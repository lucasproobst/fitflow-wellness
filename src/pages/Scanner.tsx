import { useState, useRef } from "react";
import { GlassCard } from "@/components/GlassCard";
import { MacroBar } from "@/components/MacroBar";
import { Camera, Upload, Plus } from "lucide-react";
import { toast } from "sonner";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      scanFood();
    };
    reader.readAsDataURL(file);
  };

  const scanFood = () => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      setResult({
        name: "Grilled Chicken Breast",
        serving: "1 piece (150g)",
        calories: 248,
        protein: 46,
        carbs: 0,
        fat: 5,
      });
      setScanning(false);
    }, 2000);
  };

  const addToDiary = () => {
    toast.success("Added to diary!");
    setResult(null);
    setImage(null);
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Food Scanner</h1>
      <p className="text-sm text-foreground/50 mb-6">Snap a photo to get nutrition info</p>

      {/* Viewfinder */}
      <div
        onClick={() => fileRef.current?.click()}
        className="relative aspect-square max-w-sm mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden mb-6"
      >
        {image ? (
          <img src={image} alt="Food" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-foreground/30">
            <Camera size={40} />
            <span className="text-sm font-medium">Tap to scan food</span>
          </div>
        )}
        {/* Corner brackets */}
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

      {/* Result */}
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
            <MacroBar label="Protein" current={result.protein} target={result.protein} />
            <MacroBar label="Carbs" current={result.carbs} target={Math.max(result.carbs, 1)} />
            <MacroBar label="Fat" current={result.fat} target={result.fat} />
          </div>
          <button
            onClick={addToDiary}
            className="w-full h-12 rounded-xl bg-fitflow-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={16} />
            Add to Diary
          </button>
        </GlassCard>
      )}

      {/* History placeholder */}
      <div>
        <h2 className="label-style text-[10px] mb-3">RECENT SCANS</h2>
        <div className="space-y-2">
          {["Banana · 105 cal", "Rice Bowl · 380 cal", "Protein Shake · 220 cal"].map((item, i) => (
            <GlassCard key={i} className="py-3">
              <p className="text-sm text-foreground/60">{item}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
