import { describe, expect, it } from "vitest";
import { parseProductionTelemetryBatch } from "./contract";

const validEvent = {
  schemaVersion: 1,
  at: "2026-07-20T00:00:00.000Z",
  sequence: 1,
  type: "START_RUN",
  accepted: true,
  screenBefore: "title",
  screenAfter: "squad",
  details: { seed: 42 },
  snapshot: {
    screen: "squad",
    elapsedMs: 0,
    seed: 42,
    squad: [],
    bossId: "mateja-weekend-pivot",
    morale: 10,
    maxMorale: 10,
    techDebt: 0,
    credits: 40,
    deckSize: 0,
    tools: [],
    openTasks: 0,
    readyTasks: 0,
    shippedTasks: 0,
    encounters: 0,
    cyclesShipped: 0,
    cyclesMissed: 0,
    days: 0,
    cardsPlayed: 0,
    generatedCardsPlayed: 0,
    cardsExhausted: 0,
    tasksShipped: 0,
    defects: 0,
  },
};

describe("production telemetry contract", () => {
  it("accepts the bounded anonymous event shape", () => {
    const batch = parseProductionTelemetryBatch({
      schemaVersion: 1,
      runId: "2026-07-20-123e4567-e89b-12d3-a456-426614174000",
      events: [validEvent],
    });
    expect(batch?.events).toHaveLength(1);
  });

  it("rejects duplicate sequences and unknown detail fields", () => {
    expect(
      parseProductionTelemetryBatch({
        schemaVersion: 1,
        runId: "run-1",
        events: [validEvent, validEvent],
      }),
    ).toBeUndefined();
    expect(
      parseProductionTelemetryBatch({
        schemaVersion: 1,
        runId: "run-1",
        events: [{ ...validEvent, details: { email: "absolutely-not@example.com" } }],
      }),
    ).toBeUndefined();
  });

  it("rejects unbounded ids and invalid event types", () => {
    expect(
      parseProductionTelemetryBatch({
        schemaVersion: 1,
        runId: "RUN WITH SPACES",
        events: [validEvent],
      }),
    ).toBeUndefined();
    expect(
      parseProductionTelemetryBatch({
        schemaVersion: 1,
        runId: "run-1",
        events: [{ ...validEvent, type: "SEND_EVERYTHING_TO_THE_CLOUD" }],
      }),
    ).toBeUndefined();
  });
});
