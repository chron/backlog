/**
 * Best-effort gameplay observability at the reducer boundary.
 *
 * Development keeps complete post-action state in local JSONL files. Production
 * sends a compact, anonymous action stream to the same-origin telemetry Function.
 * Neither sink is allowed to interfere with play.
 */

import type { GameAction, GameState } from "./gameReducer";
import { getCardForInstance } from "../domain/content";
import type { CardInstance } from "../domain/models";
import { loadTelemetryPreference } from "../settings/settingsStore";
import {
  maxTelemetryEventsPerBatch,
  telemetrySchemaVersion,
  type ProductionRunSnapshot,
  type ProductionTelemetryBatch,
  type ProductionTelemetryEvent,
  type TelemetryDetails,
} from "../telemetry/contract";

const devEndpoint = "/__game-actions";
const productionEndpoint = "/api/telemetry";
const devFlushDelayMs = 250;
const productionFlushDelayMs = 5_000;

export interface GameActionLogEvent {
  schemaVersion: 1;
  at: string;
  runId: string;
  sessionId: string;
  sequence: number;
  type: GameAction["type"];
  action: GameAction;
  accepted: boolean;
  screenBefore: GameState["screen"]["name"];
  screenAfter: GameState["screen"]["name"];
  state: GameState;
}

export function createGameActionLogEvent(
  action: GameAction,
  stateBefore: GameState,
  stateAfter: GameState,
  context: { at: string; runId: string; sessionId: string; sequence: number },
): GameActionLogEvent {
  return {
    schemaVersion: 1,
    ...context,
    type: action.type,
    action,
    accepted: stateAfter !== stateBefore,
    screenBefore: stateBefore.screen.name,
    screenAfter: stateAfter.screen.name,
    state: stateAfter,
  };
}

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function freshRunId(): string {
  return `${new Date().toISOString().slice(0, 10)}-${randomId()}`;
}

function cardInstancesInState(state: GameState): readonly CardInstance[] {
  const run = state.run;
  const cycle = run?.cycle;
  return [
    ...(cycle?.hand ?? []),
    ...(cycle?.drawPile ?? []),
    ...(cycle?.discardPile ?? []),
    ...(cycle?.exhaustPile ?? []),
    ...(cycle?.pendingCardChoice?.selected ?? []),
    ...(run?.deck ?? []),
  ];
}

function cardIdForInstance(state: GameState, instanceId?: string): string | undefined {
  if (!instanceId) return undefined;
  const instance = cardInstancesInState(state).find(
    (candidate) => candidate.instanceId === instanceId,
  );
  return instance ? getCardForInstance(instance).id : undefined;
}

