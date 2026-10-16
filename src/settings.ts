import { Currency } from "./currency";
import { AppTheme } from "./theme";

export type UserSettings = {
  theme: AppTheme;
  currency: Currency;
  exchangeRate?: number;
  exchangeRateUpdatedAt?: number;
};

export const defaultUserSettings: UserSettings = {
  theme: "light",
  currency: "USD",
};

const LOCAL_SETTINGS_KEY = "campus-marketplace-settings";

export function loadLocalUserSettings(): UserSettings {
  if (typeof localStorage === "undefined") return defaultUserSettings;

  try {
    const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
    return stored ? parseUserSettings(JSON.parse(stored)) : defaultUserSettings;
  } catch (error) {
    console.error("Could not load local settings.", error);
    return defaultUserSettings;
  }
}

export function saveLocalUserSettings(settings: UserSettings): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Could not save local settings.", error);
  }
}

export function parseUserSettings(value: unknown): UserSettings {
  if (!value || typeof value !== "object") return defaultUserSettings;
  const candidate = value as Partial<UserSettings>;
  const rate = Number(candidate.exchangeRate);
  const updatedAt = Number(candidate.exchangeRateUpdatedAt);

  return {
    theme: candidate.theme === "dark" ? "dark" : "light",
    currency: candidate.currency === "LKR" ? "LKR" : "USD",
    ...(Number.isFinite(rate) && rate > 0 ? { exchangeRate: rate } : {}),
    ...(Number.isFinite(updatedAt) && updatedAt > 0
      ? { exchangeRateUpdatedAt: updatedAt }
      : {}),
  };
}
