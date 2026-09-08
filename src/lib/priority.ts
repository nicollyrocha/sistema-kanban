export const PRIORITIES = ["urgente", "alta", "media", "baixa"] as const;

export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORITY_EMOJI: Record<(typeof PRIORITIES)[number], string> = {
  urgente: "🔴",
  alta: "🟠",
  media: "🟡",
  baixa: "🔵",
};
