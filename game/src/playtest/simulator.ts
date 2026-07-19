import { getCard, getCardForInstance, isMapNodeAvailable, mapNodes } from "../domain/content";
import { getEvent } from "../domain/events";
import { getEncounterCycleDefinition } from "../domain/bosses";
import type {
  CardDefinition,
  CardInstance,
  CardTag,
  DeveloperId,
  Discipline,
  MapNode,
  RunState,
} from "../domain/models";
import { canRefactorCard } from "../domain/shop";
import { getWeekendChoiceState } from "../domain/weekend";
import {
  gameReducer,
  initialGameState,
  type GameAction,
  type GameState,
} from "../game/gameReducer";
import {
  effectiveCardCost,
  incomingMorale,
  isTaskReady,
  resolveCardTarget,
  taskShippingPreview,
  type CardTarget,
} from "../game/rules";

// Deliberately exported as data: the CLI and regression tests use the same
// scenarios, and adding a build should be one small catalogue change.
export interface PlaytestScenario {
  id: string;
  name: string;
  squad: readonly [DeveloperId, DeveloperId, DeveloperId];
  bonusCardIds: readonly string[];
  preferredTags: readonly CardTag[];
  expectedSignal: "cards" | "automation" | "completion" | "block" | "debt" | "chain";
}

export const playtestScenarios: readonly PlaytestScenario[] = [
  {
    id: "card-storm",
    name: "Card Storm",
    squad: ["kirsten", "nick", "levi"],
    bonusCardIds: [
      "it-all-adds-up",
      "on-a-roll",
      "deep-work",
      "no-meetings",
      "tiny-commit",
      "context-loaded",
    ],
    preferredTags: ["generated", "exhaust"],
    expectedSignal: "cards",
  },
  {
    id: "automation",
    name: "Automation",
    squad: ["madi", "steph", "toby"],
    bonusCardIds: [
      "custom-toolchain",
      "agentic-loop",
      "automate-this-bit",
      "hot-reload",
      "useful-alerting",
      "keep-it-humming",
    ],
    preferredTags: ["automation", "defense"],
    expectedSignal: "automation",
  },
  {
    id: "completion-cascade",
    name: "Completion Cascade",
    squad: ["seb", "irene", "matt"],
    bonusCardIds: [
      "design-tokens",
      "used-everywhere",
      "last-10-percent",
      "no-fuss",
      "one-more-pass",
      "microinteraction",
    ],
    preferredTags: ["review", "flexible"],
    expectedSignal: "completion",
  },
  {
    id: "block-engine",
    name: "Block Engine",
    squad: ["elspeth", "toby", "steph"],
    bonusCardIds: [
      "psychological-safety",
      "room-to-breathe",
      "on-call",
      "useful-alerting",
      "guardrails-not-gatekeepers",
      "healthy-guardrails",
    ],
    preferredTags: ["defense", "automation"],
    expectedSignal: "block",
  },
  {
    id: "ship-fast",
    name: "Ship Fast, Clean Later",
    squad: ["paul", "madi", "odin"],
    bonusCardIds: [
      "spike-it",
      "new-model-dropped",
      "agentic-loop",
      "parallel-agents",
      "approved-with-comments",
      "manual-mode",
    ],
    preferredTags: ["ai-assisted", "review"],
    expectedSignal: "debt",
  },
  {
    id: "planned-burst",
    name: "Planned Burst",
    squad: ["nick", "odin", "levi"],
    bonusCardIds: [
      "put-a-pin-in-it",
      "deep-work",
      "one-more-diagram",
      "strong-opinions-loosely-held",
      "keep-the-thread",
      "flow-state",
    ],
    preferredTags: ["review", "exhaust"],
    expectedSignal: "chain",
  },
] as const;

export type PlaytestPolicy = "balanced" | "velocity" | "careful";