function productionActionDetails(action: GameAction, stateBefore: GameState): TelemetryDetails {
  switch (action.type) {
    case "START_RUN":
      return action.seed === undefined ? {} : { seed: action.seed };
    case "TOGGLE_DEVELOPER":
      return { developerId: action.developerId };
    case "VISIT_NODE":
      return { nodeId: action.nodeId };
    case "PLAY_CARD": {
      const cardId = cardIdForInstance(stateBefore, action.instanceId);
      if (action.target.kind === "discipline") {
        return {
          instanceId: action.instanceId,
          ...(cardId ? { cardId } : {}),
          targetKind: "discipline",
          targetDiscipline: action.target.discipline,
        };
      }
      if (action.target.kind) {
        return {
          instanceId: action.instanceId,
          ...(cardId ? { cardId } : {}),
          targetKind: action.target.kind,
        };
      }
      return {
        instanceId: action.instanceId,
        ...(cardId ? { cardId } : {}),
        targetKind: "task",
        targetTaskId: action.target.taskId,
      };
    }
    case "CHOOSE_CYCLE_CARD": {
      const cardId = cardIdForInstance(stateBefore, action.instanceId);
      return { instanceId: action.instanceId, ...(cardId ? { cardId } : {}) };
    }
    case "SHIP_TASK":
      return { targetTaskId: action.taskId };
    case "CHOOSE_CARD_REWARD":
      return { cardId: action.cardId };
    case "OFFER_TOOL_REWARD":
      return { sourceNodeId: action.sourceNodeId };
    case "CHOOSE_TOOL_REWARD":
      return { toolId: action.toolId };
    case "CHOOSE_EVENT":
      return { choiceId: action.choiceId };
    case "CHOOSE_EVENT_OPTION": {
      const option =
        stateBefore.screen.name === "event"
          ? stateBefore.screen.resolution?.pending.options.find(
              (candidate) => candidate.id === action.optionId,
            )
          : undefined;
      return {
        optionId: action.optionId,
        ...(option?.cardId ? { cardId: option.cardId } : {}),
        ...(option?.toolId ? { toolId: option.toolId } : {}),
      };
    }
    case "BUY_SHOP_CARD": {
      const offer =
        stateBefore.screen.name === "shop"
          ? stateBefore.screen.inventory.cardOffers.find(
              (candidate) => candidate.id === action.offerId,
            )
          : undefined;
      return { offerId: action.offerId, ...(offer ? { cardId: offer.cardId } : {}) };
    }
    case "BUY_SHOP_TOOL": {
      const offer =
        stateBefore.screen.name === "shop"
          ? stateBefore.screen.inventory.toolOffers.find(
              (candidate) => candidate.id === action.offerId,
            )
          : undefined;
      return { offerId: action.offerId, ...(offer ? { toolId: offer.toolId } : {}) };
    }
    case "BUY_SHOP_SERVICE": {
      const cardId = cardIdForInstance(stateBefore, action.instanceId);
      return {
        serviceId: action.serviceId,
        ...(action.instanceId ? { instanceId: action.instanceId } : {}),
        ...(cardId ? { cardId } : {}),
      };
    }
    case "CHOOSE_WEEKEND": {
      const cardId = action.cardId ?? cardIdForInstance(stateBefore, action.instanceId);
      return {
        choiceId: action.choiceId,
        ...(action.instanceId ? { instanceId: action.instanceId } : {}),
        ...(cardId ? { cardId } : {}),
      };
    }
    case "CONFIRM_SQUAD":
    case "RANDOMIZE_SQUAD":
    case "DEBUG_WIN_CYCLE":
    case "END_DAY":
    case "ACKNOWLEDGE_BOSS_TRANSITION":
    case "LAUNCH_FINAL_RELEASE":
    case "CONTINUE_REPORT":
    case "SKIP_CARD_REWARD":
    case "REFRESH_SHOP":
    case "LEAVE_NODE":
    case "RETURN_TITLE":
      return {};
  }
}

export function createProductionRunSnapshot(
  state: GameState,
  elapsedMs: number,
): ProductionRunSnapshot {
  const run = state.run;
  const history = run?.history ?? [];
  const cycleEvents = history.filter((event) => event.kind === "cycle-finished");
  const cardEvents = history.filter((event) => event.kind === "card-played");
  const taskEvents = history.filter((event) => event.kind === "task-shipped");
  const tasks = run?.cycle?.tasks ?? [];
  const retro = state.screen.name === "retro" ? state.screen : undefined;
  return {
    screen: state.screen.name,
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
    seed: run?.seed,
    squad: run?.squad ?? [],
    bossId: run?.selectedBossId,
    outcome: retro?.outcome,
    cause: retro?.cause,
    morale: run?.morale,
    maxMorale: run?.maxMorale,
    techDebt: run?.techDebt,
    credits: run?.credits,
    deckSize: run?.deck.length ?? 0,
    tools: run?.tools ?? [],
    currentNodeId: run?.currentNodeId ?? undefined,
    cycleId: run?.cycle?.cycleId,
    day: run?.cycle?.day,
    focus: run?.cycle?.focus,
    block: run?.cycle?.block,
    openTasks: tasks.filter((task) => task.status === "open").length,
    readyTasks: tasks.filter((task) => task.status === "ready").length,
    shippedTasks: tasks.filter((task) => task.status === "shipped").length,
    encounters: cycleEvents.length + (state.screen.name === "cycle" ? 1 : 0),
    cyclesShipped: cycleEvents.filter((event) => event.outcome === "shipped").length,
    cyclesMissed: cycleEvents.filter((event) => event.outcome === "missed").length,
    days: cycleEvents.reduce((sum, event) => sum + event.day, 0),
    cardsPlayed: cardEvents.length,
    generatedCardsPlayed: cardEvents.filter((event) => event.generated).length,
    cardsExhausted: cardEvents.filter((event) => event.exhausted).length,
    tasksShipped: taskEvents.length,
    defects: taskEvents.reduce((sum, event) => sum + event.defects, 0),
  };
}

