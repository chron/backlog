import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { promisify } from "node:util";
import {
  createProductionTelemetryReport,
  formatProductionTelemetryReport,
  type ProductionTelemetryRun,
} from "../src/telemetry/report";

interface D1RunRow {
  run_id: string;
  started_at: string;
  completed_at: string | null;
  last_screen: string;
  squad_json: string;
  boss_id: string | null;
  outcome: "victory" | "defeat" | null;
  cause: string | null;
  duration_ms: number;
  action_count: number;
  encounters: number;
  days: number;
  cards_played: number;
  tasks_shipped: number;
  defects: number;
  ending_morale: number | null;
  ending_tech_debt: number | null;
  peak_tech_debt: number;
  deck_size: number;
  tools_json: string;
}

interface WranglerQueryResult {
  results?: D1RunRow[];
  success?: boolean;
}

const parsed = parseArgs({
  args: process.argv.slice(2),
  options: {
    latest: { type: "string", default: "100" },
    local: { type: "boolean" },
    "include-incomplete": { type: "boolean" },
    json: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: false,
});

if (parsed.values.help) {
  console.log(`LGTM! production telemetry report

Usage: bun run telemetry:report [options]

  --latest <n>          Latest runs to include (default: 100)
  --local               Query the local D1 database instead of production
  --include-incomplete  Include runs that have not reached Retro
  --json <path>         Also write the report and run rows as JSON
  -h, --help            Show this help`);
  process.exit(0);
}

const latest = Number.parseInt(parsed.values.latest ?? "100", 10);
if (!Number.isSafeInteger(latest) || latest < 1 || latest > 10_000) {
  throw new Error("--latest must be an integer between 1 and 10000.");
}

const where = parsed.values["include-incomplete"] ? "" : "WHERE completed_at IS NOT NULL";
const sql = `SELECT run_id, started_at, completed_at, last_screen, squad_json, boss_id, outcome, cause, duration_ms, action_count, encounters, days, cards_played, tasks_shipped, defects, ending_morale, ending_tech_debt, peak_tech_debt, deck_size, tools_json FROM runs ${where} ORDER BY started_at DESC LIMIT ${latest}`;
const execFileAsync = promisify(execFile);
const { stdout } = await execFileAsync(
  process.execPath,
  [
    "x",
    "wrangler",
    "d1",
    "execute",
    "lgtm-telemetry",
    parsed.values.local ? "--local" : "--remote",
    "--json",
    "--command",
    sql,
  ],
  { env: { ...process.env, NO_COLOR: "1" }, maxBuffer: 10 * 1024 * 1024 },
);

const queryResult = JSON.parse(stdout) as WranglerQueryResult[];
const rows = queryResult.flatMap((result) => result.results ?? []);

function parseStringArray(value: string): string[] {
  const parsedValue = JSON.parse(value) as unknown;
  return Array.isArray(parsedValue) && parsedValue.every((entry) => typeof entry === "string")
    ? parsedValue
    : [];
}

const runs: ProductionTelemetryRun[] = rows.map((row) => ({
  runId: row.run_id,
  startedAt: row.started_at,
  completedAt: row.completed_at ?? undefined,
  lastScreen: row.last_screen,
  squad: parseStringArray(row.squad_json),
  bossId: row.boss_id ?? undefined,
  outcome: row.outcome ?? undefined,
  cause: row.cause ?? undefined,
  durationMs: row.duration_ms,
  actions: row.action_count,
  encounters: row.encounters,
  days: row.days,
  cardsPlayed: row.cards_played,
  tasksShipped: row.tasks_shipped,
  defects: row.defects,
  endingMorale: row.ending_morale ?? undefined,
  endingTechDebt: row.ending_tech_debt ?? undefined,
  peakTechDebt: row.peak_tech_debt,
  deckSize: row.deck_size,
  tools: parseStringArray(row.tools_json),
}));
const report = createProductionTelemetryReport(runs);
console.log(formatProductionTelemetryReport(report));

if (parsed.values.json) {
  const outputPath = resolve(parsed.values.json);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ report, runs }, null, 2)}\n`, "utf8");
  console.log(`\nRaw report: ${outputPath}`);
}
