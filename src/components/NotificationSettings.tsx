import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Bell, BellOff, Utensils, Dumbbell, Check } from "lucide-react";
import {
  canNotify,
  requestPermission,
  getNotificationPrefs,
  saveNotificationPrefs,
  NotificationPrefs,
} from "@/lib/use-notifications";
import { toast } from "sonner";

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs);
  const [permState, setPermState] = useState<NotificationPermission>(
    canNotify() ? Notification.permission : "denied"
  );

  useEffect(() => {
    saveNotificationPrefs(prefs);
  }, [prefs]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    setPermState(Notification.permission);
    if (granted) {
      setPrefs(p => ({ ...p, enabled: true }));
      toast.success("Notificações ativadas!");
    } else {
      toast.error("Permissão de notificação negada. Ative nas configurações do navegador.");
    }
  };

  const handleDisable = () => {
    setPrefs(p => ({ ...p, enabled: false }));
    toast("Notificações desativadas");
  };

  if (!canNotify()) {
    return (
      <GlassCard className="mb-4">
        <div className="flex items-center gap-3">
          <BellOff size={20} className="text-foreground/30" />
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações indisponíveis</p>
            <p className="text-xs text-foreground/40">Seu navegador não suporta notificações</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-fitflow-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Lembretes</p>
            <p className="text-xs text-foreground/40">
              {prefs.enabled ? "Notificações ativas" : "Receba lembretes para registrar refeições e treinar"}
            </p>
          </div>
        </div>
        {prefs.enabled ? (
          <button
            onClick={handleDisable}
            className="px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-foreground/50 active:scale-95 transition-all"
          >
            Desativar
          </button>
        ) : (
          <button
            onClick={handleEnable}
            className="px-3 py-1.5 rounded-full bg-fitflow-primary text-white text-xs font-semibold active:scale-95 transition-all"
          >
            Ativar
          </button>
        )}
      </div>

      {prefs.enabled && (
        <div className="space-y-3">
          <button
            onClick={() => setPrefs(p => ({ ...p, mealReminders: !p.mealReminders }))}
            className="w-full flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <Utensils size={16} className="text-foreground/40" />
              <span className="text-sm text-foreground">Lembretes de refeição</span>
              <span className="text-[10px] text-foreground/30">8h, 12h30, 18h30</span>
            </div>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
              prefs.mealReminders ? "bg-fitflow-primary" : "border border-white/10"
            }`}>
              {prefs.mealReminders && <Check size={12} className="text-white" />}
            </div>
          </button>
          <button
            onClick={() => setPrefs(p => ({ ...p, workoutReminders: !p.workoutReminders }))}
            className="w-full flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <Dumbbell size={16} className="text-foreground/40" />
              <span className="text-sm text-foreground">Lembrete de treino</span>
              <span className="text-[10px] text-foreground/30">17h diariamente</span>
            </div>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
              prefs.workoutReminders ? "bg-fitflow-primary" : "border border-white/10"
            }`}>
              {prefs.workoutReminders && <Check size={12} className="text-white" />}
            </div>
          </button>
        </div>
      )}
    </GlassCard>
  );
}
