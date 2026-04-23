import { Navigate } from "react-router-dom";
import { useProfile } from "@/lib/use-profile";

/**
 * Guard de rotas premium. Bloqueia acesso a usuários sem `is_pro = true`
 * e os redireciona para a página de upgrade.
 */
export function ProRoute({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fitflow-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.is_pro) {
    return <Navigate to="/upgrade" replace />;
  }

  return <>{children}</>;
}
