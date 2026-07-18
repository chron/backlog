import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CardCollectionBrowser,
  chooseCardInstanceId,
  groupCardCollection,
  shouldCloseCardCollection,
  toggleCardSelection,
} from "./CardCollectionBrowser";
import type { CardInstance } from "../domain/models";

const cards: readonly CardInstance[] = [
  { cardId: "frontend-3", instanceId: "frontend-second" },
  { cardId: "backend-3", instanceId: "backend-first" },
  { cardId: "frontend-3", instanceId: "frontend-first" },
];

describe("CardCollectionBrowser", () => {
  it("groups duplicate definitions and sorts by card name instead of pile order", () => {
    expect(groupCardCollection(cards)).toEqual([
      { cardId: "backend-3", count: 1 },
      { cardId: "frontend-3", count: 2 },
    ]);
  });

  it("does not expose hidden instance order in inspect markup", () => {
    const markup = renderToStaticMarkup(
      <CardCollectionBrowser cards={cards} title="Draw" orderHidden onClose={() => undefined} />,
    );

    expect(markup).toContain("Order hidden");
    expect(markup).toContain("×2");
    expect(markup).not.toContain("frontend-first");
    expect(markup).not.toContain("frontend-second");
  });

  it("toggles one chosen definition and resolves one eligible instance", () => {
    expect(toggleCardSelection(undefined, "frontend-3")).toBe("frontend-3");
    expect(toggleCardSelection("frontend-3", "frontend-3")).toBeUndefined();
    expect(toggleCardSelection(undefined, "frontend-3", false)).toBeUndefined();
    expect(
      chooseCardInstanceId(cards, "frontend-3", (instance) =>
        instance.instanceId.endsWith("first"),
      ),
    ).toBe("frontend-first");
  });

  it("maps Escape to the close action", () => {
    expect(shouldCloseCardCollection("Escape")).toBe(true);
    expect(shouldCloseCardCollection("Enter")).toBe(false);
  });

  it("renders removal as a modal single-select flow", () => {
    const markup = renderToStaticMarkup(
      <CardCollectionBrowser
        cards={cards}
        title="Remove"
        mode="choose-one"
        confirmLabel="Remove"
        onClose={() => undefined}
        onChoose={() => undefined}
      />,
    );

    expect(markup).toContain("<dialog");
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("Remove");
  });
});
