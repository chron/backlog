import { getCard, getCardForInstance, squadRewardCardIds, standardToolIds } from "./content";
import type { CardInstance, DeveloperId, RunState, ToolId } from "./models";
import { normalizeSeed, sampleOne } from "../game/random";

export type ShopServiceId = "refactor" | "duplicate" | "debt-cleanup";

export interface ShopCardOffer {
  id: string;
  cardId: string;
  kind: "squad" | "wildcard";
  price: number;
}

export interface ShopToolOffer {
  id: string;
  toolId: ToolId;
  price: number;
}

export interface ShopInventoryState {
  cardOffers: readonly ShopCardOffer[];
  toolOffers: readonly ShopToolOffer[];
  refreshCount: number;
  purchasedOfferIds: readonly string[];
  usedServiceIds: readonly ShopServiceId[];
}

export const shopServicePrices: Readonly<Record<ShopServiceId, number>> = {
  refactor: 40,
  duplicate: 70,
  "debt-cleanup": 25,
};

export const minimumDeckSize = 5;

export function canRefactorCard(run: RunState, instance: CardInstance): boolean {
  return run.deck.length > minimumDeckSize && instance.cardId !== "tech-debt";
}

export function canDuplicateCard(instance: CardInstance): boolean {
  const card = getCardForInstance(instance);
  return (
    card.rarity !== "rare" &&
    !card.tags.includes("rare") &&
    !card.tags.includes("status") &&
    !card.tags.includes("generated")
  );
}

function stringHash(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function inventorySeed(run: RunState, nodeId: string, refreshCount: number): number {
  return normalizeSeed(run.seed ^ stringHash(nodeId) ^ Math.imul(refreshCount + 1, 0x45d9f3b));
}

function pickOne<T>(pool: readonly T[], rngState: number): { item?: T; rngState: number } {
  if (pool.length === 0) return { rngState };
  return sampleOne(pool, rngState);
}

function cardPrice(cardId: string, kind: ShopCardOffer["kind"]): number {
  const card = getCard(cardId);
  if (card.rarity === "rare" || card.tags.includes("rare")) return 90;
  return kind === "wildcard" ? 55 : 45;
}

function ownerPool(ownerId: DeveloperId): readonly string[] {
  return squadRewardCardIds.filter((cardId) => getCard(cardId).ownerId === ownerId);
}

export function shopRefreshPrice(refreshCount: number): number {
  return Math.min(40, 10 * 2 ** refreshCount);
}

export function createShopInventory(
  run: RunState,
  nodeId: string,
  refreshCount = 0,
  usedServiceIds: readonly ShopServiceId[] = [],
): ShopInventoryState {
  let rngState = inventorySeed(run, nodeId, refreshCount);
  const cardOffers: ShopCardOffer[] = [];

  for (const ownerId of run.squad) {
    const pick = pickOne(ownerPool(ownerId), rngState);
    rngState = pick.rngState;
    if (!pick.item) continue;
    cardOffers.push({
      id: `card-${refreshCount}-${ownerId}`,
      cardId: pick.item,
      kind: "squad",
      price: cardPrice(pick.item, "squad"),
    });
  }

  const wildcardPool = squadRewardCardIds.filter((cardId) => {
    const ownerId = getCard(cardId).ownerId;
    return ownerId && !run.squad.includes(ownerId);
  });
  const wildcard = pickOne(wildcardPool, rngState);
  rngState = wildcard.rngState;
  if (wildcard.item) {
    cardOffers.push({
      id: `card-${refreshCount}-wildcard`,
      cardId: wildcard.item,
      kind: "wildcard",
      price: cardPrice(wildcard.item, "wildcard"),
    });
  }

  const availableTools = standardToolIds.filter((toolId) => !run.tools.includes(toolId));
  const toolOffers: ShopToolOffer[] = [];
  const remainingTools = [...availableTools];
  while (toolOffers.length < 2 && remainingTools.length > 0) {
    const pick = sampleOne(remainingTools, rngState);
    rngState = pick.rngState;
    toolOffers.push({
      id: `tool-${refreshCount}-${toolOffers.length}`,
      toolId: pick.item,
      price: 100,
    });
    remainingTools.splice(remainingTools.indexOf(pick.item), 1);
  }

  return {
    cardOffers,
    toolOffers,
    refreshCount,
    purchasedOfferIds: [],
    usedServiceIds: [...usedServiceIds],
  };
}
