import { describe, expect, it } from "vitest";
import { getCard } from "../domain/content";
import type { CardDefinition, CardInstance, DeveloperId } from "../domain/models";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";
import { useTestCycle } from "./testSupport";

const tokenIds = ["snippet", "quick-fix", "comment", "checklist"] as const;

const tokenGenerator: CardDefinition = {
  id: "test-token-generator",
  name: "Token Generator",
  cost: 0,
  kind: "tactic",
  amount: 0,
  generatedCards: tokenIds.map((cardId) => ({ cardId, count: 1 })),
  rules: "Generate every shared token.",
  tags: [],
};

function startCycle(): GameState {
  const squad: readonly DeveloperId[] = ["paul", "irene", "madi"];
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 0x70ce });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  state = useTestCycle(state, "quick-win");
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  const generator: CardInstance = {
    cardId: tokenGenerator.id,
    dynamicDefinition: tokenGenerator,
    instanceId: "token-generator-1",
  };
  return {
    ...state,
    run: {
      ...state.run,
      cycle: { ...state.run.cycle, focus: 20, hand: [generator] },
    },
  };
}

function generateTokens(state: GameState): GameState {
  return gameReducer(state, {
    type: "PLAY_CARD",
    instanceId: "token-generator-1",
    target: { kind: "squad" },
  });
}

function play(
  state: GameState,
  cardId: (typeof tokenIds)[number],
  target: { kind: "squad" } | { taskId: string; discipline?: "frontend" },
): GameState {
  const instance = state.run?.cycle?.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Expected ${cardId}`);
  return gameReducer(state, { type: "PLAY_CARD", instanceId: instance.instanceId, target });
}

describe("shared Generated token vocabulary", () => {
  it("authors four zero-cost Exhaust tokens with distinct tactical roles", () => {
    expect(tokenIds.map((id) => getCard(id))).toEqual([
      expect.objectContaining({
        id: "snippet",
        cost: 0,
        kind: "work",
        amount: 1,
        workKind: "verified",
        exhaust: true,
      }),
      expect.objectContaining({
        id: "quick-fix",
        cost: 0,
        kind: "work",
        amount: 2,
        workKind: "unverified",
        exhaust: true,
      }),
      expect.objectContaining({
        id: "comment",
        cost: 0,
        kind: "review",
        amount: 1,
        exhaust: true,
      }),
      expect.objectContaining({
        id: "checklist",
        cost: 0,
        kind: "tactic",
        block: 1,
        exhaust: true,
      }),
    ]);
    for (const tokenId of tokenIds) {
      expect(getCard(tokenId).tags).toEqual(expect.arrayContaining(["generated", "exhaust"]));
    }
  });

  it("generates mixed tokens deterministically and lets each play into Exhaust", () => {
    let state = generateTokens(startCycle());
    expect(state.run?.cycle?.hand.map((card) => card.cardId)).toEqual(tokenIds);
    expect(
      state.run?.cycle?.hand.every(
        (card) => card.generatedBy?.sourceCardId === "test-token-generator",
      ),
    ).toBe(true);

    state = play(state, "snippet", { taskId: "status-composer", discipline: "frontend" });
    state = play(state, "quick-fix", { taskId: "status-composer", discipline: "frontend" });
    state = play(state, "comment", { taskId: "status-composer" });
    state = play(state, "checklist", { kind: "squad" });

    expect(state.run?.cycle?.exhaustPile.map((card) => card.cardId)).toEqual(tokenIds);
    expect(state.run?.cycle).toMatchObject({
      block: 1,
      generatedCardsPlayedThisDay: 4,
      generatedCardsPlayedThisCycle: 4,
      cardsExhaustedThisDay: 4,
    });
  });

  it("discards unplayed Generated cards normally and removes them at Cycle end", () => {
    let state = generateTokens(startCycle());
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle?.discardPile.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([...tokenIds]),
    );

    if (!state.run?.cycle) throw new Error("Expected an active Cycle");
    state = {
      ...state,
      run: { ...state.run, cycle: { ...state.run.cycle, day: 5 } },
    };
    state = gameReducer(state, { type: "END_DAY" });
    expect(state.run?.cycle).toBeNull();
    expect(state.run?.deck.some((card) => tokenIds.includes(card.cardId as never))).toBe(false);
  });
});
