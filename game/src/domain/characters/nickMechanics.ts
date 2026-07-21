import type { Discipline, TaskState } from "../models";

const disciplineOrder: readonly Discipline[] = ["frontend", "backend", "infra"];

function unverifiedWork(task: TaskState): number {
  return task.requirements.reduce((total, requirement) => total + requirement.unverified, 0);
}

export interface NickExhaustReviewResult {
  tasks: readonly TaskState[];
  reviewed: number;
  reviewedTaskIds: readonly string[];
}

/**
 * Resolve Well Organised once for every card Exhausted by a play.
 * Each point goes to the currently dirtiest unshipped Task, so large
 * Exhaust turns visibly work through the review queue in board order.
 */
export function applyNickExhaustReviews(
  baseTasks: readonly TaskState[],
  exhaustCount: number,
): NickExhaustReviewResult {
  let tasks = [...baseTasks];
  const reviewedTaskIds: string[] = [];

  for (let index = 0; index < Math.max(0, exhaustCount); index += 1) {
    let targetIndex = -1;
    let targetUnverified = 0;

    tasks.forEach((task, taskIndex) => {
      const unverified = task.status === "shipped" ? 0 : unverifiedWork(task);
      if (unverified > targetUnverified) {
        targetIndex = taskIndex;
        targetUnverified = unverified;
      }
    });

    if (targetIndex < 0) break;
    const target = tasks[targetIndex]!;
    const discipline = disciplineOrder.find(
      (candidate) =>
        (target.requirements.find((requirement) => requirement.discipline === candidate)
          ?.unverified ?? 0) > 0,
    );
    if (!discipline) break;

    tasks[targetIndex] = {
      ...target,
      requirements: target.requirements.map((requirement) =>
        requirement.discipline === discipline
          ? {
              ...requirement,
              verified: requirement.verified + 1,
              unverified: requirement.unverified - 1,
            }
          : requirement,
      ),
    };
    reviewedTaskIds.push(target.taskId);
  }

  return { tasks, reviewed: reviewedTaskIds.length, reviewedTaskIds };
}
