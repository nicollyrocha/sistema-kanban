export type LabelData = { id: string; name: string; color: string };
export type ColumnData = { id: string; title: string };
export type CardData = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  labels: LabelData[];
};
