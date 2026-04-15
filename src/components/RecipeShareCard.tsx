import { useRef } from "react";
import { toPng } from "html-to-image";
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

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    // Temporarily show the hidden card for capture
    cardRef.current.style.position = "fixed";
    cardRef.current.style.left = "-9999px";
    cardRef.current.style.display = "block";

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0f1117",
      });
      cardRef.current.style.display = "none";

      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      cardRef.current.style.display = "none";
      return null;
    }
  };

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

      {/* Hidden card for image capture */}
      <div
        ref={cardRef}
        style={{ display: "none", width: 420 }}
        className="bg-[#0f1117] text-white p-6 rounded-2xl"
      >
        {/* Header */}
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">
            {recipe.meal_type}
          </span>
          <h2 className="text-lg font-bold mt-1">{recipe.meal_name}</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
              <Clock size={11} />
              Preparo: {recipe.prep_time} min
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
              <ChefHat size={11} />
              Cozimento: {recipe.cook_time} min
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mb-4" />

        {/* Ingredients */}
        <div className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280] mb-2">
            Ingredientes
          </h3>
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, j) => (
              <li key={j} className="flex items-start gap-2 text-[12px] text-white/70">
                <span className="w-1 h-1 rounded-full bg-[#22c55e] shrink-0 mt-1.5" />
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6b7280] mb-2">
            Modo de preparo
          </h3>
          <ol className="space-y-2">
            {recipe.instructions.map((step, j) => (
              <li key={j} className="flex gap-2.5 text-[12px]">
                <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/40 shrink-0">
                  {j + 1}
                </span>
                <span className="text-white/70 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tip */}
        {recipe.tips && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#22c55e]/[0.06] border border-[#22c55e]/10">
            <Lightbulb size={13} className="text-[#22c55e] shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/60 leading-relaxed">{recipe.tips}</p>
          </div>
        )}

        {/* Branding */}
        <div className="mt-4 pt-3 border-t border-white/[0.04] text-center">
          <span className="text-[10px] font-bold text-[#22c55e] tracking-wider">FITFLOW</span>
          <span className="text-[10px] text-[#6b7280] ml-2">fitnessnobolso.lovable.app</span>
        </div>
      </div>
    </>
  );
}
