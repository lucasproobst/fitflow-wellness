import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Share2, Download, X, Flame, TrendingDown, Dumbbell, Moon } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { toast } from "sonner";

interface MilestoneData {
  weightLost: number;
  streakDays: number;
  workoutsCompleted: number;
  avgSleep: number;
  userName?: string;
}

interface Props {
  data: MilestoneData;
  open: boolean;
  onClose: () => void;
}

export function MilestoneShareCard({ data, open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      toast.error("Failed to generate image");
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
    a.download = "fitflow-milestone.png";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Image saved!");
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const file = new File([blob], "fitflow-milestone.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "My FitFlow Progress",
          text: `I've lost ${data.weightLost.toFixed(1)} kg and completed ${data.workoutsCompleted} workouts! 💪`,
          files: [file],
        });
      } catch (err: any) {
        if (err.name !== "AbortError") toast.error("Share cancelled");
      }
    } else {
      // Fallback: copy text to clipboard
      await navigator.clipboard.writeText(
        `🔥 FitFlow Milestone!\n📉 ${data.weightLost.toFixed(1)} kg lost\n💪 ${data.workoutsCompleted} workouts\n🔥 ${data.streakDays}-day streak\n😴 ${data.avgSleep.toFixed(1)}h avg sleep`
      );
      toast.success("Milestone text copied to clipboard!");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* The card that gets captured */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0a1a14 0%, #0D2818 30%, #0D9E75 100%)",
            padding: "32px 24px",
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 mb-3">
              <Flame size={12} className="text-[#A8E063]" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/70">FitFlow Milestone</span>
            </div>
            {data.userName && (
              <p className="text-white/50 text-xs mt-1">{data.userName}'s Journey</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatTile icon={<TrendingDown size={18} />} value={`${data.weightLost.toFixed(1)} kg`} label="Weight Lost" color="#0D9E75" />
            <StatTile icon={<Flame size={18} />} value={`${data.streakDays} days`} label="Streak" color="#A8E063" />
            <StatTile icon={<Dumbbell size={18} />} value={`${data.workoutsCompleted}`} label="Workouts" color="#0D9E75" />
            <StatTile icon={<Moon size={18} />} value={`${data.avgSleep.toFixed(1)}h`} label="Avg Sleep" color="#A8E063" />
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-white/20 text-[10px] tracking-wider">FITFLOW • YOUR WELLNESS JOURNEY</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex-1 h-12 rounded-xl bg-fitflow-primary text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Share2 size={16} />
            Share
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex-1 h-12 rounded-xl bg-white/10 text-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download size={16} />
            Save
          </button>
          <button
            onClick={onClose}
            className="h-12 w-12 rounded-xl bg-white/5 text-foreground/50 flex items-center justify-center active:scale-95 transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
      <p className="text-white text-lg font-bold leading-tight">{value}</p>
      <p className="text-white/40 text-[10px] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
