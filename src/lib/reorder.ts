// `newIndex` is the position the card ends up at in the *returned* array
// (after it's removed from wherever it was), not an index into `cardIds`.
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
