import { describe, expect, it } from "vitest";
import { nextPosition } from "./position";

describe("nextPosition", () => {
  it("returns 0 for an empty list", () => {
    expect(nextPosition([])).toBe(0);
  });

  it("returns one more than the single existing position", () => {
    expect(nextPosition([0])).toBe(1);
  });

  it("returns one more than the maximum existing position", () => {
    expect(nextPosition([0, 3, 1])).toBe(4);
  });
});
