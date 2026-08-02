import { createContext } from "react";

export type InterfaceDensity = "comfortable" | "compact";

export type MotionPreference = "system" | "reduced";

export type PreferencesContextValue = {
  density: InterfaceDensity;
  motion: MotionPreference;
  setDensity: (density: InterfaceDensity) => void;
  setMotion: (motion: MotionPreference) => void;
  resetPreferences: () => void;
};

export const PreferencesContext = createContext<PreferencesContextValue | null>(
  null
);
