import { describe, expect, it } from "vitest";
import { getCycle } from "./content";
import {
  authoredCycleCatalogue,
  selectEncounterLineup,
  type AuthoredCycleDefinition,
} from "./encounters";
import type { CycleDefinition, EncounterShape, EncounterTier } from "./models";

const catalogue: readonly AuthoredCycleDefinition[] = authoredCycleCatalogue;

function baseWork(cycle: CycleDefinition): number {
  return cycle.tasks
    .filter((task) => task.role !== "complication")
    .flatMap((task) => task.requirements)
    .reduce((total, requirement) => total + requirement.target, 0);
}

describe("tiered Cycle catalogue", () => {
  it("registers unique playable definitions for every tactical shape", () => {
    const ids = catalogue.map((cycle) => cycle.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(15);

    const expectedShapes: EncounterShape[] = [
      "balanced",
      "tall",
      "wide",
      "crunch",
      "verification",
      "volatile",
    ];
    expect(new Set(catalogue.map((cycle) => cycle.shape))).toEqual(new Set(expectedShapes));

    for (const cycle of catalogue) {
      expect(getCycle(cycle.id)).toBe(cycle);
      expect(cycle.tasks.some((task) => task.role !== "complication")).toBe(true);
      expect(cycle.tasks.every((task) => task.intents.length <= cycle.maxDays)).toBe(true);
    }
  });

  it("escalates base Work from early through mid and late pools", () => {
    const byTier = (tier: EncounterTier) =>
      catalogue.filter((cycle) => cycle.tier === tier).map(baseWork);

    expect(byTier("early").every((work) => work >= 14 && work <= 18)).toBe(true);
    expect(byTier("mid").every((work) => work >= 24 && work <= 32)).toBe(true);
    expect(byTier("late").every((work) => work >= 36 && work <= 46)).toBe(true);
    expect(baseWork(getCycle("upgrade-every-dependency"))).toBe(26);
    expect(baseWork(getCycle("migrate-postgres-safely"))).toBe(38);
  });

  it("keeps authored quiet Days in the schedule instead of collapsing pressure forward", () => {
    expect(getCycle("finish-mcp-server").tasks[0]?.intents[1]).toBeNull();
    expect(getCycle("ai-results-analysis").tasks[0]?.intents).toEqual([
      { kind: "ai-assist", discipline: "backend", amount: 3 },
      null,
      { kind: "scope", discipline: "backend", amount: 3 },
      null,
      { kind: "crunch", moraleLoss: 3 },
    ]);
    expect(getCycle("session-is-live").tasks[0]?.intents[3]).toBeNull();
  });

  it("builds deterministic no-repeat lineups with guaranteed Tall and Wide showcases", () => {
    const lineups = Array.from({ length: 64 }, (_, seed) => selectEncounterLineup(seed + 1));

    for (let index = 0; index < lineups.length; index += 1) {
      const lineup = lineups[index]!;
      expect(selectEncounterLineup(index + 1)).toEqual(lineup);
      const ordinaryIds = [
        lineup.opener,
        lineup.early,
        lineup.tall,
        lineup.wide,
        lineup.mid,
        lineup.late,
      ];
      expect(new Set(ordinaryIds).size).toBe(ordinaryIds.length);
      expect(getCycle(lineup.tall).shape).toBe("tall");
      expect(getCycle(lineup.wide).shape).toBe("wide");
      expect(getCycle(lineup.late).tier).toBe("late");
      expect(lineup.safeIncidents).toEqual(["upgrade-every-dependency", "migrate-postgres-safely"]);
    }

    expect(new Set(lineups.map((lineup) => lineup.early)).size).toBeGreaterThan(1);
    expect(new Set(lineups.map((lineup) => lineup.tall)).size).toBeGreaterThan(1);
    expect(new Set(lineups.map((lineup) => lineup.mid)).size).toBeGreaterThan(2);
    expect(new Set(lineups.map((lineup) => lineup.late)).size).toBeGreaterThan(3);
  });
});
