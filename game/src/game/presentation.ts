import { getCard, getDeveloper } from "../domain/content";
import type { CardInstance, DeveloperId, RunState } from "../domain/models";
import { applyCardResolutionToTask, isTaskReady, resolveCardTarget } from "./rules";
import type { CardTarget } from "./rules";

export interface CharacterCue {
  developerId: DeveloperId;
  detail: string;
  level: "hero" | "micro";
  title: string;
}

export interface CardPresentation {
  cue?: CharacterCue;
  triggeredPassiveIds: DeveloperId[];
}

export function getCardPresentation(
  run: RunState,
  instance: CardInstance,
  target: CardTarget,
): CardPresentation | undefined {
  const cycle = run.cycle;
  if (!cycle) return undefined;
  const resolution = resolveCardTarget(run, instance, target);
  if (!resolution.legal) return undefined;
  const card = getCard(instance.cardId);

  if (!resolution.taskId) {
    if (!card.ownerId) return { triggeredPassiveIds: resolution.triggeredPassiveIds };
    return {
      triggeredPassiveIds: resolution.triggeredPassiveIds,
      cue: {
        developerId: card.ownerId,
        detail: resolution.label,
        level: card.rarity === "rare" ? "hero" : "micro",
        title: card.name,
      },
    };
  }

  const task = cycle.tasks.find((candidate) => candidate.taskId === resolution.taskId);
  if (!task) return undefined;
  const resolvedTask = applyCardResolutionToTask(task, resolution);
  const taskCompleted = !isTaskReady(task) && isTaskReady(resolvedTask);
  const ownPassiveCombo = Boolean(
    card.ownerId && resolution.triggeredPassiveIds.includes(card.ownerId),
  );
  const developerId =
    card.ownerId ??
    [...resolution.triggeredPassiveIds].reverse().find((id) => id !== "paul") ??
    resolution.triggeredPassiveIds[0];

  if (!developerId) {
    return { triggeredPassiveIds: resolution.triggeredPassiveIds };
  }

  const developer = getDeveloper(developerId);
  const ownsTriggeredPassive = resolution.triggeredPassiveIds.includes(developerId);
  const detail = [ownsTriggeredPassive ? developer.passiveName : undefined, resolution.label]
    .filter(Boolean)
    .join(" · ");

  return {
    triggeredPassiveIds: resolution.triggeredPassiveIds,
    cue: {
      developerId,
      detail,
      level: taskCompleted || ownPassiveCombo ? "hero" : "micro",
      title: taskCompleted ? "Task Done" : card.ownerId ? card.name : developer.passiveName,
    },
  };
}
