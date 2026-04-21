import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateProfile, type UserProfile } from "@/lib/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Target, Dumbbell, Scale, Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";

const goals = [
  { id: "lose_weight", label: "Perder Peso", icon: Scale },
  { id: "gain_muscle", label: "Ganhar Músculo", icon: Dumbbell },
  { id: "maintain", label: "Manter", icon: Target },
  { id: "improve_health", label: "Melhorar Saúde", icon: Heart },
];

const foodCategories: Record<string, string[]> = {
  Vegetais: ["Brócolis", "Espinafre", "Alface", "Tomate", "Cenoura", "Pepino", "Cebola", "Pimentão"],
  Proteínas: ["Frango", "Carne Bovina", "Porco", "Peixe", "Ovos", "Tofu", "Atum", "Peru"],
  Grãos: ["Arroz", "Pão", "Macarrão", "Aveia", "Quinoa", "Milho"],
  Frutas: ["Banana", "Maçã", "Laranja", "Frutas Vermelhas", "Manga", "Uva"],
  Laticínios: ["Leite", "Iogurte", "Queijo", "Manteiga"],
  Leguminosas: ["Feijão", "Lentilha", "Grão-de-bico", "Amendoim"],
};

const activityLevels = [
  { id: "sedentary", label: "Sedentário" },
  { id: "light", label: "Leve" },
  { id: "moderate", label: "Moderado" },
  { id: "active", label: "Ativo" },
  { id: "very_active", label: "Muito Ativo" },
];

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
}