export interface PlaytestRunResult {
  schemaVersion: 1;
  scenarioId: string;
  scenarioName: string;
  policy: PlaytestPolicy;
  seed: number;
  squad: readonly DeveloperId[];
  bossId: string;
  outcome: "victory" | "defeat" | "stalled";
  cause?: string;
  encounters: number;
  cyclesShipped: number;
  cyclesMissed: number;
  days: number;
  actions: number;
  cardsPlayed: number;
  generatedCardsPlayed: number;
  cardsExhausted: number;
  maxCardsInDay: number;
  focusGained: number;
  blockGained: number;
  blockPrevented: number;
  moraleLost: number;
  endingMorale: number;
  endingTechDebt: number;
  maxTechDebt: number;
  defects: number;
  tasksShipped: number;
  requirementsCompleted: number;
  automationInstalled: number;
  guardsInstalled: number;
  peakChain: number;
  deadHands: number;
  loopGuardTrips: number;
  tools: readonly string[];
  deckSize: number;
}

interface MutableMetrics {
  actions: number;
  encounters: number;
  cyclesShipped: number;
  cyclesMissed: number;
  days: number;
  cardsPlayed: number;
  generatedCardsPlayed: number;
  cardsExhausted: number;
  maxCardsInDay: number;
  focusGained: number;
  blockGained: number;
  blockPrevented: number;
  moraleLost: number;
  maxTechDebt: number;
  defects: number;
  tasksShipped: number;
  requirementsCompleted: number;
  automationInstalled: number;
  guardsInstalled: number;
  peakChain: number;
  deadHands: number;
  loopGuardTrips: number;
}

interface CandidateAction {
  action: GameAction;
  state: GameState;
  score: number;
}

const disciplines = ["frontend", "backend", "infra"] as const satisfies readonly Discipline[];
const maxRunActions = 5_000;
const maxCardPlaysPerDay = 120;

function createMetrics(): MutableMetrics {
  return {
    actions: 0,
    encounters: 0,
    cyclesShipped: 0,
    cyclesMissed: 0,
    days: 0,
    cardsPlayed: 0,
    generatedCardsPlayed: 0,
    cardsExhausted: 0,
    maxCardsInDay: 0,
    focusGained: 0,
    blockGained: 0,
    blockPrevented: 0,
    moraleLost: 0,
    maxTechDebt: 0,
    defects: 0,
    tasksShipped: 0,
    requirementsCompleted: 0,
    automationInstalled: 0,
    guardsInstalled: 0,
    peakChain: 0,
    deadHands: 0,
    loopGuardTrips: 0,
  };
}

function totalWork(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        sum +
        task.requirements.reduce(
          (taskSum, requirement) =>
            taskSum + Math.min(requirement.target, requirement.verified + requirement.unverified),
          0,
        ),
      0,
    ) ?? 0
  );
}

function verifiedWork(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        sum +
        task.requirements.reduce(
          (taskSum, requirement) => taskSum + Math.min(requirement.target, requirement.verified),
          0,
        ),
      0,
    ) ?? 0
  );
}

function completedRequirements(run: RunState | null): number {
  return (
    run?.cycle?.tasks.reduce(
      (sum, task) =>
        sum +
        task.requirements.filter(
          (requirement) => requirement.verified + requirement.unverified >= requirement.target,
        ).length,
      0,
    ) ?? 0
  );
}

function automationMeters(run: RunState | null): { scripts: number; guards: number } {
  const requirements = run?.cycle?.tasks.flatMap((task) => task.requirements) ?? [];
  return requirements.reduce(
    (sum, requirement) => ({
      scripts: sum.scripts + requirement.scriptPower,
      guards: sum.guards + requirement.scriptBlock,
    }),
    { scripts: 0, guards: 0 },
  );
}

function readyTasks(run: RunState | null): number {
  return run?.cycle?.tasks.filter(isTaskReady).length ?? 0;
}

function stunnedTasks(run: RunState | null): number {
  return run?.cycle?.tasks.filter((task) => task.stunned).length ?? 0;
}

