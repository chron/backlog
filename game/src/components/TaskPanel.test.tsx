import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DeveloperId } from "../domain/models";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { TaskPanel } from "./TaskPanel";

function cycleFixture(squad: readonly DeveloperId[] = ["paul", "odin", "madi"]) {
  let state = gameReducer(initialGameState, { type: "START_RUN", seed: 42 });
  for (const developerId of squad) {
    state = gameReducer(state, { type: "TOGGLE_DEVELOPER", developerId });
  }
  state = gameReducer(state, { type: "CONFIRM_SQUAD" });
  state = gameReducer(state, { type: "VISIT_NODE", nodeId: "cycle-1" });
  if (!state.run?.cycle) throw new Error("Expected an active Cycle");
  return state.run;
}

describe("TaskPanel", () => {
  it("dims a cancelled Task and explains that its End Day effect has no effect", () => {
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
    expect(markup).toContain("Cancelled Today");
    expect(markup).toContain("will not happen today");
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
    expect(markup).toContain("+7 Tech Debt");
    expect(markup).toContain("Defects are recorded for this run");
    expect(markup).toContain("persists into later Cycles");
    expect(markup).not.toContain("Morale lost");
  });

  it("exposes requirement drop targets for Script tactics", () => {
    const run = cycleFixture(["seb", "toby", "steph"] as const);
    const task = run.cycle!.tasks[0]!;
    const requirement = task.requirements[0]!;

    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName={task.name ?? task.taskId}
        selectedCard={{ cardId: "one-click-setup", instanceId: "test-one-click-setup" }}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup).toContain(`data-card-target="${task.taskId}:${requirement.discipline}"`);
    expect(markup).toContain("is-targetable");
  });

  it("keeps Script and Unverified metadata inside the fixed requirement line", () => {
    const baseRun = cycleFixture(["seb", "toby", "steph"] as const);
    const task = {
      ...baseRun.cycle!.tasks[0]!,
      requirements: baseRun.cycle!.tasks[0]!.requirements.map((requirement) => ({
        ...requirement,
        scriptPower: 2,
        unverified: 1,
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

    expect(markup).toMatch(
      /requirement__line.*requirement__script.*Script \+2\/Day.*requirement__unverified.*1 Unverified/s,
    );
    expect(markup).not.toContain("requirement__foot");
  });

  it("previews immediate CI work from Automate This Bit as progress segments", () => {
    const baseRun = cycleFixture(["seb", "toby", "steph"] as const);
    const run = { ...baseRun, tools: [...baseRun.tools, "ci-runner" as const] };
    const task = run.cycle!.tasks[0]!;
    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName={task.name ?? task.taskId}
        selectedCard={{ cardId: "automate-this-bit", instanceId: "test-automate" }}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup).toContain("CI +2");
    expect(markup.match(/is-preview-verified/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps one preview segment per target unit for full and Pitch In Work", () => {
    const baseRun = cycleFixture();
    const baseTask = baseRun.cycle!.tasks[0]!;
    const task = {
      ...baseTask,
      requirements: [
        { discipline: "frontend" as const, target: 2, verified: 0, unverified: 0, scriptPower: 0 },
        { discipline: "backend" as const, target: 5, verified: 0, unverified: 0, scriptPower: 0 },
      ],
    };
    const run = { ...baseRun, cycle: { ...baseRun.cycle!, tasks: [task] } };
    const markup = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName="Preview Matrix"
        selectedCard={{ cardId: "frontend-3", instanceId: "test-frontend" }}
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(markup.match(/is-preview-unverified/g)).toHaveLength(3);
    expect(markup.match(/class="is-empty"/g)).toHaveLength(4);
    expect(markup).toContain("--requirement-segments:2");
    expect(markup).toContain("--requirement-segments:5");
  });

  it("labels Incident objectives and spawned Tasks without changing ordinary roles", () => {
    const run = cycleFixture();
    const task = run.cycle!.tasks[0]!;
    const objective = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName="Restore Service"
        taskRole="primary"
        incidentRole="objective"
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );
    const optional = renderToStaticMarkup(
      <TaskPanel
        run={run}
        task={task}
        taskName="Pager Storm"
        taskRole="complication"
        incidentRole="optional"
        onTarget={() => undefined}
        onShip={() => undefined}
      />,
    );

    expect(objective).toContain("Objective · Open");
    expect(objective).toContain("Ship this Task to resolve");
    expect(objective).toContain("Spawned Tasks optional");
    expect(optional).toContain("Optional Problem · Open");
    expect(optional).not.toContain("task-panel__incident-rule");
  });
});
