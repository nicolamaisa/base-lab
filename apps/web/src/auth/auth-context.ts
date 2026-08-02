import type { Session } from "@supabase/supabase-js";
import { createContext } from "react";

export type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