function candidateScore(
  before: GameState,
  after: GameState,
  card: CardDefinition,
  policy: PlaytestPolicy,
): number {
  const progress = totalWork(after.run) - totalWork(before.run);
  const verified = verifiedWork(after.run) - verifiedWork(before.run);
  const completions = completedRequirements(after.run) - completedRequirements(before.run);
  const ready = readyTasks(after.run) - readyTasks(before.run);
  const automationBefore = automationMeters(before.run);
  const automationAfter = automationMeters(after.run);
  const scripts = automationAfter.scripts - automationBefore.scripts;
  const guards = automationAfter.guards - automationBefore.guards;
  const block = (after.run?.cycle?.block ?? 0) - (before.run?.cycle?.block ?? 0);
  const hand = (after.run?.cycle?.hand.length ?? 0) - (before.run?.cycle?.hand.length ?? 0);
  const debt = (after.run?.techDebt ?? 0) - (before.run?.techDebt ?? 0);
  const stuns = stunnedTasks(after.run) - stunnedTasks(before.run);
  const qualityWeight = policy === "careful" ? 4 : policy === "velocity" ? 1 : 2.5;
  const blockWeight = policy === "careful" ? 3 : policy === "velocity" ? 0.8 : 1.8;
  const debtWeight = policy === "careful" ? 5 : policy === "velocity" ? 0.5 : 2;
  const setup =
    (card.generatedCards ? 2 : 0) +
    (card.cardsDrawn ?? 0) * 1.5 +
    (card.nextDayCardsDrawn ?? 0) +
    (card.focusGained ?? 0) * 2 +
    (card.retainHandTarget ? 1.5 : 0) +
    (card.cycleWorkBonus || card.dayWorkBonus ? 2 : 0);

  return (
    progress * 8 +
    verified * qualityWeight +
    completions * 10 +
    ready * 12 +
    scripts * 5 +
    guards * 3 +
    Math.max(0, block) * blockWeight +
    Math.max(0, hand) * 1.5 +
    stuns * 5 -
    debt * debtWeight +
    setup +
    0.01
  );
}

function cardTargets(state: GameState, instance: CardInstance): CardTarget[] {
  const cycle = state.run?.cycle;
  if (!cycle) return [];
  const targets: CardTarget[] = [{ kind: "squad" }];
  for (const discipline of disciplines) targets.push({ kind: "discipline", discipline });
  for (const task of cycle.tasks) {
    if (task.status === "shipped") continue;
    targets.push({ kind: "task", taskId: task.taskId });
    for (const requirement of task.requirements) {
      targets.push({ kind: "task", taskId: task.taskId, discipline: requirement.discipline });
    }
  }
  for (const other of cycle.hand) {
    if (other.instanceId !== instance.instanceId) {
      targets.push({ kind: "hand-card", instanceId: other.instanceId });
    }
  }
  for (const exhausted of cycle.exhaustPile) {
    targets.push({ kind: "exhaust-card", instanceId: exhausted.instanceId });
  }
  return targets;
}

function playableCandidates(state: GameState, policy: PlaytestPolicy): CandidateAction[] {
  const cycle = state.run?.cycle;
  if (state.screen.name !== "cycle" || !state.run || !cycle || cycle.pendingCardChoice) return [];
  const candidates: CandidateAction[] = [];
  for (const instance of cycle.hand) {
    const card = getCardForInstance(instance);
    for (const target of cardTargets(state, instance)) {
      if (!resolveCardTarget(state.run, instance, target).legal) continue;
      const action = { type: "PLAY_CARD", instanceId: instance.instanceId, target } as const;
      const next = gameReducer(state, action);
      if (next === state) continue;
      candidates.push({ action, state: next, score: candidateScore(state, next, card, policy) });
    }
  }
  return candidates.sort((left, right) => right.score - left.score);
}

function cardRewardScore(cardId: string, scenario: PlaytestScenario): number {
  const card = getCard(cardId);
  return (
    (card.ownerId && scenario.squad.includes(card.ownerId) ? 8 : 0) +
    (card.rarity === "rare" ? 5 : 0) +
    scenario.preferredTags.filter((tag) => card.tags.includes(tag)).length * 4 +
    (card.tags.includes("reward") ? 1 : 0) +
    Math.max(0, 3 - card.cost)
  );
}

function routeScore(node: MapNode): number {
  switch (node.kind) {
    case "retro":
    case "boss":
      return 100;
    case "weekend":
      return 90;
    case "shop":
      return 80;
    case "event":
      return 70;
    case "cycle":
      return node.id.includes("safe") ? 65 : 55;
    case "incident":
      return 20;
  }
}

