import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/use-profile";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  const { user } = useAuth();
  const { data: profile, refetch } = useProfile();
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);

  const isPro = !!profile?.is_pro;

  // Realtime: ouve UPDATE no user_profile e atualiza a UI assim que o webhook ativar
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-pro-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profile",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["profile"] });
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc, refetch]);

  // Polling de segurança (caso realtime falhe) — a cada 3s, máx 2 min
  useEffect(() => {
    if (isPro) return;
    const interval = setInterval(() => {
      refetch();
      setElapsed((s) => s + 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPro, refetch]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-10">
      <div className="mobile-shell w-full max-w-md">
        <div className="rounded-3xl border border-white/[0.07] bg-card p-8 text-center shadow-2xl">
          {isPro ? (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-fitflow-primary/15">
                <CheckCircle2 className="h-12 w-12 text-fitflow-primary" strokeWidth={2} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Plano FitFlow+ ativado!
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Pagamento confirmado e seu acesso vitalício já está liberado.
                Todas as funções premium foram desbloqueadas.
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-fitflow-primary">
                <Sparkles className="h-4 w-4" />
                <span>Você agora é membro FitFlow+</span>
              </div>

              <Link to="/" className="mt-8 block">
                <Button className="w-full h-12 rounded-2xl bg-fitflow-primary hover:bg-fitflow-primary/90 text-black font-semibold text-base">
                  Começar agora
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <Loader2 className="h-10 w-10 text-fitflow-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Confirmando seu pagamento…
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Estamos aguardando a confirmação da Kiwify. Isso geralmente leva
                poucos segundos. Não feche esta página.
              </p>

              {elapsed >= 30 && (
                <p className="mt-6 text-xs text-muted-foreground/80 leading-relaxed">
                  Está demorando mais que o normal? Você pode fechar e abrir o
                  app — assim que a Kiwify confirmar, seu plano será liberado
                  automaticamente.
                </p>
              )}

              <Link to="/" className="mt-8 block">
                <Button
                  variant="ghost"
                  className="w-full h-11 rounded-2xl text-muted-foreground hover:text-foreground"
                >
                  Voltar para o app
                </Button>
              </Link>
            </>
          )}
        </div>

        {!user && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Entre na sua conta para que o plano seja vinculado automaticamente.{" "}
            <Link to="/auth" className="text-fitflow-primary font-semibold">
              Fazer login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
