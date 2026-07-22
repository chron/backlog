import { describe, expect, it } from "vitest";
import {
  createGameActionLogEvent,
  createProductionRunSnapshot,
  createProductionTelemetryEvent,
} from "./actionLog";
import { getCardForInstance } from "../domain/content";
import { createShopInventory } from "../domain/shop";
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

  it("records stable content ids alongside transient interaction ids", () => {
    let state = gameReducer(initialGameState, { type: "START_RUN", seed: 7 });
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId: "paul" });
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId: "odin" });
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId: "madi" });
    state = gameReducer(state, { type: "CONFIRM_SQUAD" });
    const run = state.run!;
    const deckCard = run.deck[0]!;
    const cardId = getCardForInstance(deckCard).id;

    const playEvent = createProductionTelemetryEvent(
      { type: "PLAY_CARD", instanceId: deckCard.instanceId, target: { kind: "squad" } },
      state,
      state,
      { at: "2026-07-20T00:00:00.000Z", sequence: 2, elapsedMs: 20 },
    );
    expect(playEvent.details).toEqual({
      instanceId: deckCard.instanceId,
      cardId,
      targetKind: "squad",
    });

    const cycleState = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
    const generatedState: GameState = {
      ...cycleState,
      run: {
        ...cycleState.run!,
        cycle: {
          ...cycleState.run!.cycle!,
          hand: [{ cardId: "snippet", instanceId: "generated-telemetry", generated: true }],
        },
      },
    };
    expect(
      createProductionTelemetryEvent(
        {
          type: "PLAY_CARD",
          instanceId: "generated-telemetry",
          target: { kind: "squad" },
        },
        generatedState,
        generatedState,
        { at: "2026-07-20T00:00:00.500Z", sequence: 3, elapsedMs: 500 },
      ).details,
    ).toEqual({ instanceId: "generated-telemetry", cardId: "snippet", targetKind: "squad" });

    const inventory = createShopInventory(run, "shop-test");
    const shopState: GameState = {
      screen: { name: "shop", nodeId: "shop-test", inventory },
      run,
    };
    const cardOffer = inventory.cardOffers[0]!;
    const toolOffer = inventory.toolOffers[0]!;
    expect(
      createProductionTelemetryEvent(
        { type: "BUY_SHOP_CARD", offerId: cardOffer.id },
        shopState,
        shopState,
        { at: "2026-07-20T00:00:01.000Z", sequence: 4, elapsedMs: 1_000 },
      ).details,
    ).toEqual({ offerId: cardOffer.id, cardId: cardOffer.cardId });
    expect(
      createProductionTelemetryEvent(
        { type: "BUY_SHOP_TOOL", offerId: toolOffer.id },
        shopState,
        shopState,
        { at: "2026-07-20T00:00:02.000Z", sequence: 5, elapsedMs: 2_000 },
      ).details,
    ).toEqual({ offerId: toolOffer.id, toolId: toolOffer.toolId });
    expect(
      createProductionTelemetryEvent(
        { type: "BUY_SHOP_SERVICE", serviceId: "refactor", instanceId: deckCard.instanceId },
        shopState,
        shopState,
        { at: "2026-07-20T00:00:03.000Z", sequence: 6, elapsedMs: 3_000 },
      ).details,
    ).toEqual({ serviceId: "refactor", instanceId: deckCard.instanceId, cardId });

    const eventState: GameState = {
      screen: {
        name: "event",
        nodeId: "event-test",
        eventId: "quarterly-connect",
        resolution: {
          choiceId: "choice-test",
          effectIndex: 0,
          outcome: [],
          pending: {
            effectIndex: 0,
            kind: "card",
            prompt: "Remove a card",
            options: [{ id: deckCard.instanceId, label: "Card", cardId }],
          },
        },
      },
      run,
    };
    expect(
      createProductionTelemetryEvent(
        { type: "CHOOSE_EVENT_OPTION", optionId: deckCard.instanceId },
        eventState,
        eventState,
        { at: "2026-07-20T00:00:04.000Z", sequence: 7, elapsedMs: 4_000 },
      ).details,
    ).toEqual({ optionId: deckCard.instanceId, cardId });

    const weekendState: GameState = {
      screen: { name: "weekend", nodeId: "weekend-test" },
      run,
    };
    expect(
      createProductionTelemetryEvent(
        {
          type: "CHOOSE_WEEKEND",
          choiceId: "refactor",
          instanceId: deckCard.instanceId,
        },
        weekendState,
        weekendState,
        { at: "2026-07-20T00:00:05.000Z", sequence: 8, elapsedMs: 5_000 },
      ).details,
    ).toEqual({ choiceId: "refactor", instanceId: deckCard.instanceId, cardId });
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