function stateValue(state: GameState, scenario: PlaytestScenario): number {
  const run = state.run;
  if (!run) return Number.NEGATIVE_INFINITY;
  return (
    run.morale * 12 -
    run.techDebt * 3 +
    run.credits * 0.05 +
    run.tools.length * 8 +
    run.deck.reduce((sum, card) => sum + cardRewardScore(card.cardId, scenario) * 0.1, 0)
  );
}

function createBonusDeck(state: GameState, scenario: PlaytestScenario): GameState {
  if (!state.run) return state;
  const start = state.run.nextCardInstanceId;
  const bonusCards = scenario.bonusCardIds.map((cardId, index) => ({
    cardId,
    instanceId: `playtest-${start + index}`,
  }));
  return {
    ...state,
    run: {
      ...state.run,
      deck: [...state.run.deck, ...bonusCards],
      nextCardInstanceId: start + bonusCards.length,
    },
  };
}

function updateMetrics(
  metrics: MutableMetrics,
  before: GameState,
  action: GameAction,
  after: GameState,
): void {
  metrics.actions += 1;
  metrics.maxTechDebt = Math.max(metrics.maxTechDebt, after.run?.techDebt ?? 0);
  metrics.peakChain = Math.max(metrics.peakChain, after.run?.cycle?.peakChain ?? 0);

  if (action.type === "VISIT_NODE" && after.screen.name === "cycle") metrics.encounters += 1;

  if (action.type === "PLAY_CARD" && before.run?.cycle && after.run?.cycle) {
    const instance = before.run.cycle.hand.find((card) => card.instanceId === action.instanceId);
    if (instance) {
      const definition = getCardForInstance(instance);
      const cost = effectiveCardCost(definition, before.run.cycle, before.run.squad, instance);
      metrics.cardsPlayed += 1;
      if (instance.generated || instance.temporary) metrics.generatedCardsPlayed += 1;
      metrics.focusGained += Math.max(0, after.run.cycle.focus - (before.run.cycle.focus - cost));
      metrics.blockGained += Math.max(0, after.run.cycle.block - before.run.cycle.block);
      metrics.maxCardsInDay = Math.max(metrics.maxCardsInDay, after.run.cycle.cardsPlayedThisDay);
      const beforeAutomation = automationMeters(before.run);
      const afterAutomation = automationMeters(after.run);
      metrics.automationInstalled += Math.max(
        0,
        afterAutomation.scripts - beforeAutomation.scripts,
      );
      metrics.guardsInstalled += Math.max(0, afterAutomation.guards - beforeAutomation.guards);
      metrics.requirementsCompleted += Math.max(
        0,
        completedRequirements(after.run) - completedRequirements(before.run),
      );
    }
  }

  if (action.type === "SHIP_TASK" && before.run?.cycle) {
    const task = before.run.cycle.tasks.find((candidate) => candidate.taskId === action.taskId);
    if (task) {
      const preview = taskShippingPreview(task);
      metrics.blockPrevented += Math.min(before.run.cycle.block, preview.moraleLoss);
      metrics.tasksShipped += 1;
      metrics.defects += preview.defects;
    }
  }

  if (action.type === "END_DAY" && before.run?.cycle) {
    metrics.days += 1;
    metrics.blockPrevented += Math.min(
      before.run.cycle.block,
      incomingMorale(before.run, before.run.cycle),
    );
  }

  const moraleBefore = before.run?.morale ?? after.run?.morale ?? 0;
  const moraleAfter = after.run?.morale ?? moraleBefore;
  metrics.moraleLost += Math.max(0, moraleBefore - moraleAfter);

  const newHistory = after.run?.history.slice(before.run?.history.length ?? 0) ?? [];
  for (const event of newHistory) {
    if (event.kind === "cycle-finished") {
      if (event.outcome === "shipped") metrics.cyclesShipped += 1;
      else metrics.cyclesMissed += 1;
    }
    if (event.kind === "card-played" && event.exhausted) metrics.cardsExhausted += 1;
  }
}

function chooseBestTransition(
  state: GameState,
  actions: readonly GameAction[],
  scenario: PlaytestScenario,
): GameAction | undefined {
  return actions
    .map((action) => ({ action, state: gameReducer(state, action) }))
    .filter((candidate) => candidate.state !== state)
    .sort((left, right) => stateValue(right.state, scenario) - stateValue(left.state, scenario))[0]
    ?.action;
}

