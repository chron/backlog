import { disciplineLabel, getCard, getCycle } from "../domain/content";
import type {
  CardDefinition,
  CardInstance,
  CycleReport,
  CycleState,
  DeveloperId,
  Discipline,
  RequirementState,
  RunState,
  TaskState,
  WorkKind,
} from "../domain/models";

interface TaskCardTarget {
  kind?: "task";
  taskId: string;
  discipline?: Discipline;
}

interface SquadCardTarget {
  kind: "squad";
}

export type CardTarget = TaskCardTarget | SquadCardTarget;

export type CardResolution =
  | {
      kind: "work";
      legal: true;
      cost: number;
      taskId: string;
      discipline: Discipline;
      amount: number;
      workKind: WorkKind;
      scriptPowerAdded: number;
      scriptBlockAdded: number;
      blockGained: number;
      pitchedIn: boolean;
      triggeredPassiveIds: DeveloperId[];
      label: string;
    }
  | {
      kind: "review";
      legal: true;
      cost: number;
      taskId: string;
      amount: number;
      blockGained: number;
      triggeredPassiveIds: DeveloperId[];
      label: string;
    }
  | {
      kind: "tactic";
      legal: true;
      cost: number;
      taskId?: string;
      blockGained: number;
      stun: boolean;
      triggeredPassiveIds: DeveloperId[];
      label: string;
    }
  | { legal: false; reason: string };

const disciplineOrder: readonly Discipline[] = ["frontend", "backend", "infra"];

export function requirementProgress(requirement: RequirementState): number {
  return requirement.verified + requirement.unverified;
}

function remainingWork(requirement: RequirementState): number {
  return Math.max(0, requirement.target - requirementProgress(requirement));
}

export function isTaskReady(task: TaskState): boolean {
  return task.status !== "open";
}

export function isCycleShipped(cycle: CycleState): boolean {
  return cycle.tasks.every((task) => task.status === "shipped");
}

export function refreshTaskStatus(task: TaskState): TaskState {
  if (task.status === "shipped") return task;
  const ready = task.requirements.every((requirement) => remainingWork(requirement) === 0);
  return { ...task, status: ready ? "ready" : "open" };
}

function taskUnverifiedWork(task: TaskState): number {
  return task.requirements.reduce((total, requirement) => total + requirement.unverified, 0);
}

function totalUnverifiedWork(cycle: CycleState): number {
  return cycle.tasks.reduce((total, task) => total + taskUnverifiedWork(task), 0);
}

function totalWork(cycle: CycleState): number {
  return cycle.tasks.reduce(
    (taskTotal, task) =>
      taskTotal +
      task.requirements.reduce(
        (requirementTotal, requirement) => requirementTotal + requirementProgress(requirement),
        0,
      ),
    0,
  );
}

export function getScheduledIntent(cycle: CycleState, task: TaskState) {
  if (task.status === "shipped") return undefined;
  const definition = getCycle(cycle.cycleId).tasks.find(
    (candidate) => candidate.id === task.taskId,
  );
  return definition?.intents[cycle.day - 1];
}

export function getCurrentIntent(cycle: CycleState, task: TaskState) {
  return task.stunned ? undefined : getScheduledIntent(cycle, task);
}

export function absorbMoraleDamage(
  block: number,
  amount: number,
): { block: number; blocked: number; moraleLoss: number } {
  const blocked = Math.min(block, amount);
  return {
    block: block - blocked,
    blocked,
    moraleLoss: amount - blocked,
  };
}

export function incomingMorale(cycle: CycleState): number {
  return cycle.tasks.reduce((total, task) => {
    const intent = getCurrentIntent(cycle, task);
    return total + (intent?.kind === "crunch" ? intent.moraleLoss : 0);
  }, 0);
}

export function taskShippingPreview(task: TaskState): {
  unverified: number;
  defects: number;
  moraleLoss: number;
  techDebt: number;
} {
  const unverified = taskUnverifiedWork(task);
  const defects = Math.ceil(unverified / 3);
  const techDebt = Math.ceil(unverified / 2);
  return {
    unverified,
    defects,
    moraleLoss: defects,
    techDebt,
  };
}

