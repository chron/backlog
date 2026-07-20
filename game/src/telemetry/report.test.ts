import { describe, expect, it } from "vitest";
import {
  createProductionTelemetryReport,
  formatProductionTelemetryReport,
  type ProductionTelemetryRun,
} from "./report";

const run = {
  runId: "run-1",
  startedAt: "2026-07-20T00:00:00.000Z",
  completedAt: "2026-07-20T00:30:00.000Z",
  lastScreen: "retro",
  squad: ["paul", "odin", "madi"],
  bossId: "mateja-weekend-pivot",
  outcome: "victory",
  durationMs: 30 * 60_000,
  actions: 149,
  encounters: 8,
  days: 30,
  cardsPlayed: 84,
  tasksShipped: 19,
  defects: 2,
  endingMorale: 3,
  endingTechDebt: 4,
  peakTechDebt: 7,
  deckSize: 17,
  tools: ["test-suite"],
} as const satisfies ProductionTelemetryRun;

describe("production telemetry report", () => {
  it("groups anonymous runs by squad and boss", () => {
    const report = createProductionTelemetryReport([run], "2026-07-20T01:00:00.000Z");
    expect(report.squads[0]).toMatchObject({
      label: "paul / odin / madi",
      runs: 1,
      winRate: 1,
      averageDurationMinutes: 30,
    });
    expect(report.bosses[0]?.label).toBe("mateja-weekend-pivot");
    expect(formatProductionTelemetryReport(report)).toContain("LGTM! // PRODUCTION PLAYTESTS");
  });
});
