import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  getPostAuthRedirect,
  clearPostAuthRedirect,
  buildKiwifyCheckoutUrl,
} from "@/lib/post-auth-redirect";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSignedIn = (s: Session | null) => {
      if (!s?.user) return;
      const intent = getPostAuthRedirect();
      if (intent === "checkout-plus") {
        clearPostAuthRedirect();
        setTimeout(() => {
          window.location.href = buildKiwifyCheckoutUrl({
            id: s.user.id,
            email: s.user.email,
          });
        }, 50);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === "SIGNED_IN") handleSignedIn(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // cobre: já logado e voltou pra /auth com intent salvo, ou refresh durante OAuth
      if (session) handleSignedIn(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
