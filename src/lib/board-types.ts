import type { PRIORITIES } from "@/lib/priority";
import type { CARD_TYPES } from "@/lib/card-type";
import type { ESTIMATES } from "@/lib/estimate";

export type LabelData = { id: string; name: string; color: string };
export type ColumnData = { id: string; title: string };
export type CardData = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: (typeof PRIORITIES)[number] | null;
  type: (typeof CARD_TYPES)[number];
  estimate: (typeof ESTIMATES)[number] | null;
  labels: LabelData[];
};
