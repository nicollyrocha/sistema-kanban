export const CARD_TYPES = ["bug", "feature", "tarefa", "melhoria"] as const;

export const CARD_TYPE_LABELS: Record<(typeof CARD_TYPES)[number], string> = {
  bug: "Bug",
  feature: "Feature",
  tarefa: "Tarefa",
  melhoria: "Melhoria",
};

export const CARD_TYPE_EMOJI: Record<(typeof CARD_TYPES)[number], string> = {
  bug: "🐛",
  feature: "✨",
  tarefa: "✅",
  melhoria: "🔧",
};
