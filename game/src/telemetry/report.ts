export interface ProductionTelemetryRun {
  runId: string;
  startedAt: string;
  completedAt?: string;
  lastScreen: string;
  squad: readonly string[];
  bossId?: string;
  outcome?: "victory" | "defeat";
  cause?: string;
  durationMs: number;
  actions: number;
  encounters: number;
  days: number;
  cardsPlayed: number;
  tasksShipped: number;
  defects: number;
  endingMorale?: number;
  endingTechDebt?: number;
  peakTechDebt: number;
  deckSize: number;
  tools: readonly string[];
}

interface GroupSummary {
  label: string;
  runs: number;
  wins: number;
  winRate: number;
  averageDurationMinutes: number;
  averageEndingMorale: number;
  averageEndingTechDebt: number;
}

export interface ProductionTelemetryReport {
  generatedAt: string;
  totalRuns: number;
  completedRuns: number;
  squads: readonly GroupSummary[];
  bosses: readonly GroupSummary[];
  outcomes: readonly { label: string; runs: number }[];
  recentRuns: readonly ProductionTelemetryRun[];
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, places = 1): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function summarizeGroups(
  runs: readonly ProductionTelemetryRun[],
  labelFor: (run: ProductionTelemetryRun) => string,
): GroupSummary[] {
  return [...new Set(runs.map(labelFor))]
    .map((label) => {
      const matching = runs.filter((run) => labelFor(run) === label);
      const completed = matching.filter((run) => run.outcome);
      const wins = completed.filter((run) => run.outcome === "victory").length;
      return {
        label,
        runs: matching.length,
        wins,
        winRate: completed.length === 0 ? 0 : wins / completed.length,
        averageDurationMinutes: round(average(matching.map((run) => run.durationMs / 60_000))),
        averageEndingMorale: round(average(matching.flatMap((run) => run.endingMorale ?? []))),
        averageEndingTechDebt: round(average(matching.flatMap((run) => run.endingTechDebt ?? []))),
      };
    })
    .sort((left, right) => right.runs - left.runs || left.label.localeCompare(right.label));
}

export function createProductionTelemetryReport(
  runs: readonly ProductionTelemetryRun[],
  generatedAt = new Date().toISOString(),
): ProductionTelemetryReport {
  const completed = runs.filter((run) => run.outcome);
  const outcomes = [...new Set(runs.map((run) => run.outcome ?? `incomplete-on-${run.lastScreen}`))]
    .map((label) => ({
      label,
      runs: runs.filter((run) => (run.outcome ?? `incomplete-on-${run.lastScreen}`) === label)
        .length,
    }))
    .sort((left, right) => right.runs - left.runs || left.label.localeCompare(right.label));
  return {
    generatedAt,
    totalRuns: runs.length,
    completedRuns: completed.length,
    squads: summarizeGroups(runs, (run) => run.squad.join(" / ") || "Squad not locked"),
    bosses: summarizeGroups(runs, (run) => run.bossId ?? "Boss unknown"),
    outcomes,
    recentRuns: [...runs].sort((left, right) => right.startedAt.localeCompare(left.startedAt)),
  };
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function bar(value: number, width = 12): string {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function duration(durationMs: number): string {
  return `${(durationMs / 60_000).toFixed(1)}m`;
}

function formatGroups(title: string, groups: readonly GroupSummary[]): string[] {
  return [
    title,
    ...(groups.length === 0
      ? ["  No runs yet."]
      : groups.map(
          (group) =>
            `  ${group.label.padEnd(32)} ${bar(group.winRate)} ${percent(group.winRate).padStart(4)}  ${String(group.runs).padStart(3)} runs  ${group.averageDurationMinutes.toFixed(1).padStart(5)}m  morale ${group.averageEndingMorale.toFixed(1)}  debt ${group.averageEndingTechDebt.toFixed(1)}`,
        )),
  ];
}

export function formatProductionTelemetryReport(report: ProductionTelemetryReport): string {
  return [
    "LGTM! // PRODUCTION PLAYTESTS",
    `${report.totalRuns} anonymous runs · ${report.completedRuns} completed · ${report.generatedAt}`,
    "",
    ...formatGroups("SQUADS", report.squads),
    "",
    ...formatGroups("FINAL RELEASE BOSSES", report.bosses),
    "",
    "OUTCOMES",
    ...(report.outcomes.length === 0
      ? ["  No runs yet."]
      : report.outcomes.map(
          (outcome) => `  ${outcome.label.padEnd(32)} ${String(outcome.runs).padStart(3)}`,
        )),
    "",
    "RECENT RUNS",
    ...(report.recentRuns.length === 0
      ? ["  The telemetry cupboard is currently bare."]
      : report.recentRuns
          .slice(0, 12)
          .map(
            (run) =>
              `  ${run.startedAt.slice(0, 16).replace("T", " ")}  ${(run.outcome ?? "incomplete").padEnd(10)}  ${(run.squad.join("/") || "no-squad").padEnd(24)}  ${duration(run.durationMs).padStart(7)}  M${String(run.endingMorale ?? "-").padStart(2)} D${String(run.endingTechDebt ?? "-").padStart(2)}  ${run.runId.slice(-8)}`,
          )),
  ].join("\n");
}