export function createProductionTelemetryEvent(
  action: GameAction,
  stateBefore: GameState,
  stateAfter: GameState,
  context: { at: string; sequence: number; elapsedMs: number },
): ProductionTelemetryEvent {
  // Returning to the title clears the run. Preserve the final run summary while
  // still recording the screen transition so the completed result is not erased.
  const snapshotState =
    action.type === "RETURN_TITLE" && stateBefore.run ? stateBefore : stateAfter;

  return {
    schemaVersion: telemetrySchemaVersion,
    at: context.at,
    sequence: context.sequence,
    type: action.type,
    accepted: stateAfter !== stateBefore,
    screenBefore: stateBefore.screen.name,
    screenAfter: stateAfter.screen.name,
    details: productionActionDetails(action, stateBefore),
    snapshot: createProductionRunSnapshot(snapshotState, context.elapsedMs),
  };
}

const sessionId = randomId();
let runId: string | undefined;
let runStartedAt = 0;
let sequence = 0;
let devQueue: GameActionLogEvent[] = [];
let productionQueue: ProductionTelemetryEvent[] = [];
let devFlushTimer: ReturnType<typeof setTimeout> | undefined;
let productionFlushTimer: ReturnType<typeof setTimeout> | undefined;

function sendDevEvents(events: readonly GameActionLogEvent[], useBeacon: boolean): void {
  if (!runId || events.length === 0) return;
  const payload = JSON.stringify({ runId, events });
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(devEndpoint, payload);
    } else {
      void fetch(devEndpoint, { method: "POST", body: payload, keepalive: true }).catch(
        () => undefined,
      );
    }
  } catch {
    // The Vite sink can be unavailable without affecting gameplay.
  }
}

function flushDev(useBeacon = false): void {
  if (devFlushTimer) {
    clearTimeout(devFlushTimer);
    devFlushTimer = undefined;
  }
  if (devQueue.length === 0) return;
  const events = devQueue;
  devQueue = [];
  sendDevEvents(events, useBeacon);
}

function sendProductionBatch(
  events: readonly ProductionTelemetryEvent[],
  useBeacon: boolean,
): void {
  if (!runId || events.length === 0 || !loadTelemetryPreference()) return;
  const batch: ProductionTelemetryBatch = {
    schemaVersion: telemetrySchemaVersion,
    runId,
    events,
  };
  const payload = JSON.stringify(batch);
  try {
    if (useBeacon && navigator.sendBeacon) {
      const queued = navigator.sendBeacon(
        productionEndpoint,
        new Blob([payload], { type: "application/json" }),
      );
      if (queued) return;
    }
    void fetch(productionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Anonymous telemetry is always best-effort.
  }
}

function flushProduction(useBeacon = false): void {
  if (productionFlushTimer) {
    clearTimeout(productionFlushTimer);
    productionFlushTimer = undefined;
  }
  if (productionQueue.length === 0) return;
  const events = productionQueue;
  productionQueue = [];
  for (let index = 0; index < events.length; index += maxTelemetryEventsPerBatch) {
    sendProductionBatch(events.slice(index, index + maxTelemetryEventsPerBatch), useBeacon);
  }
}

export function discardQueuedProductionTelemetry(): void {
  if (productionFlushTimer) clearTimeout(productionFlushTimer);
  productionFlushTimer = undefined;
  productionQueue = [];
}

export function logGameAction(
  action: GameAction,
  stateBefore: GameState,
  stateAfter: GameState,
): void {
  if (typeof window === "undefined") return;

  if (action.type === "START_RUN") {
    if (import.meta.env.DEV) flushDev();
    if (import.meta.env.PROD) flushProduction();
    runId = freshRunId();
    runStartedAt = Date.now();
    sequence = 0;
  }
  if (!runId) return;

  sequence += 1;
  const at = new Date().toISOString();

  if (import.meta.env.DEV) {
    devQueue.push(
      createGameActionLogEvent(action, stateBefore, stateAfter, {
        at,
        runId,
        sessionId,
        sequence,
      }),
    );
    if (!devFlushTimer) devFlushTimer = setTimeout(flushDev, devFlushDelayMs);
  }

  if (import.meta.env.PROD && loadTelemetryPreference()) {
    productionQueue.push(
      createProductionTelemetryEvent(action, stateBefore, stateAfter, {
        at,
        sequence,
        elapsedMs: Date.now() - runStartedAt,
      }),
    );
    if (
      stateAfter.screen.name === "retro" ||
      productionQueue.length >= maxTelemetryEventsPerBatch
    ) {
      flushProduction();
    } else if (!productionFlushTimer) {
      productionFlushTimer = setTimeout(flushProduction, productionFlushDelayMs);
    }
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    if (import.meta.env.DEV) flushDev(true);
    if (import.meta.env.PROD) flushProduction(true);
  });
  window.addEventListener("pagehide", () => {
    if (import.meta.env.DEV) flushDev(true);
    if (import.meta.env.PROD) flushProduction(true);
  });
}
