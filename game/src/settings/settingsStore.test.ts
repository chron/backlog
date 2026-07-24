import { describe, expect, it } from "vitest";
import {
  loadReducedMotionPreference,
  loadSoundPreference,
  loadTelemetryPreference,
  saveReducedMotionPreference,
  saveSoundPreference,
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

describe("play presentation preferences", () => {
  it("defaults sound on and remembers mute", () => {
    const storage = createStorage();
    expect(loadSoundPreference(storage)).toBe(true);
    saveSoundPreference(false, storage);
    expect(loadSoundPreference(storage)).toBe(false);
    saveSoundPreference(true, storage);
    expect(loadSoundPreference(storage)).toBe(true);
  });

  it("inherits reduced motion from the system until the player chooses", () => {
    const storage = createStorage();
    expect(loadReducedMotionPreference(storage, true)).toBe(true);
    expect(loadReducedMotionPreference(storage, false)).toBe(false);

    saveReducedMotionPreference(false, storage);
    expect(loadReducedMotionPreference(storage, true)).toBe(false);
    saveReducedMotionPreference(true, storage);
    expect(loadReducedMotionPreference(storage, false)).toBe(true);
  });
});
