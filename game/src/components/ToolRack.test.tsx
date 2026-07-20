import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToolRack } from "./ToolRack";

describe("ToolRack", () => {
  it("renders acquired Tools as compact, inspectable HUD controls", () => {
    const markup = renderToStaticMarkup(<ToolRack toolIds={["pairing-session", "merge-queue"]} />);

    expect(markup).toContain('aria-label="Tools"');
    expect(markup).toContain('aria-label="Pairing Session"');
    expect(markup).toContain("Mismatched Work contributes 1 Verified instead of 1 Unverified.");
    expect(markup).toContain('aria-label="Merge Queue"');
    expect(markup).toContain("draw 2 cards and gain 1 Focus");
  });

  it("stays out of the HUD before the run has a Tool", () => {
    expect(renderToStaticMarkup(<ToolRack toolIds={[]} />)).toBe("");
  });
});
