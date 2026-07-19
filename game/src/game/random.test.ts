import { describe, expect, it } from "vitest";
import { createRequestedRunSeed } from "./random";

describe("run seed selection", () => {
  it("uses a positive integer from the ordinary page URL", () => {
    expect(createRequestedRunSeed("?seed=4200", () => 99)).toBe(4200);
  });

  it("falls back for absent, invalid, zero, or fractional values", () => {
    for (const search of ["", "?seed=nope", "?seed=0", "?seed=-1", "?seed=4.2"]) {
      expect(createRequestedRunSeed(search, () => 99)).toBe(99);
    }
  });
});
