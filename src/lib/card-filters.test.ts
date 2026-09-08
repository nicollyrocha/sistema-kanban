import { describe, expect, it } from "vitest";
import { cardMatchesFilters } from "./card-filters";
import type { CardData } from "./board-types";

function makeCard(overrides: Partial<CardData> = {}): CardData {
  return {
    id: "1",
    title: "Card",
    description: null,
    dueDate: null,
    priority: null,
    type: "tarefa",
    estimate: null,
    labels: [],
    ...overrides,
  };
}

describe("cardMatchesFilters", () => {
  it("matches everything when no filters are active", () => {
    expect(cardMatchesFilters(makeCard(), { priorities: [], types: [], labelIds: [] })).toBe(true);
  });

  it("excludes a card with no priority when a priority filter is active", () => {
    const card = makeCard({ priority: null });
    expect(cardMatchesFilters(card, { priorities: ["alta"], types: [], labelIds: [] })).toBe(false);
  });

  it("includes a card whose priority is in the filter", () => {
    const card = makeCard({ priority: "alta" });
    expect(cardMatchesFilters(card, { priorities: ["alta"], types: [], labelIds: [] })).toBe(true);
  });

  it("excludes a card whose priority isn't in the filter", () => {
    const card = makeCard({ priority: "baixa" });
    expect(
      cardMatchesFilters(card, { priorities: ["alta", "urgente"], types: [], labelIds: [] })
    ).toBe(false);
  });

  it("filters by type", () => {
    const card = makeCard({ type: "bug" });
    expect(cardMatchesFilters(card, { priorities: [], types: ["bug"], labelIds: [] })).toBe(true);
    expect(cardMatchesFilters(card, { priorities: [], types: ["feature"], labelIds: [] })).toBe(
      false
    );
  });

  it("filters by label, matching if any assigned label is in the filter", () => {
    const card = makeCard({ labels: [{ id: "l1", name: "Urgente", color: "#fff" }] });
    expect(cardMatchesFilters(card, { priorities: [], types: [], labelIds: ["l1"] })).toBe(true);
    expect(cardMatchesFilters(card, { priorities: [], types: [], labelIds: ["l2"] })).toBe(false);
  });

  it("requires every active filter category to match (AND across categories)", () => {
    const card = makeCard({
      priority: "alta",
      type: "bug",
      labels: [{ id: "l1", name: "X", color: "#fff" }],
    });
    expect(
      cardMatchesFilters(card, { priorities: ["alta"], types: ["bug"], labelIds: ["l1"] })
    ).toBe(true);
    expect(
      cardMatchesFilters(card, { priorities: ["alta"], types: ["feature"], labelIds: ["l1"] })
    ).toBe(false);
  });
});
