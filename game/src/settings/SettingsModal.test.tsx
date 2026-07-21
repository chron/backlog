import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsModal } from "./SettingsModal";

describe("settings modal", () => {
  it("explains anonymous telemetry and exposes a real switch", () => {
    const markup = renderToStaticMarkup(
      <SettingsModal
        telemetryEnabled
        tutorialEnabled={false}
        onTelemetryChange={() => undefined}
        onTutorialChange={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain("Show tutorial");
    expect(markup).toContain("Guide the next run through its first Cycle.");
    expect(markup).toContain('aria-label="Show tutorial on next run"');
    expect(markup).toContain('aria-checked="false"');
    expect(markup).toContain("Share playtest data");
    expect(markup).toContain("Never names, photos, or a device ID.");
    expect(markup.match(/role="switch"/g)).toHaveLength(2);
    expect(markup).toContain('aria-checked="true"');
  });
});
