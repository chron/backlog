import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TargetingArrow } from "./TargetingArrow";

describe("TargetingArrow", () => {
  it("uses an open-edged arrowhead so the shaft and head read as one shape", () => {
    const markup = renderToStaticMarkup(
      <TargetingArrow startX={120} startY={400} endX={300} endY={80} locked={false} />,
    );

    expect(markup).toContain('class="target-arrowhead__fill"');
    expect(markup).toContain('class="target-arrowhead__edge"');
    expect(markup).toContain('d="M 1.5 1.5 L 26 14 L 1.5 26.5"');
    expect(markup).not.toContain('L 1.5 26.5 Z"></path></marker>');
  });
});
