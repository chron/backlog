export interface MattReviewTask {
  taskId: string;
  status: "open" | "ready" | "shipped";
  unverified: number;
}

export interface MattReviewEvent {
  taskId: string;
  attempted: number;
  reviewed: number;
  removedLastUnverified: boolean;
  source: "finishing-touches";
}

export interface MattFinishingResult {
  tasks: readonly MattReviewTask[];
  reviews: readonly MattReviewEvent[];
  blockGained: number;
  cardsDrawn: number;
}

/**
 * Convert one Verified Work packet's overflow into real Review events.
 *
 * Pixel Perfect sets reviewEveryOpenTask, replacing (not supplementing) the
 * ordinary same-Task conversion. Review is capped by actual Unverified Work so
 * downstream Review triggers see only genuine conversion.
 */
export function resolveMattFinishingTouches(
  initialTasks: readonly MattReviewTask[],
  input: {
    sourceTaskId: string;
    overflow: number;
    reviewEveryOpenTask?: boolean;
    polishBudgetStacks?: number;
    drawPerTaskCleaned?: number;
  },
): MattFinishingResult {
  let tasks = initialTasks.map((task) => ({ ...task }));
  const reviews: MattReviewEvent[] = [];
  const targets = input.reviewEveryOpenTask
    ? tasks.filter((task) => task.status !== "shipped")
    : tasks.filter((task) => task.taskId === input.sourceTaskId && task.status !== "shipped");

  for (const target of targets) {
    const reviewed = Math.min(Math.max(0, input.overflow), target.unverified);
    const removedLastUnverified = target.unverified > 0 && reviewed === target.unverified;
    reviews.push({
      taskId: target.taskId,
      attempted: Math.max(0, input.overflow),
      reviewed,
      removedLastUnverified,
      source: "finishing-touches",
    });
    tasks = tasks.map((task) =>
      task.taskId === target.taskId ? { ...task, unverified: task.unverified - reviewed } : task,
    );
  }

  const totalReviewed = reviews.reduce((total, review) => total + review.reviewed, 0);
  const tasksCleaned = reviews.filter((review) => review.removedLastUnverified).length;
  return {
    tasks,
    reviews,
    blockGained: totalReviewed * (input.polishBudgetStacks ?? 0),
    cardsDrawn: tasksCleaned * (input.drawPerTaskCleaned ?? 0),
  };
}
