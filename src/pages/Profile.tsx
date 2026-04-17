import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProfile, useUpdateProfile } from "@/lib/use-profile";
import { GlassCard } from "@/components/GlassCard";
import { NotificationSettings } from "@/components/NotificationSettings";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { MeasurementsHistory } from "@/components/MeasurementsHistory";
import { LogOut, Pencil, Check, X, Settings2 } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editInfoOpen, setEditInfoOpen] = useState(false);

  useEffect(() => {
    if (profile?.display_name) setNameValue(profile.display_name);
  }, [profile?.display_name]);

  const blockedWords = [
    "idiota", "burro", "merda", "porra", "caralho", "puta", "fdp",
    "otario", "otária", "cuzao", "cuzão", "viado", "arrombado",
    "desgraça", "desgraca", "babaca", "imbecil", "retardado",
    "fuck", "shit", "ass", "bitch", "dick", "damn", "bastard",
  ];

  const validateName = (name: string): string | null => {
    if (name.length < 3) return "O nome deve ter pelo menos 3 caracteres";
    if (name.length > 30) return "O nome deve ter no máximo 30 caracteres";
    if (!/^[a-zA-ZÀ-ÿ0-9 _.-]+$/.test(name)) return "O nome contém caracteres inválidos";
    const lower = name.toLowerCase();
    if (blockedWords.some(w => lower.includes(w))) return "O nome contém palavras inadequadas";
    return null;
  };

  const saveName = () => {
    const trimmed = nameValue.trim();
    if (!trimmed) return;
    const error = validateName(trimmed);
    if (error) {
      toast.error(error);
      return;
    }
    updateProfile.mutate({ display_name: trimmed } as any, {
      onSuccess: () => {
        toast.success("Nome atualizado!");
        setEditingName(false);
      },
    });
  };

  const goalLabels: Record<string, string> = {
    lose_weight: "Perder Peso",
    gain_muscle: "Ganhar Músculo",
    maintain: "Manter",
    improve_health: "Melhorar Saúde",
  };

  const activityLabels: Record<string, string> = {
    sedentary: "Sedentário",
    light: "Leve",
    moderate: "Moderado",
    active: "Ativo",
    very_active: "Muito Ativo",
  };

  const stats = [
    { label: "Objetivo", value: goalLabels[profile?.goal || ""] || profile?.goal || "—" },
    { label: "Altura", value: profile?.height_cm ? `${profile.height_cm} cm` : "—" },
    { label: "Peso", value: profile?.weight_kg ? `${profile.weight_kg} kg` : "—" },
    { label: "Meta", value: profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : "—" },
    { label: "Atividade", value: activityLabels[profile?.activity_level || ""] || profile?.activity_level || "—" },
    { label: "Idade", value: profile?.age?.toString() || "—" },
  ];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Perfil</h1>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fitflow-primary to-fitflow-accent flex items-center justify-center text-white text-xl font-semibold shrink-0">
          {(profile?.display_name || user?.email)?.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveName()}
                maxLength={30}
                className="h-9 flex-1 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-foreground outline-none focus:border-fitflow-primary"
                placeholder="Seu nome"
              />
              <button onClick={saveName} className="text-fitflow-primary hover:opacity-80"><Check size={18} /></button>
              <button onClick={() => setEditingName(false)} className="text-foreground/40 hover:opacity-80"><X size={18} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-foreground truncate">
                {profile?.display_name || user?.email}
              </p>
              <button onClick={() => { setNameValue(profile?.display_name || ""); setEditingName(true); }} className="text-foreground/40 hover:text-foreground/60">
                <Pencil size={14} />
              </button>
            </div>
          )}
          <p className="text-sm text-foreground/40">Membro</p>
        </div>
      </div>

      <GlassCard className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="label-style text-[10px]">SUAS INFORMAÇÕES</h2>
          <button
            onClick={() => setEditInfoOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-fitflow-primary hover:opacity-80 transition-opacity"
          >
            <Settings2 size={12} />
            Editar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-foreground/40 uppercase">{s.label}</p>
              <p className="text-sm font-semibold text-foreground capitalize">{s.value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {profile?.food_restrictions && (profile.food_restrictions as string[]).length > 0 && (
        <GlassCard className="mb-4">
          <h2 className="label-style text-[10px] mb-3">RESTRIÇÕES ALIMENTARES</h2>
          <div className="flex flex-wrap gap-2">
            {(profile.food_restrictions as string[]).map(r => (
              <span key={r} className="px-3 py-1 rounded-full bg-fitflow-primary/10 text-fitflow-primary text-xs font-medium">
                {r}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      <MeasurementsHistory />

      <NotificationSettings />

      <button
        onClick={signOut}
        className="w-full h-12 rounded-xl border border-destructive/30 text-destructive text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/5 active:scale-95 transition-all"
      >
        <LogOut size={16} />
        Sair
      </button>

      <EditProfileSheet
        open={editInfoOpen}
        onOpenChange={setEditInfoOpen}
        profile={profile ?? null}
      />
    </div>
  );
}
