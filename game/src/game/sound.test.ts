import { describe, expect, it } from "vitest";
import type { TaskState } from "../domain/models";
import type { GameState } from "./gameReducer";
import { gameSoundCuesForAction } from "./sound";

function task(
  status: TaskState["status"],
  verified: number,
  unverified: number,
  stunned = false,
): TaskState {
  return {
    taskId: "task",
    name: "Task",
    status,
    stunned,
    spawnedDay: 1,
    requirements: [
      {
        discipline: "frontend",
        target: 3,
        verified,
        unverified,
        scriptPower: 0,
      },
    ],
  };
}

function cycleState(
  tasks: readonly TaskState[],
  options: {
    block?: number;
    discard?: number;
    draw?: number;
    exhaust?: number;
    morale?: number;
    screen?: GameState["screen"];
  } = {},
): GameState {
  return {
    screen: options.screen ?? { name: "cycle", nodeId: "cycle-1", cycleId: "test-cycle" },
    run: {
      morale: options.morale ?? 15,
      cycle: {
        tasks,
        block: options.block ?? 0,
        drawPile: Array.from({ length: options.draw ?? 0 }),
        discardPile: Array.from({ length: options.discard ?? 0 }),
        exhaustPile: Array.from({ length: options.exhaust ?? 0 }),
      },
    },
  } as unknown as GameState;
}

describe("mechanics-driven game sounds", () => {
  it("stays silent for rejected actions and distinguishes Work, Review, and completion", () => {
    const unchanged = cycleState([task("open", 0, 0)]);
    expect(
      gameSoundCuesForAction(
        { type: "PLAY_CARD", instanceId: "card", target: { kind: "squad" } },
        unchanged,
        unchanged,
      ),
    ).toEqual([]);

    expect(
      gameSoundCuesForAction(
        { type: "PLAY_CARD", instanceId: "card", target: { taskId: "task" } },
        cycleState([task("open", 0, 0)]),
        cycleState([task("open", 1, 0)]),
      ),
    ).toEqual(["work"]);
    expect(
      gameSoundCuesForAction(
        { type: "PLAY_CARD", instanceId: "card", target: { taskId: "task" } },
        cycleState([task("ready", 2, 1)]),
        cycleState([task("ready", 3, 0)]),
      ),
    ).toEqual(["review"]);
    expect(
      gameSoundCuesForAction(
        { type: "PLAY_CARD", instanceId: "card", target: { taskId: "task" } },
        cycleState([task("open", 2, 0)]),
        cycleState([task("ready", 3, 0)]),
      ),
    ).toEqual(["complete"]);
  });

  it("announces reshuffles before the card outcome", () => {
    expect(
      gameSoundCuesForAction(
        { type: "PLAY_CARD", instanceId: "card", target: { kind: "squad" } },
        cycleState([task("open", 0, 0)], { discard: 3 }),
        cycleState([task("open", 0, 0)], { draw: 2, exhaust: 1 }),
      ),
    ).toEqual(["shuffle", "exhaust"]);
  });

  it("separates clean shipping, defects, Morale damage, and final victory", () => {
    expect(
      gameSoundCuesForAction(
        { type: "SHIP_TASK", taskId: "task" },
        cycleState([task("ready", 3, 0)]),
        cycleState([task("shipped", 3, 0)]),
      ),
    ).toEqual(["ship"]);
    expect(
      gameSoundCuesForAction(
        { type: "SHIP_TASK", taskId: "task" },
        cycleState([task("ready", 2, 1)]),
        cycleState([task("shipped", 2, 1)]),
      ),
    ).toEqual(["defect"]);
    expect(
      gameSoundCuesForAction(
        { type: "END_DAY" },
        cycleState([task("open", 0, 0)], { morale: 15 }),
        cycleState([task("open", 0, 0)], { morale: 12 }),
      ),
    ).toEqual(["damage"]);
    expect(
      gameSoundCuesForAction(
        { type: "LAUNCH_FINAL_RELEASE" },
        cycleState([task("ready", 3, 0)]),
        cycleState([task("shipped", 3, 0)], {
          screen: { name: "retro", outcome: "victory" },
        }),
      ),
    ).toEqual(["victory"]);
  });
});
