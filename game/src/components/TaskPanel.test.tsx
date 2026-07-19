import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { TaskPanel } from "./TaskPanel";

function cycleFixture() {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  for (const developerId of ["paul", "odin", "madi"] as const) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return state.run;
}

describe("TaskPanel", () => {
  it("dims a Stunned Task and explains that its Intent has no effect", () => {
    const baseRun = cycleFixture();
    const task = { ...baseRun.cycle!.tasks[0]!, stunned: true };
    const run = { ...baseRun, cycle: { ...baseRun.cycle!, tasks: [task] } };
    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName={task.name ?? task.taskId}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup).toContain("task-panel is-stunned");
    expect(markup).toContain("Stunned ·");
    expect(markup).toContain("Cancelled for today.");
  });

  it("previews dirty shipping as Defects and Debt without ordinary Morale loss", () => {
    const baseRun = cycleFixture();
    const task = {
      ...baseRun.cycle!.tasks[0]!,
      status: "ready" as const,
      requirements: baseRun.cycle!.tasks[0]!.requirements.map((requirement) => ({
        ...requirement,
        unverified: requirement.target,
      })),
    };
    const run = { ...baseRun, cycle: { ...baseRun.cycle!, tasks: [task] } };
    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName={task.name ?? task.taskId}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup).toContain("5 Defects");
    expect(markup).toContain("+7 Debt");
    expect(markup).not.toContain("Morale lost");
  });
});
