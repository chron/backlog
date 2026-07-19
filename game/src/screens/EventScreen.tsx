import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionEntry } from "../components/CardCollectionBrowser";
import { getEvent } from "../domain/events";
import { resolveEventChoice, type EventPendingSelection } from "../game/eventResolution";

type EventScreenProps = DispatchProps &
  RunProps & {
    eventId: string;
    resolution?: {
      outcome: readonly string[];
      pending: EventPendingSelection;
    };
    onInspectDeck: () => void;
  };

export function EventScreen({
  dispatch,
  run,
  eventId,
  resolution,
  onInspectDeck,
}: EventScreenProps) {
  if (!run) return null;
  const event = getEvent(eventId);

  return (
    <section
      className={`screen event-screen event-screen--${event.artTreatment}${resolution ? " has-selection" : ""}`}
      aria-labelledby="event-heading"
    >
      <div className="screen-heading">
        <h1 id="event-heading" className="display-title">
          {event.title}
        </h1>
        <CardCollectionEntry count={run.deck.length} onOpen={onInspectDeck} />
      </div>
      <div className="event-art" data-event-art={event.artTreatment} aria-hidden="true">
        {event.artLabel}
      </div>
      <p className="event-setup">{event.setup}</p>
      {resolution ? (
        <div className="event-selection" aria-label={resolution.pending.prompt}>
          <h2>{resolution.pending.prompt}</h2>
          {resolution.outcome.length > 0 && (
            <div className="event-selection__applied" aria-label="Already applied">
              {resolution.outcome.map((outcome) => (
                <span key={outcome}>{outcome}</span>
              ))}
            </div>
          )}
          <div className="event-selection__options">
            {resolution.pending.options.map((option) => (
              <button
                className={`event-option event-option--${resolution.pending.kind}`}
                type="button"
                key={option.id}
                onClick={() => dispatch({ type: "CHOOSE_EVENT_OPTION", optionId: option.id })}
              >
                <strong>{option.label}</strong>
                {option.rules && <span>{option.rules}</span>}
                <small>Choose</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="choice-stack">
          {event.choices.map((choice) => {
            const resolved = resolveEventChoice(choice, run);
            return (
              <button
                className={`choice choice--${choice.tone}`}
                type="button"
                key={choice.id}
                disabled={Boolean(resolved.disabledReason)}
                onClick={() => dispatch({ type: "CHOOSE_EVENT", choiceId: choice.id })}
              >
                <strong>{choice.label}</strong>
                <span className="choice__outcomes">
                  {resolved.outcome.map((outcome) => (
                    <span className={`choice__outcome is-${outcome.tone}`} key={outcome.text}>
                      {outcome.text}
                    </span>
                  ))}
                </span>
                {resolved.disabledReason && (
                  <span className="choice__reason">{resolved.disabledReason}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
