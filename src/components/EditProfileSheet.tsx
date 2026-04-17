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
import { Target, Dumbbell, Scale, Heart } from "lucide-react";
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
  const [goal, setGoal] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

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

  const handleSave = async () => {
    if (!canSave) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
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
    } catch {
      toast.error("Falha ao atualizar perfil");
    }
  };

  return (
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
  );
}
