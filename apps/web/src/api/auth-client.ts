import { createClient } from "@supabase/supabase-js";

function isLocalhostUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function resolveSupabaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();

  if (typeof window === "undefined") {
    if (!configuredUrl) {
      throw new Error("VITE_SUPABASE_URL is required outside the browser");
    }

    return configuredUrl;
  }

  const browserOrigin = window.location.origin;

  if (!configuredUrl) {
    return browserOrigin;
  }

  // In production behind Kong we want same-origin auth calls.
  // If the bundle was built with localhost but opened remotely,
  // prefer the real browser origin instead of the baked local URL.
  if (!import.meta.env.DEV && isLocalhostUrl(configuredUrl)) {
    return browserOrigin;
  }

  return configuredUrl;
}

const supabaseUrl = resolveSupabaseUrl();
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabasePublishableKey) {
  throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY is required");
}

export const authClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
