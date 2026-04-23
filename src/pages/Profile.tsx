import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useProfile, useUploadAvatar } from "@/lib/use-profile";
import { useBiometricLock } from "@/lib/use-biometric-lock";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import {
  ArrowLeft, Camera, User, Target, Bell, Lock, CreditCard,
  HelpCircle, LogOut, ChevronRight, Image as ImageIcon, X, Fingerprint,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProBadge } from "@/components/ProBadge";
import { ProBanner } from "@/components/ProBanner";
import { usePro } from "@/lib/use-pro";

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { isPro, expiresAt } = usePro();
  const uploadAvatar = useUploadAvatar();
  const bio = useBiometricLock(user?.id);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const toggleBiometric = async () => {
    if (bioBusy) return;
    setBioBusy(true);
    try {
      if (bio.enabled) {
        bio.disable();
        toast.success("Biometria desativada");
      } else {
        await bio.enable(user?.email);
        toast.success("Biometria ativada! Será pedida ao reabrir o app");
      }
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível ativar a biometria");
    } finally {
      setBioBusy(false);
    }
  };

  // Stats: workouts done, meal plans generated, active days
  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [workouts, plans, days] = await Promise.all([
        supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("meal_plans").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("daily_log").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return {
        workouts: workouts.count ?? 0,
        plans: plans.count ?? 0,
        days: days.count ?? 0,
      };
    },
  });

  const initials = (profile?.display_name || user?.email || "?")
    .replace(/[^a-zA-ZÀ-ÿ0-9]/g, " ")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join("").toUpperCase();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx 5MB)"); return; }
    const t = toast.loading("Enviando foto...");
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Foto atualizada!", { id: t });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar foto", { id: t });
    } finally {
      setPhotoSheetOpen(false);
    }
  };

  const settingsItems = [
    { icon: User, label: "Dados pessoais", onClick: () => setEditInfoOpen(true), color: "text-[#6b7280]" },
    { icon: Target, label: "Meu objetivo", onClick: () => setEditInfoOpen(true), color: "text-[#6b7280]" },
    { icon: Bell, label: "Notificações", onClick: () => navigate("/profile?tab=notifications"), color: "text-[#6b7280]" },
    { icon: Lock, label: "Segurança e senha", onClick: () => toast.info("Em breve"), color: "text-[#6b7280]" },
    { icon: CreditCard, label: "Meu plano", onClick: () => toast.info("Em breve"), color: "text-[#6b7280]" },
    { icon: HelpCircle, label: "Ajuda e suporte", onClick: () => toast.info("Em breve"), color: "text-[#6b7280]" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header
        className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl z-30 border-b border-white/[0.06]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between h-14 px-5">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#6b7280] active:scale-90 transition-transform"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[16px] font-bold text-white">Perfil</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="px-5 pt-6 pb-10">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={() => setPhotoSheetOpen(true)}
            className="relative active:scale-95 transition-transform"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#141414] border border-white/[0.08] flex items-center justify-center text-[28px] font-bold text-white">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <div
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#22c55e] border-2 border-[#0a0a0a] flex items-center justify-center"
              style={{ boxShadow: "0 4px 12px rgba(34,197,94,0.4)" }}
            >
              <Camera size={14} className="text-white" />
            </div>
          </button>
          <h2 className="text-[20px] font-bold text-white mt-4 flex items-center gap-1.5">
            {profile?.display_name || "Atleta"}
            {profile?.is_pro && <ProBadge size={14} />}
          </h2>
          <p className="text-[14px] text-[#6b7280] mt-0.5 truncate max-w-full">
            {user?.email}
          </p>
          {isPro ? (
            <div className="mt-3 w-full max-w-[320px]">
              <ProBanner variant="hero" expiresAt={expiresAt} />
            </div>
          ) : (
            <span className="mt-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#22c55e]/15 text-[#22c55e]">
              FitFlow Grátis
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-stretch justify-between rounded-2xl bg-[#141414] border border-white/[0.07] py-4 px-2 mb-6">
          {[
            { label: "Treinos", value: stats?.workouts ?? 0 },
            { label: "Dietas", value: stats?.plans ?? 0 },
            { label: "Dias ativos", value: stats?.days ?? 0 },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 flex flex-col items-center ${i > 0 ? "border-l border-white/[0.07]" : ""}`}>
              <p className="text-[22px] font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-[12px] text-[#6b7280] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Settings list */}
        <div className="rounded-2xl bg-[#141414] border border-white/[0.07] overflow-hidden mb-6">
          {settingsItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-4 h-14 active:bg-white/[0.03] transition-colors ${
                i < settingsItems.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
            >
              <item.icon size={18} className={item.color} />
              <span className="flex-1 text-left text-[14px] text-white font-medium">{item.label}</span>
              <ChevronRight size={16} className="text-[#6b7280]" />
            </button>
          ))}
        </div>

        {/* Biometric lock */}
        {bio.supported && (
          <div className="rounded-2xl bg-[#141414] border border-white/[0.07] overflow-hidden mb-6">
            <div className="flex items-center gap-3 px-4 h-14">
              <Fingerprint size={18} className="text-[#22c55e]" />
              <div className="flex-1">
                <p className="text-[14px] text-white font-medium">Bloqueio com biometria</p>
                <p className="text-[11px] text-[#6b7280] mt-0.5">Pede Face ID/Touch ID ao abrir o app</p>
              </div>
              <button
                onClick={toggleBiometric}
                disabled={bioBusy}
                className={`relative w-11 h-6 rounded-full transition-colors ${bio.enabled ? "bg-[#22c55e]" : "bg-white/10"} disabled:opacity-50`}
                aria-label="Ativar biometria"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${bio.enabled ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#141414] border border-white/[0.07] active:bg-white/[0.03] transition-colors"
        >
          <LogOut size={18} className="text-destructive" />
          <span className="text-[14px] font-bold text-destructive">Sair da conta</span>
        </button>
      </div>

      {/* Photo source sheet */}
      <AnimatePresence>
        {photoSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPhotoSheetOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 px-4 modal-safe-bottom"
            >
              <div className="bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 h-12 border-b border-white/[0.06]">
                  <p className="text-[14px] font-bold text-white">Foto de perfil</p>
                  <button onClick={() => setPhotoSheetOpen(false)} className="text-[#6b7280] active:scale-90 transition-transform">
                    <X size={18} />
                  </button>
                </div>
                <button
                  onClick={() => cameraInput.current?.click()}
                  className="w-full flex items-center gap-3 px-5 h-14 active:bg-white/[0.03] transition-colors border-b border-white/[0.04]"
                >
                  <Camera size={18} className="text-[#22c55e]" />
                  <span className="text-[14px] text-white font-medium">Tirar foto</span>
                </button>
                <button
                  onClick={() => galleryInput.current?.click()}
                  className="w-full flex items-center gap-3 px-5 h-14 active:bg-white/[0.03] transition-colors"
                >
                  <ImageIcon size={18} className="text-[#22c55e]" />
                  <span className="text-[14px] text-white font-medium">Escolher da galeria</span>
                </button>
              </div>
              <button
                onClick={() => setPhotoSheetOpen(false)}
                className="mt-2 w-full h-12 rounded-2xl bg-[#141414] border border-white/[0.08] text-[14px] font-bold text-white active:bg-white/[0.03] transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />

      <EditProfileSheet
        open={editInfoOpen}
        onOpenChange={setEditInfoOpen}
        profile={profile ?? null}
      />
    </div>
  );
}
