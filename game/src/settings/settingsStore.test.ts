import { describe, expect, it } from "vitest";
import {
  loadTelemetryPreference,
  saveTelemetryPreference,
  type TelemetryPreferenceStorage,
} from "./settingsStore";

function createStorage(): TelemetryPreferenceStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("telemetry preference", () => {
  it("defaults on and remembers an explicit opt-out", () => {
    const storage = createStorage();
    expect(loadTelemetryPreference(storage)).toBe(true);
    saveTelemetryPreference(false, storage);
    expect(loadTelemetryPreference(storage)).toBe(false);
    saveTelemetryPreference(true, storage);
    expect(loadTelemetryPreference(storage)).toBe(true);
  });
});
