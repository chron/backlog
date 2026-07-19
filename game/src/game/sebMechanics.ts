import type { Discipline } from "../domain/models";

export interface SebRequirementSnapshot {
  discipline: Discipline;
  target: number;
  verified: number;
  unverified: number;
}

export interface SebTaskSnapshot {
  taskId: string;
  status: "open" | "ready" | "shipped";
  requirements: readonly SebRequirementSnapshot[];
}

export interface SebWorkPacket {
  taskId: string;
  amount: number;
  source: "played" | "script" | "shared-components" | "spread";
  extraSharedComponentTriggers?: number;
}

export interface SebResolvedPacket extends SebWorkPacket {
  attempted: number;
  applied: number;
  overflow: number;
  completed: boolean;
}

export interface SebCascadeResult {
  tasks: readonly SebTaskSnapshot[];
  packets: readonly SebResolvedPacket[];
}

function remaining(requirement: SebRequirementSnapshot): number {
  return Math.max(0, requirement.target - requirement.verified - requirement.unverified);
}

function frontendTargetIndex(task: SebTaskSnapshot): number {
  let selected = -1;
  let selectedRemaining = Number.POSITIVE_INFINITY;

  for (const [index, requirement] of task.requirements.entries()) {
    if (requirement.discipline !== "frontend") continue;
    const workRemaining = remaining(requirement);
    if (workRemaining <= 0 || workRemaining >= selectedRemaining) continue;
    selected = index;
    selectedRemaining = workRemaining;
  }

  return selected;
}

function hasIncompleteFrontend(task: SebTaskSnapshot): boolean {
  return task.status === "open" && frontendTargetIndex(task) >= 0;
}

/**
 * Resolve Seb's Frontend packets in FIFO order.
 *
 * This is the character-specific contract for the shared Work lifecycle: every
 * completion appends echoes in board order, and each echo is an ordinary packet
 * which may complete another bar. Since completed bars leave the candidate set,
 * the queue drains naturally without a trigger cap.
 */
export function resolveSebCascade(
  initialTasks: readonly SebTaskSnapshot[],
  initialPackets: readonly SebWorkPacket[],
): SebCascadeResult {
  let tasks = initialTasks.map((task) => ({
    ...task,
    requirements: task.requirements.map((requirement) => ({ ...requirement })),
  }));
  const queue = [...initialPackets];
  const packets: SebResolvedPacket[] = [];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const packet = queue[cursor];
    if (!packet) continue;
    const taskIndex = tasks.findIndex((task) => task.taskId === packet.taskId);
    const task = tasks[taskIndex];
    if (!task || task.status !== "open") continue;
    const requirementIndex = frontendTargetIndex(task);
    const requirement = task.requirements[requirementIndex];
    if (!requirement) continue;

    const before = remaining(requirement);
    const applied = Math.min(before, Math.max(0, packet.amount));
    const completed = before > 0 && applied === before;
    const updatedRequirements = task.requirements.map((candidate, index) =>
      index === requirementIndex
        ? { ...candidate, verified: candidate.verified + applied }
        : candidate,
    );
    const requirementsComplete = updatedRequirements.every(
      (candidate) => remaining(candidate) === 0,
    );
    tasks = tasks.map((candidate, index) =>
      index === taskIndex
        ? {
            ...candidate,
            status: requirementsComplete ? "ready" : candidate.status,
            requirements: updatedRequirements,
          }
        : candidate,
    );
    packets.push({
      ...packet,
      attempted: packet.amount,
      applied,
      overflow: Math.max(0, packet.amount - applied),
      completed,
    });

    if (!completed) continue;
    const triggerCount = 1 + (packet.extraSharedComponentTriggers ?? 0);
    for (let trigger = 0; trigger < triggerCount; trigger += 1) {
      for (const candidate of tasks) {
        if (candidate.taskId === packet.taskId || !hasIncompleteFrontend(candidate)) continue;
        queue.push({
          taskId: candidate.taskId,
          amount: 1,
          source: "shared-components",
        });
      }
    }
  }

  return { tasks, packets };
}
