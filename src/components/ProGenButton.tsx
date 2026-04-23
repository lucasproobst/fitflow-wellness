import { Lock, RefreshCw } from "lucide-react";
import { usePro } from "@/lib/use-pro";
import { ReactNode } from "react";

/**
 * Botão consistente para ações de geração premium (Dieta, Treino, Swap, etc.)
 *
 * Variants:
 *  - "icon"    → botão circular (header refresh)
 *  - "primary" → botão principal cheio (empty state, "Gerar plano")
 *  - "ghost"   → botão secundário pill (Swap meal, ações inline)
 *
 * Sempre que `isPro=false`:
 *  - Mostra ícone de Lock no canto
 *  - Aplica visual "premium dimmed" (opacidade + dashed border / brilho dourado)
 *  - Adiciona aria-label "(FitFlow+)" para leitores de tela
 *  - Click chama `requirePro()` e redireciona para /upgrade
 */
interface Props {
  variant?: "icon" | "primary" | "ghost";
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  proLabel?: string; // override do texto quando bloqueado
  requireProLabel: string; // o que mostrar no toast
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ProGenButton({
  variant = "primary",
  onClick,
  loading,
  disabled,
  label,
  proLabel,
  requireProLabel,
  children,
  className = "",
  ariaLabel,
}: Props) {
  const { isPro, requirePro } = usePro();

  const handleClick = () => {
    if (!isPro) {
      requirePro(requireProLabel);
      return;
    }
    onClick();
  };

  const aria = `${ariaLabel ?? label ?? requireProLabel}${!isPro ? " (FitFlow+)" : ""}`;

  // ── Variant: ICON (header refresh) ──────────────────────────────────────
  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label={aria}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 ${
          isPro
            ? "bg-[#22c55e] text-white"
            : "bg-[#141414] border border-white/[0.07] text-white/60"
        } ${className}`}
      >
        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        {!isPro && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0a0a0a] border border-white/15 flex items-center justify-center">
            <Lock size={9} className="text-[#fbbf24]" strokeWidth={2.5} />
          </span>
        )}
      </button>
    );
  }

  // ── Variant: PRIMARY (call-to-action grande) ────────────────────────────
  if (variant === "primary") {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label={aria}
        className={`group relative inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50 ${
          isPro
            ? "bg-[#22c55e] text-white"
            : "bg-gradient-to-r from-[#22c55e]/20 to-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30"
        } ${className}`}
      >
        {!isPro && <Lock size={13} strokeWidth={2.5} />}
        <span>{!isPro ? (proLabel ?? `${label} • FitFlow+`) : (children ?? label)}</span>
      </button>
    );
  }

  // ── Variant: GHOST (pill secundário, ex: Swap meal) ─────────────────────
  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={aria}
      className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[11px] uppercase tracking-wider font-bold active:scale-95 transition-all disabled:opacity-40 ${
        isPro
          ? "bg-white/[0.06] border-white/[0.1] text-white"
          : "bg-[#fbbf24]/[0.08] border-[#fbbf24]/25 text-[#fbbf24]"
      } ${className}`}
    >
      {!isPro && <Lock size={10} strokeWidth={2.5} />}
      {children ?? label}
    </button>
  );
}