export function effectiveCardCost(
  card: CardDefinition,
  cycle: CycleState,
  _squad: readonly DeveloperId[],
): number {
  const blockedCost =
    card.discipline &&
    card.discipline !== "flexible" &&
    cycle.blockedDisciplines.includes(card.discipline)
      ? 1
      : 0;

  return card.cost + blockedCost;
}

function addTriggeredPassive(passiveIds: DeveloperId[], id: DeveloperId): DeveloperId[] {
  return passiveIds.includes(id) ? passiveIds : [...passiveIds, id];
}

export function resolveCardTarget(
  run: RunState,
  instance: CardInstance,
  target: CardTarget,
): CardResolution {
  const cycle = run.cycle;
  if (!cycle) return { legal: false, reason: "No active Cycle." };

  const card = getCard(instance.cardId);
  if (card.kind === "status") {
    return { legal: false, reason: `${card.name} is unplayable.` };
  }

  const cost = effectiveCardCost(card, cycle, run.squad);
  if (cost > cycle.focus) return { legal: false, reason: "Not enough Focus." };

  if (card.kind === "tactic" && !card.stun) {
    if (target.kind !== "squad") {
      return { legal: false, reason: "Aim this at the squad." };
    }
    return {
      kind: "tactic",
      legal: true,
      cost,
      blockGained: card.block ?? 0,
      stun: false,
      triggeredPassiveIds: [],
      label: card.block ? `Block ${card.block}` : card.name,
    };
  }

  if (target.kind === "squad") {
    return { legal: false, reason: "Choose a Task." };
  }

  const task = cycle.tasks.find((candidate) => candidate.taskId === target.taskId);
  if (!task) return { legal: false, reason: "Choose a Task." };
  if (task.status === "shipped") {
    return { legal: false, reason: "This Task has already shipped." };
  }

  let triggeredPassiveIds: DeveloperId[] = [];

  if (card.kind === "review") {
    const available = taskUnverifiedWork(task);
    if (available === 0) {
      return { legal: false, reason: "This Task has no Unverified Work." };
    }

    const odinBonus =
      run.squad.includes("odin") && !cycle.triggeredPassiveIds.includes("odin") ? 1 : 0;
    if (odinBonus) {
      triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "odin");
    }
    const amount = Math.min(available, card.amount + odinBonus);
    return {
      kind: "review",
      legal: true,
      cost,
      taskId: task.taskId,
      amount,
      blockGained: card.block ?? 0,
      triggeredPassiveIds,
      label: [`Verify ${amount}`, card.block ? `Block ${card.block}` : undefined]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (card.kind === "tactic") {
    if (card.stun && task.stunned) {
      return { legal: false, reason: "This intent is already Stunned." };
    }
    if (card.stun && !getScheduledIntent(cycle, task)) {
      return { legal: false, reason: "This Task has no intent to Stun." };
    }
    return {
      kind: "tactic",
      legal: true,
      cost,
      taskId: task.taskId,
      blockGained: card.block ?? 0,
      stun: card.stun ?? false,
      triggeredPassiveIds,
      label: [card.stun ? "Stun" : undefined, card.block ? `Block ${card.block}` : undefined]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (!target.discipline) {
    return { legal: false, reason: "Choose a requirement." };
  }

  const requirement = task.requirements.find(
    (candidate) => candidate.discipline === target.discipline,
  );
  if (!requirement || remainingWork(requirement) === 0) {
    return { legal: false, reason: "That requirement is complete." };
  }

  if (card.automation?.kind === "trigger" && requirement.scriptPower === 0) {
    return { legal: false, reason: "Install a Script here first." };
  }

  const pitchedIn = card.discipline !== "flexible" && card.discipline !== target.discipline;
  const workKind: WorkKind = pitchedIn ? "unverified" : (card.workKind ?? "verified");
  let amount =
    card.automation?.kind === "trigger" ? requirement.scriptPower : pitchedIn ? 1 : card.amount;

  if (
    amount > 0 &&
    workKind === "verified" &&
    run.squad.includes("irene") &&
    !cycle.triggeredPassiveIds.includes("irene")
  ) {
    amount += 1;
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "irene");
  }

  if (
    !pitchedIn &&
    card.tags.includes("ai-assisted") &&
    run.squad.includes("madi") &&
    !cycle.triggeredPassiveIds.includes("madi")
  ) {
    amount += 1;
    triggeredPassiveIds = addTriggeredPassive(triggeredPassiveIds, "madi");
  }

  amount = Math.min(amount, remainingWork(requirement));
  const scriptPowerAdded = card.automation?.kind === "install" ? card.automation.power : 0;
  const scriptBlockAdded =
    card.automation?.kind === "install" ? (card.automation.blockPower ?? 0) : 0;
  const blockGained = card.block ?? 0;
  const label =
    card.automation?.kind === "trigger"
      ? `Run Script · +${amount} Verified`
      : card.automation?.kind === "install"
        ? [
            amount > 0
              ? pitchedIn
                ? `Pitch In · ${amount} Unverified`
                : `+${amount} ${workKind === "verified" ? "Verified" : "Unverified"}`
              : undefined,
            scriptPowerAdded > 0 ? `Script +${scriptPowerAdded}` : undefined,
            scriptBlockAdded > 0 ? `Guard +${scriptBlockAdded}` : undefined,
            blockGained > 0 ? `Block ${blockGained}` : undefined,
          ]
            .filter(Boolean)
            .join(" · ")
        : [
            pitchedIn
              ? `Pitch In · ${amount} Unverified`
              : `${disciplineLabel(target.discipline)} +${amount} ${workKind}`,
            blockGained > 0 ? `Block ${blockGained}` : undefined,
          ]
            .filter(Boolean)
            .join(" · ");

  return {
    kind: "work",
    legal: true,
    cost,
    taskId: task.taskId,
    discipline: target.discipline,
    amount,
    workKind,
    scriptPowerAdded,
    scriptBlockAdded,
    blockGained,
    pitchedIn,
    triggeredPassiveIds,
    label,
  };
}

export function verifyTask(task: TaskState, amount: number): TaskState {
  let remaining = amount;
  const requirements = disciplineOrder
    .map((discipline) => task.requirements.find((item) => item.discipline === discipline))
    .filter((requirement): requirement is RequirementState => Boolean(requirement))
    .map((requirement) => {
      const verified = Math.min(requirement.unverified, remaining);
      remaining -= verified;
      return {
        ...requirement,
        verified: requirement.verified + verified,
        unverified: requirement.unverified - verified,
      };
    });

  return refreshTaskStatus({ ...task, requirements });
}

export function createCycleReport(
  cycle: CycleState,
  outcome: CycleReport["outcome"],
  moraleDelta: number,
  creditsGained: number,
  techDebtAdded: number,
): CycleReport {
  const definition = getCycle(cycle.cycleId);
  return {
    nodeId: cycle.nodeId,
    cycleName: definition.name,
    outcome,
    day: cycle.day,
    tasks: cycle.tasks.map((task) => {
      const taskDefinition = definition.tasks.find((candidate) => candidate.id === task.taskId);
      return {
        taskId: task.taskId,
        name: taskDefinition?.name ?? task.taskId,
        completed: task.status === "shipped",
        verifiedWork: task.requirements.reduce((sum, requirement) => sum + requirement.verified, 0),
        unverifiedWork: taskUnverifiedWork(task),
      };
    }),
    shippedProgress: totalWork(cycle),
    unverifiedProgress: totalUnverifiedWork(cycle),
    defects: cycle.defects,
    moraleDelta,
    creditsGained,
    techDebtAdded,
    resolvedIntents: cycle.resolvedIntents,
  };
}
