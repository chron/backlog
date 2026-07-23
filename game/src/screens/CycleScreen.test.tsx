import { describe, expect, it } from "bun:test";
import type { CardInstance } from "../domain/models";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { automationUnavailableReason } from "./CycleScreen";

function activeRun() {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  for (const developerId of ["paul", "irene", "madi"] as const) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return state.run;
}

describe("CycleScreen automation availability", () => {
  const runItNow: CardInstance = {
    cardId: "run-it-now",
    instanceId: "run-it-now-test",
  };
  const macro: CardInstance = { cardId: "macro", instanceId: "macro-test" };

  it("explains when single-trigger cards have no installed automation", () => {
    const run = activeRun();

    expect(automationUnavailableReason(run, runItNow)).toBe(
      "Install a Script on an incomplete requirement first.",
    );
    expect(automationUnavailableReason(run, macro)).toBe(
      "Install a Script on an incomplete requirement or install Guard first.",
    );
  });

  it("enables single-trigger cards as soon as their relevant meter exists", () => {
    const base = activeRun();
    const scripted = {
      ...base,
      cycle: {
        ...base.cycle!,
        tasks: base.cycle!.tasks.map((task, taskIndex) => ({
          ...task,
          requirements: task.requirements.map((requirement, requirementIndex) => ({
            ...requirement,
            scriptPower: taskIndex === 0 && requirementIndex === 0 ? 1 : requirement.scriptPower,
          })),
        })),
      },
    };
    const guarded = { ...base, cycle: { ...base.cycle!, guardPower: 2 } };

    expect(automationUnavailableReason(scripted, runItNow)).toBeUndefined();
    expect(automationUnavailableReason(scripted, macro)).toBeUndefined();
    expect(automationUnavailableReason(guarded, macro)).toBeUndefined();
  });
});
