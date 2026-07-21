import { describe, expect, it } from "vitest";
import type { TaskState } from "../models";
import { applyNickExhaustReviews } from "./nickMechanics";

function task(
  taskId: string,
  unverified: readonly [frontend: number, backend: number, infra: number],
  status: TaskState["status"] = "open",
): TaskState {
  return {
    taskId,
    name: taskId,
    status,
    stunned: false,
    spawnedDay: 1,
    requirements: (["frontend", "backend", "infra"] as const).map((discipline, index) => ({
      discipline,
      target: 10,
      verified: 0,
      unverified: unverified[index],
      scriptPower: 0,
    })),
  };
}

describe("Nick's Well Organised review queue", () => {
  it("re-evaluates the dirtiest Task for every Exhaust and breaks ties by board order", () => {
    const result = applyNickExhaustReviews(
      [task("first", [2, 0, 0]), task("second", [0, 3, 0])],
      4,
    );

    expect(result.reviewedTaskIds).toEqual(["second", "first", "second", "first"]);
    expect(result.reviewed).toBe(4);
    expect(result.tasks[0]?.requirements[0]).toMatchObject({ verified: 2, unverified: 0 });
    expect(result.tasks[1]?.requirements[1]).toMatchObject({ verified: 2, unverified: 1 });
  });

  it("skips shipped and clean Tasks and stops when the queue is clean", () => {
    const result = applyNickExhaustReviews(
      [task("shipped", [3, 0, 0], "shipped"), task("clean", [0, 0, 0]), task("open", [0, 1, 0])],
      5,
    );

    expect(result.reviewedTaskIds).toEqual(["open"]);
    expect(result.reviewed).toBe(1);
    expect(result.tasks[0]).toEqual(task("shipped", [3, 0, 0], "shipped"));
  });
});
