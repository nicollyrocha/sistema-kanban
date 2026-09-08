import type { CardData } from "@/lib/board-types";

export type CardFilters = {
  priorities: string[];
  types: string[];
  labelIds: string[];
};

export function cardMatchesFilters(card: CardData, filters: CardFilters): boolean {
  if (filters.priorities.length > 0) {
    if (!card.priority || !filters.priorities.includes(card.priority)) return false;
  }
  if (filters.types.length > 0) {
    if (!filters.types.includes(card.type)) return false;
  }
  if (filters.labelIds.length > 0) {
    if (!card.labels.some((l) => filters.labelIds.includes(l.id))) return false;
  }
  return true;
}
