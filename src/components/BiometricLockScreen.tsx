import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useBiometricLock } from "@/lib/use-biometric-lock";
import { toast } from "sonner";

interface Props {
  onUnlock: () => void;
}

export function BiometricLockScreen({ onUnlock }: Props) {
  const { user, signOut } = useAuth();
  const { verify } = useBiometricLock(user?.id);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const attempt = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await verify();
      if (ok) {
        onUnlock();
      } else {
        toast.error("Não foi possível validar. Tente novamente.");
      }
    } finally {
      setBusy(false);
      setTried(true);
    }
  };

  // Auto-prompt on mount
  useEffect(() => {
    const t = setTimeout(attempt, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-24 h-24 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center mb-6"
      >
        <Fingerprint size={48} className="text-[#22c55e]" />
      </motion.div>

      <h1 className="text-[22px] font-bold text-white mb-1.5">App bloqueado</h1>
      <p className="text-[14px] text-[#6b7280] text-center mb-8 max-w-[280px]">
        Use Face ID ou Touch ID para continuar
      </p>

      <button
        onClick={attempt}
        disabled={busy}
        className="w-full max-w-[280px] h-14 rounded-2xl bg-[#22c55e] text-black font-bold text-[15px] active:scale-95 transition-transform disabled:opacity-50 mb-3"
      >
        {busy ? "Verificando..." : tried ? "Tentar novamente" : "Desbloquear"}
      </button>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 h-12 px-5 rounded-2xl text-[#6b7280] active:text-white text-[13px] font-medium"
      >
        <LogOut size={14} />
        Sair da conta
      </button>
    </div>
  );
}
