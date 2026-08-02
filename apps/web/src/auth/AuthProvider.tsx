import type { Session } from "@supabase/supabase-js";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";

import { authClient } from "../api/auth-client";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    void authClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        console.error(error);
      }

      setSession(data.session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setInitializing(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      signIn: async (email: string, password: string) => {
        const { error } = await authClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        const { error } = await authClient.auth.signOut();

        if (error) {
          throw error;
        }
      },
    }),
    [initializing, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
