import { describe, expect, it } from "vitest";
import { reorderColumn } from "./reorder";

describe("reorderColumn", () => {
  it("inserts into an empty column", () => {
    expect(reorderColumn([], "a", 0)).toEqual(["a"]);
  });

  it("inserts before the only existing card", () => {
    expect(reorderColumn(["b"], "a", 0)).toEqual(["a", "b"]);
  });

  it("inserts after the only existing card", () => {
    expect(reorderColumn(["b"], "a", 1)).toEqual(["b", "a"]);
  });

  it("moves an existing card forward within the list", () => {
    expect(reorderColumn(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an existing card backward within the list", () => {
    expect(reorderColumn(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
  });

  it("clamps an out-of-range index to the end", () => {
    expect(reorderColumn(["a", "b"], "c", 10)).toEqual(["a", "b", "c"]);
  });

  it("clamps a negative index to the start", () => {
    expect(reorderColumn(["a", "b"], "c", -5)).toEqual(["c", "a", "b"]);
  });

  it("returns an equivalent order when dropped back at its current index", () => {
    expect(reorderColumn(["a", "b", "c"], "b", 1)).toEqual(["a", "b", "c"]);
  });
});
