const telemetryPreferenceKey = "lgtm:share-playtest-data";
const soundPreferenceKey = "lgtm:game-sounds";
const reducedMotionPreferenceKey = "lgtm:reduce-motion";

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

export function loadSoundPreference(storage = browserStorage()): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(soundPreferenceKey) !== "off";
  } catch {
    return true;
  }
}

export function saveSoundPreference(enabled: boolean, storage = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(soundPreferenceKey, enabled ? "on" : "off");
  } catch {
    // Sound remains usable for this session when storage is unavailable.
  }
}

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function loadReducedMotionPreference(
  storage = browserStorage(),
  systemPreference = systemPrefersReducedMotion(),
): boolean {
  if (!storage) return systemPreference;
  try {
    const stored = storage.getItem(reducedMotionPreferenceKey);
    return stored === "on" ? true : stored === "off" ? false : systemPreference;
  } catch {
    return systemPreference;
  }
}

export function saveReducedMotionPreference(enabled: boolean, storage = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(reducedMotionPreferenceKey, enabled ? "on" : "off");
  } catch {
    // The current page can still honour the preference without persistence.
  }
}
