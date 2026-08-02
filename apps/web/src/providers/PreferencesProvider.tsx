import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PreferencesContext,
  PreferencesContextValue,
} from "./PreferencesContext";

export type InterfaceDensity = "comfortable" | "compact";

export type MotionPreference = "system" | "reduced";

const STORAGE_KEY = "api-base:preferences:v1";

const DEFAULT_PREFERENCES = {
  density: "comfortable" as const,

  motion: "system" as const,
};

function isInterfaceDensity(value: unknown): value is InterfaceDensity {
  return value === "comfortable" || value === "compact";
}

function isMotionPreference(value: unknown): value is MotionPreference {
  return value === "system" || value === "reduced";
}

function readStoredPreferences(): {
  density: InterfaceDensity;

  motion: MotionPreference;
} {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as {
      density?: unknown;
      motion?: unknown;
    };

    return {
      density: isInterfaceDensity(parsed.density)
        ? parsed.density
        : DEFAULT_PREFERENCES.density,

      motion: isMotionPreference(parsed.motion)
        ? parsed.motion
        : DEFAULT_PREFERENCES.motion,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [initialPreferences] = useState(readStoredPreferences);

  const [density, setDensity] = useState<InterfaceDensity>(
    initialPreferences.density
  );

  const [motion, setMotion] = useState<MotionPreference>(
    initialPreferences.motion
  );

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.density = density;

    root.dataset.motion = motion;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        density,
        motion,
      })
    );
  }, [density, motion]);

  const resetPreferences = useCallback(() => {
    setDensity(DEFAULT_PREFERENCES.density);

    setMotion(DEFAULT_PREFERENCES.motion);
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      density,
      motion,
      setDensity,
      setMotion,
      resetPreferences,
    }),
    [density, motion, resetPreferences]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
