import { useRef, useCallback } from "react";
import { Share2, Download, Clock, ChefHat, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface Recipe {
  meal_name: string;
  meal_type: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  tips: string;
}

export function RecipeShareCard({ recipe }: { recipe: Recipe }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    const { toPng } = await import("html-to-image");

    const el = cardRef.current;
    // Make visible for capture
    el.style.display = "block";
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "0";
    el.style.zIndex = "-1";

    // Wait for layout
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        width: 420,
        height: el.scrollHeight,
        style: {
          display: "block",
          background: "#0f1117",
          color: "#ffffff",
        },
      });
      el.style.display = "none";

      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error("Image generation failed:", err);
      el.style.display = "none";
      return null;
    }
  }, []);

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) {
      toast.error("Falha ao gerar imagem");
      return;
    }

    const file = new File([blob], `${recipe.meal_name.replace(/\s+/g, "-")}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: recipe.meal_name,
          text: `Receita: ${recipe.meal_name} — ${recipe.prep_time + recipe.cook_time} min`,
          files: [file],
        });
        return;
      } catch (e: any) {
        if (e.name === "AbortError") return;
      }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Imagem salva!");
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) {
      toast.error("Falha ao gerar imagem");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipe.meal_name.replace(/\s+/g, "-")}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Imagem salva!");
  };

  return (
    <>
      {/* Share buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleShare}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] active:scale-90 transition-all"
          title="Compartilhar"
        >
          <Share2 size={14} className="text-white/40" />
        </button>
        <button
          onClick={handleDownload}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] active:scale-90 transition-all"
          title="Baixar imagem"
        >
          <Download size={14} className="text-white/40" />
        </button>
      </div>

      {/* Hidden card for image capture — uses inline styles for reliable capture */}
      <div
        ref={cardRef}
        style={{
          display: "none",
          width: 420,
          background: "#0f1117",
          color: "#ffffff",
          padding: 24,
          borderRadius: 16,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#6b7280" }}>
            {recipe.meal_type}
          </span>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#ffffff" }}>{recipe.meal_name}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
              ⏱ Preparo: {recipe.prep_time} min
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
              👨‍🍳 Cozimento: {recipe.cook_time} min
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />

        {/* Ingredients */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#6b7280", marginBottom: 8 }}>
            Ingredientes
          </h3>
          {recipe.ingredients.map((ing, j) => (
            <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e", flexShrink: 0, marginTop: 6 }} />
              <span>{ing}</span>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#6b7280", marginBottom: 8 }}>
            Modo de preparo
          </h3>
          {recipe.instructions.map((step, j) => (
            <div key={j} style={{ display: "flex", gap: 10, fontSize: 12, marginBottom: 8 }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", flexShrink: 0,
              }}>
                {j + 1}
              </span>
              <span style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Tip */}
        {recipe.tips && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: 12,
            borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.1)",
          }}>
            <span style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }}>💡</span>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>{recipe.tips}</p>
          </div>
        )}

        {/* Branding */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em" }}>FITFLOW</span>
          <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 8 }}>fitnessnobolso.lovable.app</span>
        </div>
      </div>
    </>
  );
}
