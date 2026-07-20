import { describe, expect, it } from "vitest";
import {
  createGameActionLogEvent,
  createProductionRunSnapshot,
  createProductionTelemetryEvent,
} from "./actionLog";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";

describe("game action log", () => {
  it("records a reducer transition with enough state to inspect the run", () => {
    const startAction = { type: "START_RUN", seed: 42 } as const;
    const started = gameReducer(initialGameState, startAction);
    const event = createGameActionLogEvent(startAction, initialGameState, started, {
      at: "2026-07-19T00:00:00.000Z",
      runId: "run-42",
      sessionId: "session-1",
      sequence: 1,
    });

    expect(event).toEqual({
      schemaVersion: 1,
      at: "2026-07-19T00:00:00.000Z",
      runId: "run-42",
      sessionId: "session-1",
      sequence: 1,
      type: "START_RUN",
      action: startAction,
      accepted: true,
      screenBefore: "title",
      screenAfter: "squad",
      state: started,
    });
  });

  it("creates a compact production event without copying complete game state", () => {
    const action = { type: "START_RUN", seed: 42 } as const;
    const started = gameReducer(initialGameState, action);
    const event = createProductionTelemetryEvent(action, initialGameState, started, {
      at: "2026-07-20T00:00:00.000Z",
      sequence: 1,
      elapsedMs: 12,
    });

    expect(event).toMatchObject({
      schemaVersion: 1,
      type: "START_RUN",
      details: { seed: 42 },
      screenBefore: "title",
      screenAfter: "squad",
      snapshot: {
        screen: "squad",
        elapsedMs: 12,
        seed: 42,
        squad: [],
        cardsPlayed: 0,
      },
    });
    expect(event).not.toHaveProperty("state");
    expect(event).not.toHaveProperty("sessionId");
  });

  it("summarizes only anonymous gameplay facts", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN", seed: 7 });
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId: "paul" });
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId: "odin" });
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId: "madi" });
    state = gameReducer(state, { type: "CONFIRM_SQUAD" });

    expect(createProductionRunSnapshot(state, 1_500)).toMatchObject({
      elapsedMs: 1_500,
      squad: ["paul", "odin", "madi"],
      deckSize: 10,
      encounters: 0,
      tasksShipped: 0,
    });
  });

  it("preserves the completed run summary when returning to the title", () => {
    const started = gameReducer(initialGameState, { type: "START_RUN", seed: 12 });
    const completed: GameState = {
      ...started,
      screen: { name: "retro", outcome: "victory" },
    };
    const action = { type: "RETURN_TITLE" } as const;
    const returned = gameReducer(completed, action);

    const event = createProductionTelemetryEvent(action, completed, returned, {
      at: "2026-07-20T00:00:00.000Z",
      sequence: 2,
      elapsedMs: 123_000,
    });

    expect(event).toMatchObject({
      screenBefore: "retro",
      screenAfter: "title",
      snapshot: {
        screen: "retro",
        outcome: "victory",
        seed: 12,
        elapsedMs: 123_000,
      },
    });
  });
});
