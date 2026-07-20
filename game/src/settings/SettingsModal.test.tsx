import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsModal } from "./SettingsModal";

describe("settings modal", () => {
  it("explains anonymous telemetry and exposes a real switch", () => {
    const markup = renderToStaticMarkup(
      <SettingsModal
        telemetryEnabled
        onTelemetryChange={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain("Share playtest data");
    expect(markup).toContain("Never names, photos, or a device ID.");
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="true"');
  });
});