function nextNonCycleAction(state: GameState, scenario: PlaytestScenario): GameAction | undefined {
  if (!state.run) return undefined;
  switch (state.screen.name) {
    case "squad": {
      const missing = scenario.squad.find((developerId) => !state.run?.squad.includes(developerId));
      return missing
        ? { type: "TOGGLE_DEVELOPER", developerId: missing }
        : { type: "CONFIRM_SQUAD" };
    }
    case "map": {
      const available = mapNodes
        .filter((node) =>
          isMapNodeAvailable(node, state.run!.currentNodeId, state.run!.completedNodeIds),
        )
        .sort((left, right) => routeScore(right) - routeScore(left));
      return available[0] ? { type: "VISIT_NODE", nodeId: available[0].id } : undefined;
    }
    case "report":
      return { type: "CONTINUE_REPORT" };
    case "reward": {
      const cardId = [...(state.run.pendingCardReward?.cardIds ?? [])].sort(
        (left, right) => cardRewardScore(right, scenario) - cardRewardScore(left, scenario),
      )[0];
      return cardId ? { type: "CHOOSE_CARD_REWARD", cardId } : { type: "SKIP_CARD_REWARD" };
    }
    case "tool-reward": {
      const toolId = state.run.pendingToolReward?.toolIds[0];
      return toolId ? { type: "CHOOSE_TOOL_REWARD", toolId } : undefined;
    }
    case "event": {
      if (state.screen.resolution) {
        return chooseBestTransition(
          state,
          state.screen.resolution.pending.options.map((option) => ({
            type: "CHOOSE_EVENT_OPTION" as const,
            optionId: option.id,
          })),
          scenario,
        );
      }
      return chooseBestTransition(
        state,
        getEvent(state.screen.eventId).choices.map((choice) => ({
          type: "CHOOSE_EVENT" as const,
          choiceId: choice.id,
        })),
        scenario,
      );
    }
    case "shop": {
      const shopScreen = state.screen;
      const run = state.run;
      const unboughtTool = shopScreen.inventory.toolOffers.find(
        (offer) =>
          !shopScreen.inventory.purchasedOfferIds.includes(offer.id) &&
          !run.tools.includes(offer.toolId) &&
          run.credits >= offer.price,
      );
      if (unboughtTool) return { type: "BUY_SHOP_TOOL", offerId: unboughtTool.id };
      const unboughtCard = [...shopScreen.inventory.cardOffers]
        .filter(
          (offer) =>
            !shopScreen.inventory.purchasedOfferIds.includes(offer.id) &&
            run.credits >= offer.price,
        )
        .sort(
          (left, right) =>
            cardRewardScore(right.cardId, scenario) - cardRewardScore(left.cardId, scenario),
        )[0];
      if (unboughtCard) return { type: "BUY_SHOP_CARD", offerId: unboughtCard.id };
      return { type: "LEAVE_NODE" };
    }
    case "weekend": {
      if (!getWeekendChoiceState("rest", state.run).disabledReason) {
        return { type: "CHOOSE_WEEKEND", choiceId: "rest" };
      }
      const removable = state.run.deck.find((card) => canRefactorCard(state.run!, card));
      if (removable) {
        return {
          type: "CHOOSE_WEEKEND",
          choiceId: "refactor",
          instanceId: removable.instanceId,
        };
      }
      return !getWeekendChoiceState("side-gig", state.run).disabledReason
        ? { type: "CHOOSE_WEEKEND", choiceId: "side-gig" }
        : undefined;
    }
    case "title":
      return { type: "START_RUN", seed: state.run.seed };
    case "retro":
    case "cycle":
      return undefined;
  }
}

