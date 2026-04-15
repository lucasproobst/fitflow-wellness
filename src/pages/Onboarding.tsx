import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { useUpdateProfile } from "@/lib/use-profile";
import { useAuth } from "@/lib/auth-context";
import { Target, Dumbbell, Scale, Heart, ChevronRight, ChevronLeft } from "lucide-react";
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

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const { user } = useAuth();

  const toggleRestriction = (item: string) => {
    setRestrictions(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const canProceed = () => {
    if (step === 0) return !!goal;
    if (step === 1) return true;
    if (step === 2) return !!height && !!weight && !!age && !!activity && !!targetWeight;
    return false;
  };

  const handleFinish = async () => {
    try {
      await updateProfile.mutateAsync({
        goal,
        food_restrictions: restrictions as any,
        height_cm: Number(height),
        weight_kg: Number(weight),
        age: Number(age),
        activity_level: activity,
        target_weight_kg: Number(targetWeight),
        onboarding_complete: true,
      } as any);
      navigate("/");
    } catch {
      toast.error("Falha ao salvar perfil");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progresso */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/5">
              <div
                className="h-full bg-fitflow-primary transition-all duration-500"
                style={{ width: step >= i ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-6 text-foreground">
          {step === 0 && "Qual é seu objetivo?"}
          {step === 1 && "Alguma restrição alimentar?"}
          {step === 2 && "Suas informações"}
        </h1>
        <p className="text-sm text-foreground/50 mt-1">
          {step === 0 && "Escolha o que melhor descreve seu objetivo fitness"}
          {step === 1 && "Selecione alimentos que você NÃO come"}
          {step === 2 && "Nos ajude a personalizar seu plano"}
        </p>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-6 pb-32 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="grid grid-cols-2 gap-3">
                {goals.map(g => (
                  <GlassCard
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`flex flex-col items-center justify-center py-8 gap-3 transition-all ${
                      goal === g.id ? "!border-fitflow-primary bg-fitflow-primary/10" : ""
                    }`}
                  >
                    <g.icon size={28} className={goal === g.id ? "text-fitflow-primary" : "text-foreground/40"} />
                    <span className="text-sm font-medium text-foreground/80">{g.label}</span>
                  </GlassCard>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                {Object.entries(foodCategories).map(([cat, items]) => (
                  <div key={cat}>
                    <h3 className="label-style text-[11px] mb-3">{cat}</h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map(item => (
                        <button
                          key={item}
                          onClick={() => toggleRestriction(item)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                            restrictions.includes(item)
                              ? "bg-fitflow-primary text-white"
                              : "border border-white/10 text-foreground/60 hover:bg-white/5"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {[
                  { label: "Altura (cm)", value: height, set: setHeight, type: "number" },
                  { label: "Peso (kg)", value: weight, set: setWeight, type: "number" },
                  { label: "Idade", value: age, set: setAge, type: "number" },
                  { label: "Peso Alvo (kg)", value: targetWeight, set: setTargetWeight, type: "number" },
                ].map(f => (
                  <div key={f.label}>
                    <label className="label-style text-[10px] mb-1.5 block">{f.label}</label>
                    <input
                      type={f.type}
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:border-fitflow-primary transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="label-style text-[10px] mb-2 block">Nível de Atividade</label>
                  <div className="flex flex-wrap gap-2">
                    {activityLevels.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setActivity(a.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                          activity === a.id
                            ? "bg-fitflow-primary text-white"
                            : "border border-white/10 text-foreground/60 hover:bg-white/5"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navegação inferior */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="h-14 w-14 rounded-xl border border-white/10 flex items-center justify-center text-foreground/60 hover:bg-white/5 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <button
            disabled={!canProceed()}
            onClick={() => (step < 2 ? setStep(s => s + 1) : handleFinish())}
            className="flex-1 h-14 rounded-xl bg-fitflow-primary text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
          >
            {step < 2 ? "Continuar" : updateProfile.isPending ? "Salvando..." : "Começar"}
            {step < 2 && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
