import { describe, expect, it } from "vitest";
import { createRequestedRunSeed, shuffle } from "./random";

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

describe("seeded shuffle", () => {
  it("reproduces an order and RNG state from the same seed", () => {
    const cards = Array.from({ length: 12 }, (_, index) => index + 1);

    expect(shuffle(cards, 4200)).toEqual(shuffle(cards, 4200));
    expect(shuffle(cards, 4200).items).not.toEqual(shuffle(cards, 4201).items);
    expect(cards).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
  });
});
