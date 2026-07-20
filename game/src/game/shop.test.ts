import { describe, expect, it } from "vitest";
import { getCard } from "../domain/content";
import { canDuplicateCard, canRefactorCard, createShopInventory } from "../domain/shop";
import { reconcileTechDebt } from "./eventResolution";
import { gameReducer, initialGameState, type GameState } from "./gameReducer";

function startShop(credits = 300, seed = 0x5eed1234): GameState {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of ["paul", "odin", "madi"] as const) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  if (!state.run) throw new Error("Expected a run");
  state = {
    screen: { name: "map" },
    run: {
      ...state.run,
      credits,
      currentNodeId: "cycle-safe-1",
      completedNodeIds: ["cycle-1", "event-1", "cycle-2", "cycle-safe-1"],
    },
  };
  return gameReducer(state, { type: "VISIT_NODE", nodeId: "shop-1" });
}

describe("Sharkimedes marketplace", () => {
  it("builds deterministic squad, wildcard, and Tool stock without consuming run RNG", () => {
    const first = startShop(300, 42);
    const second = startShop(300, 42);
    if (first.screen.name !== "shop" || second.screen.name !== "shop" || !first.run) {
      throw new Error("Expected a Shop");
    }

    expect(first.screen.inventory).toEqual(second.screen.inventory);
    expect(first.run.rngState).toBe(42);
    expect(first.screen.inventory.cardOffers).toHaveLength(4);
    expect(
      first.screen.inventory.cardOffers.slice(0, 3).map((offer) => getCard(offer.cardId).ownerId),
    ).toEqual(["paul", "odin", "madi"]);
    expect(first.screen.inventory.cardOffers[3]).toMatchObject({ kind: "wildcard", price: 55 });
    expect(first.screen.inventory.toolOffers).toHaveLength(2);
  });

  it("spends Credits, installs cards and Tools, and marks exact offers sold", () => {
    let state = startShop();
    if (state.screen.name !== "shop" || !state.run) throw new Error("Expected a Shop");
    const cardOffer = state.screen.inventory.cardOffers[0]!;
    const toolOffer = state.screen.inventory.toolOffers[0]!;
    const startingDeck = state.run.deck.length;

    state = gameReducer(state, { type: "BUY_SHOP_CARD", offerId: cardOffer.id });
    expect(state.run?.credits).toBe(300 - cardOffer.price);
    expect(state.run?.deck).toHaveLength(startingDeck + 1);
    expect(state.run?.deck.at(-1)?.cardId).toBe(cardOffer.cardId);
    expect(state.screen.name === "shop" && state.screen.inventory.purchasedOfferIds).toContain(
      cardOffer.id,
    );

    state = gameReducer(state, { type: "BUY_SHOP_TOOL", offerId: toolOffer.id });
    expect(state.run?.credits).toBe(300 - cardOffer.price - toolOffer.price);
    expect(state.run?.tools).toContain(toolOffer.toolId);
    expect(state.run?.history.at(-1)).toEqual({
      kind: "tool-added",
      toolId: toolOffer.toolId,
      sourceNodeId: "shop-1",
    });
  });

  it("rejects sold, spoofed, and unaffordable purchases", () => {
    let state = startShop(0);
    if (state.screen.name !== "shop" || !state.run) throw new Error("Expected a Shop");
    const offer = state.screen.inventory.cardOffers[0]!;

    expect(gameReducer(state, { type: "BUY_SHOP_CARD", offerId: offer.id })).toBe(state);
    expect(gameReducer(state, { type: "BUY_SHOP_CARD", offerId: "not-stock" })).toBe(state);

    state = { ...state, run: { ...state.run, credits: 300 } };
    state = gameReducer(state, { type: "BUY_SHOP_CARD", offerId: offer.id });
    expect(gameReducer(state, { type: "BUY_SHOP_CARD", offerId: offer.id })).toBe(state);
  });

  it("Refactors once, clones once, and repeatedly pays down Tech Debt", () => {
    let refactor = startShop();
    if (refactor.screen.name !== "shop" || !refactor.run) throw new Error("Expected a Shop");
    const removed = refactor.run.deck.find((card) => canRefactorCard(refactor.run!, card))!;
    refactor = gameReducer(refactor, {
      type: "BUY_SHOP_SERVICE",
      serviceId: "refactor",
      instanceId: removed.instanceId,
    });
    expect(refactor.run?.deck).not.toContainEqual(removed);
    expect(refactor.run?.credits).toBe(260);
    expect(refactor.screen.name === "shop" && refactor.screen.inventory.usedServiceIds).toContain(
      "refactor",
    );
    expect(
      gameReducer(refactor, {
        type: "BUY_SHOP_SERVICE",
        serviceId: "refactor",
        instanceId: refactor.run?.deck[0]?.instanceId,
      }),
    ).toBe(refactor);

    let clone = startShop();
    if (clone.screen.name !== "shop" || !clone.run) throw new Error("Expected a Shop");
    const source = clone.run.deck.find(canDuplicateCard)!;
    clone = gameReducer(clone, {
      type: "BUY_SHOP_SERVICE",
      serviceId: "duplicate",
      instanceId: source.instanceId,
    });
    expect(clone.run?.deck.filter((card) => card.cardId === source.cardId)).toHaveLength(
      startShop().run!.deck.filter((card) => card.cardId === source.cardId).length + 1,
    );
    expect(clone.run?.credits).toBe(230);

    let debt = startShop();
    if (!debt.run) throw new Error("Expected a run");
    debt = { ...debt, run: reconcileTechDebt(debt.run, 6) };
    if (!debt.run) throw new Error("Expected a run with Tech Debt");
    expect(debt.run.deck.filter((card) => card.cardId === "tech-debt")).toHaveLength(2);
    debt = gameReducer(debt, { type: "BUY_SHOP_SERVICE", serviceId: "debt-cleanup" });
    debt = gameReducer(debt, { type: "BUY_SHOP_SERVICE", serviceId: "debt-cleanup" });
    expect(debt.run).toMatchObject({ techDebt: 0, credits: 250 });
    expect(debt.run?.deck.some((card) => card.cardId === "tech-debt")).toBe(false);
  });

  it("lets Refactor remove a full Tech Debt card and its score", () => {
    let state = startShop();
    if (state.screen.name !== "shop" || !state.run) throw new Error("Expected a Shop");
    state = { ...state, run: reconcileTechDebt(state.run, 3) };
    if (!state.run) throw new Error("Expected a run with Tech Debt");
    const debt = state.run.deck.find((card) => card.cardId === "tech-debt");
    if (!debt) throw new Error("Expected Tech Debt in deck");

    state = gameReducer(state, {
      type: "BUY_SHOP_SERVICE",
      serviceId: "refactor",
      instanceId: debt.instanceId,
    });

    expect(state.run).toMatchObject({ techDebt: 0, credits: 260 });
    expect(state.run?.deck.some((card) => card.cardId === "tech-debt")).toBe(false);
  });

  it("refreshes stock at an escalating price while preserving used services", () => {
    let state = startShop();
    if (state.screen.name !== "shop" || !state.run) throw new Error("Expected a Shop");
    const removed = state.run.deck.find((card) => canRefactorCard(state.run!, card))!;
    state = gameReducer(state, {
      type: "BUY_SHOP_SERVICE",
      serviceId: "refactor",
      instanceId: removed.instanceId,
    });
    if (state.screen.name !== "shop") throw new Error("Expected a Shop");
    const original = state.screen.inventory.cardOffers.map((offer) => offer.cardId);

    state = gameReducer(state, { type: "REFRESH_SHOP" });

    if (state.screen.name !== "shop") throw new Error("Expected a Shop");
    expect(state.run?.credits).toBe(250);
    expect(state.screen.inventory.refreshCount).toBe(1);
    expect(state.screen.inventory.usedServiceIds).toContain("refactor");
    expect(state.screen.inventory.cardOffers.map((offer) => offer.cardId)).not.toEqual(original);
  });

  it("completes the Shop node only when leaving", () => {
    let state = startShop();
    expect(state.run?.completedNodeIds).not.toContain("shop-1");

    state = gameReducer(state, { type: "LEAVE_NODE" });

    expect(state.screen).toEqual({ name: "map" });
    expect(state.run?.completedNodeIds).toContain("shop-1");
  });

  it("keeps pure inventory generation stable for direct callers", () => {
    const state = startShop();
    if (!state.run) throw new Error("Expected a run");
    expect(createShopInventory(state.run, "shop-1", 2)).toEqual(
      createShopInventory(state.run, "shop-1", 2),
    );
  });
});
