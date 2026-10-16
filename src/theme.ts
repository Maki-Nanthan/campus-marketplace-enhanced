export type AppTheme = "light" | "dark";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  input: string;
};

export const themeColors: Record<AppTheme, ThemeColors> = {
  light: {
    background: "#F8F8F4",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F4EF",
    text: "#173C34",
    muted: "#87918C",
    border: "#E3E9E2",
    accent: "#1F5D4C",
    accentText: "#FFFFFF",
    accentSoft: "#E6F0E6",
    input: "#FFFFFF",
  },
  dark: {
    background: "#121A17",
    surface: "#1B2722",
    surfaceMuted: "#24332C",
    text: "#E8F0EB",
    muted: "#A4B0A9",
    border: "#35453D",
    accent: "#72B69A",
    accentText: "#102019",
    accentSoft: "#29483B",
    input: "#202D27",
  },
};
