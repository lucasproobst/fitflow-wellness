import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Share2, Download, X, MessageCircle, Instagram, Copy } from "lucide-react";
import { toast } from "sonner";
import type { AchievementDef } from "@/lib/use-achievements";

interface Props {
  achievement: AchievementDef;
  unlockedAt: string;
  userName?: string;
  open: boolean;
  onClose: () => void;
}

export function AchievementShareCard({ achievement, unlockedAt, userName, open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      toast.error("Falha ao gerar imagem");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitflow-${achievement.key}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Imagem salva!");
  };

  const shareText = `${achievement.icon} Conquista Desbloqueada!\n🏆 ${achievement.title}\n${achievement.description}\n\n💪 — FitFlow`;

  const handleNativeShare = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const file = new File([blob], `fitflow-${achievement.key}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `${achievement.icon} ${achievement.title} — FitFlow`,
          text: shareText,
          files: [file],
        });
      } catch (err: any) {
        if (err.name !== "AbortError") toast.error("Compartilhamento cancelado");
      }
    } else {
      setShowOptions(true);
    }
  };

  const handleWhatsApp = async () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    setShowOptions(false);
  };

  const handleInstagramStory = async () => {
    const blob = await generateImage();
    if (!blob) return;
    // Instagram doesn't have a direct web share API for stories,
    // so we download the image and guide the user
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitflow-story-${achievement.key}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Imagem salva! Abra o Instagram e adicione aos seus Stories 📸", { duration: 5000 });
    setShowOptions(false);
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(shareText);
    toast.success("Texto copiado!");
    setShowOptions(false);
  };

  if (!open) return null;

  const dateStr = new Date(unlockedAt).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xs animate-in zoom-in-95 fade-in duration-300" onClick={e => e.stopPropagation()}>
        {/* Shareable card */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0a1a14 0%, #0D2818 40%, #0D9E75 100%)",
            padding: "40px 28px",
          }}
        >
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/70">
                Conquista Desbloqueada
              </span>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 0 40px rgba(13,158,117,0.3)",
              }}
            >
              {achievement.icon}
            </div>
          </div>

          <div className="text-center mb-5">
            <p className="text-white text-xl font-bold mb-1">{achievement.title}</p>
            <p className="text-white/50 text-sm">{achievement.description}</p>
          </div>

          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Conquistado em</p>
            <p className="text-white text-sm font-semibold">{dateStr}</p>
            {userName && (
              <p className="text-white/30 text-[10px] mt-1">por {userName}</p>
            )}
          </div>

          <div className="text-center mt-5">
            <p className="text-white/15 text-[10px] tracking-wider">FITFLOW • SUA JORNADA DE BEM-ESTAR</p>
          </div>
        </div>

        {/* Share options panel */}
        {showOptions ? (
          <div className="mt-4 space-y-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <p className="text-foreground/50 text-[10px] uppercase tracking-wider text-center mb-3 font-semibold">
              Compartilhar via
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleWhatsApp}
                disabled={generating}
                className="h-20 rounded-xl bg-[#25D366]/15 border border-[#25D366]/20 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 hover:bg-[#25D366]/25"
              >
                <MessageCircle size={22} className="text-[#25D366]" />
                <span className="text-[10px] font-semibold text-[#25D366]">WhatsApp</span>
              </button>
              <button
                onClick={handleInstagramStory}
                disabled={generating}
                className="h-20 rounded-xl border border-[#E1306C]/20 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, rgba(131,58,180,0.15), rgba(225,48,108,0.15), rgba(253,170,29,0.15))" }}
              >
                <Instagram size={22} className="text-[#E1306C]" />
                <span className="text-[10px] font-semibold text-[#E1306C]">Stories</span>
              </button>
              <button
                onClick={handleCopyText}
                disabled={generating}
                className="h-20 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 hover:bg-white/10"
              >
                <Copy size={22} className="text-foreground/60" />
                <span className="text-[10px] font-semibold text-foreground/60">Copiar</span>
              </button>
            </div>
            <button
              onClick={() => setShowOptions(false)}
              className="w-full h-10 rounded-xl bg-white/5 text-foreground/40 text-xs font-medium active:scale-95 transition-all mt-2"
            >
              Voltar
            </button>
          </div>
        ) : (
          /* Action buttons */
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleNativeShare}
              disabled={generating}
              className="flex-1 h-12 rounded-xl bg-fitflow-primary text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <Share2 size={16} />
              Compartilhar
            </button>
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex-1 h-12 rounded-xl bg-white/10 text-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download size={16} />
              Salvar
            </button>
            <button
              onClick={onClose}
              className="h-12 w-12 rounded-xl bg-white/5 text-foreground/50 flex items-center justify-center active:scale-95 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
