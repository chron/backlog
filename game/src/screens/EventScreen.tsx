import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionEntry } from "../components/CardCollectionBrowser";
import { getEvent, resolveEventChoice } from "../domain/events";

type EventScreenProps = DispatchProps &
  RunProps & {
    eventId: string;
    onInspectDeck: () => void;
  };

export function EventScreen({ dispatch, run, eventId, onInspectDeck }: EventScreenProps) {
  if (!run) return null;
  const event = getEvent(eventId);

  return (
    <section
      className={`screen event-screen event-screen--${event.artTreatment}`}
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
    </section>
  );
}
