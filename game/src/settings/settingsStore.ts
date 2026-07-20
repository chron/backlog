const telemetryPreferenceKey = "lgtm:share-playtest-data";

export interface TelemetryPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): TelemetryPreferenceStorage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function loadTelemetryPreference(storage = browserStorage()): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(telemetryPreferenceKey) !== "off";
  } catch {
    return true;
  }
}

export function saveTelemetryPreference(enabled: boolean, storage = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(telemetryPreferenceKey, enabled ? "on" : "off");
  } catch {
    // A storage-denied browser can still play; it simply uses the default next time.
  }
}
