import { describe, expect, it } from "vitest";
import { resolveMattFinishingTouches, type MattReviewTask } from "./mattMechanics";

function task(taskId: string, unverified: number, status: MattReviewTask["status"] = "open") {
  return { taskId, unverified, status };
}

describe("Matt's Finishing Touches conversion", () => {
  it("turns overflow into a real, capped Review event on the source Task", () => {
    const result = resolveMattFinishingTouches([task("source", 3), task("other", 4)], {
      sourceTaskId: "source",
      overflow: 5,
    });

    expect(result.reviews).toEqual([
      {
        taskId: "source",
        attempted: 5,
        reviewed: 3,
        removedLastUnverified: true,
        source: "finishing-touches",
      },
    ]);
    expect(result.tasks.map(({ unverified }) => unverified)).toEqual([0, 4]);
  });

  it("loses unused overflow and awards Polish Budget Block only for actual Review", () => {
    const result = resolveMattFinishingTouches([task("source", 2)], {
      sourceTaskId: "source",
      overflow: 7,
      polishBudgetStacks: 2,
    });

    expect(result.reviews[0]).toMatchObject({ attempted: 7, reviewed: 2 });
    expect(result.blockGained).toBe(4);
  });

  it("makes Pixel Perfect replace the source conversion with board-order Review everywhere", () => {
    const result = resolveMattFinishingTouches(
      [task("source", 1), task("middle", 5), task("shipped", 4, "shipped"), task("last", 0)],
      {
        sourceTaskId: "source",
        overflow: 3,
        reviewEveryOpenTask: true,
        drawPerTaskCleaned: 1,
      },
    );

    expect(result.reviews.map(({ taskId, reviewed }) => ({ taskId, reviewed }))).toEqual([
      { taskId: "source", reviewed: 1 },
      { taskId: "middle", reviewed: 3 },
      { taskId: "last", reviewed: 0 },
    ]);
    expect(result.reviews.filter(({ taskId }) => taskId === "source")).toHaveLength(1);
    expect(result.cardsDrawn).toBe(1);
    expect(result.tasks.map(({ unverified }) => unverified)).toEqual([0, 2, 4, 0]);
  });

  it("emits zero Review when there is no Unverified Work to convert", () => {
    const result = resolveMattFinishingTouches([task("source", 0)], {
      sourceTaskId: "source",
      overflow: 4,
      polishBudgetStacks: 1,
    });

    expect(result.reviews[0]).toMatchObject({ reviewed: 0, removedLastUnverified: false });
    expect(result.blockGained).toBe(0);
  });
});
