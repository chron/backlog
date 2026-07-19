import { eventDefinitions, type EventDefinition } from "../domain/events";
import type { RunState } from "../domain/models";
import { sampleOne } from "./random";

export function selectEventDefinition(
  run: RunState,
  catalogue: readonly EventDefinition[] = eventDefinitions,
): { event: EventDefinition; rngState: number } {
  const eligible = catalogue.filter((event) => event.eligibility(run));
  if (eligible.length === 0) throw new Error("No eligible Events.");

  const seenEventIds = new Set(
    run.history.filter((entry) => entry.kind === "event-resolved").map((entry) => entry.eventId),
  );
  const unseen = eligible.filter((event) => !seenEventIds.has(event.id));
  const candidates = unseen.length > 0 ? unseen : eligible;
  const weighted = candidates.flatMap((event) =>
    Array.from({ length: Math.max(0, Math.round(event.weight(run))) }, () => event),
  );
  const selection = sampleOne(weighted.length > 0 ? weighted : candidates, run.rngState);
  return { event: selection.item, rngState: selection.rngState };
}
