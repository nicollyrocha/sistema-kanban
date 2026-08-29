export const LABEL_COLORS = [
  "#ff6bd6",
  "#7c5cff",
  "#39ff88",
  "#ffd803",
  "#5c9dff",
  "#ff9d5c",
] as const;

// Human-readable names for the color picker's aria-labels — a screen
// reader announcing a raw hex code ("Cor #ff6bd6") isn't meaningful.
export const LABEL_COLOR_NAMES: Record<(typeof LABEL_COLORS)[number], string> = {
  "#ff6bd6": "rosa",
  "#7c5cff": "roxo",
  "#39ff88": "verde",
  "#ffd803": "amarelo",
  "#5c9dff": "azul",
  "#ff9d5c": "laranja",
};
