import { describe, expect, it } from "vitest";
import { resolveSebCascade, type SebTaskSnapshot } from "./sebMechanics";

function task(taskId: string, remaining: number, backendRemaining = 0): SebTaskSnapshot {
  return {
    taskId,
    status: "open",
    requirements: [
      { discipline: "frontend", target: remaining, verified: 0, unverified: 0 },
      ...(backendRemaining > 0
        ? ([
            {
              discipline: "backend" as const,
              target: backendRemaining,
              verified: 0,
              unverified: 0,
            },
          ] as const)
        : []),
    ],
  };
}

describe("Seb's Shared Components queue", () => {
  it("resolves recursive completion echoes in finite FIFO board order", () => {
    const result = resolveSebCascade(
      [task("source", 3), task("second", 1, 2), task("third", 2, 2)],
      [{ taskId: "source", amount: 3, source: "played" }],
    );

    expect(result.packets.map(({ taskId, source }) => `${taskId}:${source}`)).toEqual([
      "source:played",
      "second:shared-components",
      "third:shared-components",
      "third:shared-components",
    ]);
    expect(result.packets.map(({ taskId, completed }) => ({ taskId, completed }))).toEqual([
      { taskId: "source", completed: true },
      { taskId: "second", completed: true },
      { taskId: "third", completed: false },
      { taskId: "third", completed: true },
    ]);
    expect(result.tasks[2]?.requirements[0]?.verified).toBe(2);
  });

  it("adds Extract Component's extra echo after the ordinary passive echo", () => {
    const result = resolveSebCascade(
      [task("source", 4), task("other", 3)],
      [
        {
          taskId: "source",
          amount: 4,
          source: "played",
          extraSharedComponentTriggers: 1,
        },
      ],
    );

    expect(result.packets.map(({ taskId, applied }) => ({ taskId, applied }))).toEqual([
      { taskId: "source", applied: 4 },
      { taskId: "other", applied: 1 },
      { taskId: "other", applied: 1 },
    ]);
  });

  it("ignores shipped Tasks and chooses the least-remaining Frontend bar", () => {
    const result = resolveSebCascade(
      [
        task("source", 1),
        { ...task("shipped", 1), status: "shipped" },
        {
          taskId: "multi",
          status: "open",
          requirements: [
            { discipline: "frontend", target: 4, verified: 0, unverified: 0 },
            { discipline: "frontend", target: 2, verified: 1, unverified: 0 },
          ],
        },
      ],
      [{ taskId: "source", amount: 1, source: "played" }],
    );

    expect(result.packets.map(({ taskId }) => taskId)).toEqual(["source", "multi"]);
    expect(result.tasks[2]?.requirements.map(({ verified }) => verified)).toEqual([0, 2]);
  });
});