export function EditProfileSheet({ open, onOpenChange, profile }: EditProfileSheetProps) {
  const updateProfile = useUpdateProfile();
  const qc = useQueryClient();
  const [goal, setGoal] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setGoal(profile.goal ?? "");
    setRestrictions(Array.isArray(profile.food_restrictions) ? profile.food_restrictions : []);
    setHeight(profile.height_cm?.toString() ?? "");
    setWeight(profile.weight_kg?.toString() ?? "");
    setAge(profile.age?.toString() ?? "");
    setActivity(profile.activity_level ?? "");
    setTargetWeight(profile.target_weight_kg?.toString() ?? "");
  }, [open, profile]);

  const toggleRestriction = (item: string) => {
    setRestrictions(prev => (prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]));
  };

  const canSave = goal && height && weight && age && activity && targetWeight;

  /** Detect changes that meaningfully affect the AI-generated plans */
  const planAffectingChanged = (): boolean => {
    if (!profile) return false;
    const prev = Array.isArray(profile.food_restrictions) ? [...profile.food_restrictions] : [];
    const restrictionsChanged =
      JSON.stringify(prev.sort()) !== JSON.stringify([...restrictions].sort());
    return (
      profile.goal !== goal ||
      profile.activity_level !== activity ||
      Number(profile.weight_kg) !== Number(weight) ||
      Number(profile.target_weight_kg) !== Number(targetWeight) ||
      restrictionsChanged
    );
  };

  // Must mirror activitySuggestions in src/pages/WorkoutPlan.tsx (0=Mon … 6=Sun)
  const activityFrequency: Record<string, { days: number; label: string; suggestedDays: number[] }> = {
    sedentary:   { days: 2, label: "Sedentário",  suggestedDays: [0, 3] },
    light:       { days: 3, label: "Leve",        suggestedDays: [0, 2, 4] },
    moderate:    { days: 4, label: "Moderado",    suggestedDays: [0, 1, 3, 4] },
    active:      { days: 5, label: "Ativo",       suggestedDays: [0, 1, 2, 4, 5] },
    very_active: { days: 6, label: "Muito Ativo", suggestedDays: [0, 1, 2, 3, 4, 5] },
  };

  const handleSave = async () => {
    if (!canSave) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      const shouldOfferRegen = planAffectingChanged();
      const activityChanged = profile?.activity_level !== activity;
      await updateProfile.mutateAsync({
        goal,
        food_restrictions: restrictions as any,
        height_cm: Number(height),
        weight_kg: Number(weight),
        age: Number(age),
        activity_level: activity,
        target_weight_kg: Number(targetWeight),
      } as any);
      toast.success("Informações atualizadas!");
      onOpenChange(false);

      if (activityChanged && activityFrequency[activity]) {
        const { days, label } = activityFrequency[activity];
        setTimeout(() => {
          toast(`Nível alterado para ${label}`, {
            description: `Frequência ideal: ${days} dias de treino por semana. Quer regenerar seu plano?`,
            duration: 8000,
            action: {
              label: "Regenerar",
              onClick: () => handleRegenerate(),
            },
          });
        }, 300);
      } else if (shouldOfferRegen) {
        setTimeout(() => setConfirmRegen(true), 250);
      }
    } catch {
      toast.error("Falha ao atualizar perfil");
    }
  };

  const handleRegenerate = async () => {
    setConfirmRegen(false);
    setRegenerating(true);
    const t = toast.loading("Gerando novos planos com seus dados atualizados...");
    try {
      const [meal, workout] = await Promise.all([
        supabase.functions.invoke("generate-meal-plan", { body: {} }),
        supabase.functions.invoke("generate-workout-plan", { body: {} }),
      ]);
      if (meal.error || workout.error) throw meal.error || workout.error;
      qc.invalidateQueries({ queryKey: ["meal-plan"] });
      qc.invalidateQueries({ queryKey: ["workout-plan"] });
      toast.success("Planos atualizados!", { id: t });
    } catch (e) {
      console.error(e);
      toast.error("Falha ao regenerar os planos", { id: t });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="bg-[#0f1117] border-white/[0.06] h-[92vh] p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/[0.04]">
            <SheetTitle className="text-white text-lg font-bold text-left">Editar informações</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-6 space-y-8">
              {/* Goal */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">Objetivo</h3>
                <div className="grid grid-cols-2 gap-2">
                  {goals.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`rounded-xl bg-[#16181f] border p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                        goal === g.id ? "border-[#22c55e]/40 bg-[#22c55e]/[0.06]" : "border-white/[0.06]"
                      }`}
                    >
                      <g.icon size={20} className={goal === g.id ? "text-[#22c55e]" : "text-white/25"} />
                      <span className="text-[11px] font-bold text-white/70">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Numbers */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Medidas</h3>
                {[
                  { label: "Altura (cm)", value: height, set: setHeight },
                  { label: "Peso (kg)", value: weight, set: setWeight },
                  { label: "Idade", value: age, set: setAge },
                  { label: "Peso Alvo (kg)", value: targetWeight, set: setTargetWeight },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 mb-1.5 block">
                      {f.label}
                    </label>
                    <input
                      type="number"
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-[#16181f] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-white/[0.15] transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 mb-2 block">
                    Nível de Atividade
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activityLevels.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setActivity(a.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                          activity === a.id
                            ? "bg-[#22c55e] text-white"
                            : "border border-white/[0.08] text-white/40"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Restrictions */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                  Restrições alimentares
                </h3>
                <p className="text-[11px] text-white/30 mb-4">Alimentos que você NÃO come</p>
                <div className="space-y-5">
                  {Object.entries(foodCategories).map(([cat, items]) => (
                    <div key={cat}>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 mb-2">{cat}</h4>
                      <div className="flex flex-wrap gap-2">
                        {items.map(item => (
                          <button
                            key={item}
                            onClick={() => toggleRestriction(item)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                              restrictions.includes(item)
                                ? "bg-[#22c55e] text-white"
                                : "border border-white/[0.08] text-white/40"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/[0.04] bg-[#0f1117]">
            <button
              onClick={handleSave}
              disabled={!canSave || updateProfile.isPending}
              className="w-full h-12 rounded-xl bg-[#22c55e] text-white font-bold text-xs disabled:opacity-30 active:scale-95 transition-all"
            >
              {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <AlertDialogContent className="bg-[#16181f] border-white/[0.06]">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-full bg-[#22c55e]/10 flex items-center justify-center mb-2">
              <Sparkles size={18} className="text-[#22c55e]" />
            </div>
            <AlertDialogTitle className="text-white">Atualizar seus planos?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Você mudou dados que afetam sua dieta e treino. Quer regenerar os planos da semana com base nas novas informações?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.04] border-white/[0.06] text-white/70 hover:bg-white/[0.08] hover:text-white">
              Agora não
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              disabled={regenerating}
              className="bg-[#22c55e] text-white hover:bg-[#22c55e]/90"
            >
              {regenerating ? "Gerando..." : "Regenerar planos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
