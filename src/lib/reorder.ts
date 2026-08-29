export function reorderColumn(
  cardIds: string[],
  movedCardId: string,
  newIndex: number
): string[] {
  const withoutMoved = cardIds.filter((id) => id !== movedCardId);
  const clampedIndex = Math.max(0, Math.min(newIndex, withoutMoved.length));
  return [
    ...withoutMoved.slice(0, clampedIndex),
    movedCardId,
    ...withoutMoved.slice(clampedIndex),
  ];
}
