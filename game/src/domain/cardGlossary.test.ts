import { describe, expect, it } from "vitest";
import { getCardGlossaryEntries } from "./cardGlossary";
import { getCard } from "./content";

function termsFor(cardId: string): string[] {
  return getCardGlossaryEntries(getCard(cardId)).map((entry) => entry.term);
}

describe("card glossary", () => {
  it("derives Paul's specialist mechanics from the card definition", () => {
    expect(termsFor("side-quest")).toEqual(["Prototype", "Side Quest", "Exhaust"]);
    expect(termsFor("ebb-and-flow")).toEqual(["Distraction", "Exhaust"]);
    expect(termsFor("new-model-dropped")).toEqual(["Tech Debt", "Generated"]);
  });

  it("explains shared work, review, defense, and automation vocabulary", () => {
    expect(termsFor("quick-fix")).toEqual([
      "AI Assisted",
      "Unverified",
      "Generated",
      "Exhaust",
      "Any",
    ]);
    expect(termsFor("review-3")).toEqual(["Verify"]);
    expect(termsFor("feature-flag")).toEqual(["Stun", "Block"]);
    expect(termsFor("health-check")).toEqual(["Block", "Script", "Guard"]);
  });
});