function nextCycleAction(
  state: GameState,
  policy: PlaytestPolicy,
  metrics: MutableMetrics,
): GameAction | undefined {
  const cycle = state.run?.cycle;
  if (state.screen.name !== "cycle" || !state.run || !cycle) return undefined;
  if (cycle.boss?.transitionNotice) return { type: "ACKNOWLEDGE_BOSS_TRANSITION" };
  if (cycle.pendingCardChoice) {
    const instance = cycle.hand[0];
    return instance ? { type: "CHOOSE_CYCLE_CARD", instanceId: instance.instanceId } : undefined;
  }

  if (cycle.boss?.phase === "launch-window") {
    const launch = gameReducer(state, { type: "LAUNCH_FINAL_RELEASE" });
    if (launch !== state) return { type: "LAUNCH_FINAL_RELEASE" };
  }

  const shippableReady = cycle.tasks.filter(
    (task) =>
      task.status === "ready" &&
      gameReducer(state, { type: "SHIP_TASK", taskId: task.taskId }) !== state,
  );
  const cleanReady = shippableReady.find((task) =>
    task.requirements.every((requirement) => requirement.unverified === 0),
  );
  const anyReady = shippableReady[0];
  if (cleanReady || (policy === "velocity" && anyReady)) {
    return { type: "SHIP_TASK", taskId: (cleanReady ?? anyReady)!.taskId };
  }

  if (cycle.cardsPlayedThisDay >= maxCardPlaysPerDay) {
    metrics.loopGuardTrips += 1;
    return { type: "END_DAY" };
  }

  const bestCard = playableCandidates(state, policy)[0];
  if (bestCard && bestCard.score > 0) return bestCard.action;

  if (anyReady) {
    const shipping = taskShippingPreview(anyReady);
    const beforeDeadline = cycle.day < getEncounterCycleDefinition(cycle).maxDays;
    if (policy !== "velocity" && shipping.unverified > 0 && beforeDeadline) {
      if (cycle.hand.length > 0 && cycle.focus > 0) metrics.deadHands += 1;
      return { type: "END_DAY" };
    }
    return { type: "SHIP_TASK", taskId: anyReady.taskId };
  }

  if (cycle.hand.length > 0 && cycle.focus > 0) metrics.deadHands += 1;
  return { type: "END_DAY" };
}

export function simulatePlaytestRun(
  scenario: PlaytestScenario,
  seed: number,
  policy: PlaytestPolicy = "balanced",
): PlaytestRunResult {
  const metrics = createMetrics();
  let state = gameReducer(initialGameState, { type: "START_RUN", seed });
  for (const developerId of scenario.squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = createBonusDeck(state, scenario);

  while (state.screen.name !== "retro" && metrics.actions < maxRunActions) {
    const action =
      state.screen.name === "cycle"
        ? nextCycleAction(state, policy, metrics)
        : nextNonCycleAction(state, scenario);
    if (!action) break;
    const next = gameReducer(state, action);
    if (next === state) break;
    updateMetrics(metrics, state, action, next);
    state = next;
  }

  const stalled = state.screen.name !== "retro";
  const terminalScreen = state.screen.name === "retro" ? state.screen : undefined;
  if (metrics.actions >= maxRunActions) metrics.loopGuardTrips += 1;
  return {
    schemaVersion: 1,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    policy,
    seed,
    squad: [...scenario.squad],
    bossId: state.run?.selectedBossId ?? "unknown",
    outcome: stalled ? "stalled" : (terminalScreen?.outcome ?? "stalled"),
    cause: stalled ? `stalled-on-${state.screen.name}` : terminalScreen?.cause,
    ...metrics,
    endingMorale: state.run?.morale ?? 0,
    endingTechDebt: state.run?.techDebt ?? 0,
    tools: state.run?.tools ?? [],
    deckSize: state.run?.deck.length ?? 0,
  };
}

export function runPlaytestBatch(options: {
  runsPerScenario: number;
  seed: number;
  policy?: PlaytestPolicy;
  scenarioIds?: readonly string[];
}): PlaytestRunResult[] {
  const scenarios = options.scenarioIds?.length
    ? playtestScenarios.filter((scenario) => options.scenarioIds?.includes(scenario.id))
    : playtestScenarios;
  return scenarios.flatMap((scenario, scenarioIndex) =>
    Array.from({ length: options.runsPerScenario }, (_, runIndex) =>
      simulatePlaytestRun(
        scenario,
        options.seed + scenarioIndex * 10_000 + runIndex,
        options.policy ?? "balanced",
      ),
    ),
  );
}
