import { useEffect, useId, useRef } from "react";

interface SettingsModalProps {
  reducedMotionEnabled: boolean;
  onReducedMotionChange: (enabled: boolean) => void;
  soundEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  telemetryEnabled: boolean;
  onTelemetryChange: (enabled: boolean) => void;
  tutorialEnabled: boolean;
  onTutorialChange: (enabled: boolean) => void;
  onClose: () => void;
}

const focusableSelector = [
  "button:not(:disabled)",
  "[href]",
  "input:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function SettingsModal({
  reducedMotionEnabled,
  onReducedMotionChange,
  soundEnabled,
  onSoundChange,
  telemetryEnabled,
  onTelemetryChange,
  tutorialEnabled,
  onTutorialChange,
  onClose,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="settings-modal__backdrop">
      <dialog
        open
        className="settings-modal"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
      >
        <header className="settings-modal__header">
          <h2 id={titleId}>Settings</h2>
          <button
            className="settings-modal__close"
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </header>

        <div className="settings-modal__body">
          <div className="settings-modal__row">
            <div className="settings-modal__copy">
              <strong>Game sounds</strong>
              <p>Hear cards, consequences, rewards, and extremely professional shipping noises.</p>
            </div>
            <button
              className="settings-toggle"
              type="button"
              role="switch"
              aria-label="Game sounds"
              aria-checked={soundEnabled}
              onClick={() => onSoundChange(!soundEnabled)}
            >
              <span aria-hidden="true" />
              <b>{soundEnabled ? "On" : "Off"}</b>
            </button>
          </div>
          <div className="settings-modal__row">
            <div className="settings-modal__copy">
              <strong>Reduce motion</strong>
              <p>Replace animated flourishes with immediate, readable state changes.</p>
            </div>
            <button
              className="settings-toggle"
              type="button"
              role="switch"
              aria-label="Reduce motion"
              aria-checked={reducedMotionEnabled}
              onClick={() => onReducedMotionChange(!reducedMotionEnabled)}
            >
              <span aria-hidden="true" />
              <b>{reducedMotionEnabled ? "On" : "Off"}</b>
            </button>
          </div>
          <div className="settings-modal__row">
            <div className="settings-modal__copy">
              <strong>Show tutorial</strong>
              <p>Guide the next run through its first Cycle.</p>
            </div>
            <button
              className="settings-toggle"
              type="button"
              role="switch"
              aria-label="Show tutorial on next run"
              aria-checked={tutorialEnabled}
              onClick={() => onTutorialChange(!tutorialEnabled)}
            >
              <span aria-hidden="true" />
              <b>{tutorialEnabled ? "On" : "Off"}</b>
            </button>
          </div>
          <div className="settings-modal__row">
            <div className="settings-modal__copy">
              <strong>Share playtest data</strong>
              <p id={descriptionId}>
                Send anonymous choices, run timing, and balance results. Never names, photos, or a
                device ID.
              </p>
            </div>
            <button
              className="settings-toggle"
              type="button"
              role="switch"
              aria-label="Share playtest data"
              aria-checked={telemetryEnabled}
              onClick={() => onTelemetryChange(!telemetryEnabled)}
            >
              <span aria-hidden="true" />
              <b>{telemetryEnabled ? "On" : "Off"}</b>
            </button>
          </div>
        </div>

        <footer className="settings-modal__actions">
          <button className="button button--primary" type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </dialog>
    </div>
  );
}
