import { cards } from "../domain/content";
import type { PlaytestRunResult, PlaytestScenario } from "./simulator";

interface PlaytestScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  runs: number;
  reachedFinalRelease: number;
  reachRate: number;
  launchedFinalRelease: number;
  launchRate: number;
  wins: number;
  winRate: number;
  stalled: number;
  averageEncounters: number;
  averageCyclesShipped: number;
  averageDays: number;
  averageEndingMorale: number;
  averageTechDebt: number;
  averageCardsPerDay: number;
  averagePeakChain: number;
  averageAutomation: number;
  averageBlockPrevented: number;
  averageDeadHands: number;
  averageDefects: number;
  averageScheduleBonusCredits: number;
  loopGuardTrips: number;
  averageDurationMinutes: number;
}

export interface PlaytestBatchReport {
  schemaVersion: 1;
  generatedAt: string;
  totalRuns: number;
  summaries: PlaytestScenarioSummary[];
  bossWinRates: {
    bossId: string;
    runs: number;
    reachRate: number;
    launchRate: number;
    winRate: number;
  }[];
  outcomeCounts: { outcome: string; runs: number }[];
  cardAssociations: CardAssociationSummary[];
  diagnostics: string[];
  runs: PlaytestRunResult[];
}

interface CardAssociationSummary {
  cardId: string;
  cardName: string;
  ownerId?: string;
  rare: boolean;
  eligibleRuns: number;
  presentRuns: number;
  absentRuns: number;
  winsWith: number;
  winsWithout: number;
  winRateWith: number | null;
  winRateWithout: number | null;
  winRateLift: number | null;
  averageCopiesWhenPresent: number;
  winningDeckInclusionRate: number | null;
  offeredCount: number;
  pickedCount: number;
  pickRate: number | null;
  acquisitionCount: number;
  removalCount: number;
  averageTechDebtAtAcquisition: number | null;
  averageMoraleAtAcquisition: number | null;
  averageEncounterAtAcquisition: number | null;
  outcomes: Record<CardOutcomeKey, CardOutcomeAssociation>;
}

type CardOutcomeKey = "reach" | "launch" | "clean";

interface CardOutcomeAssociation {
  successesWith: number;
  successesWithout: number;
  rateWith: number | null;
  rateWithout: number | null;
  rawLift: number | null;
  stratifiedLift: number | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  strata: number;
  stratifiedRuns: number;
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, places = 1): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function deckCopies(run: PlaytestRunResult, cardId: string): number {
  return run.finalDeck?.find((card) => card.cardId === cardId)?.copies ?? 0;
}

const cardOutcomePredicates: Readonly<Record<CardOutcomeKey, (run: PlaytestRunResult) => boolean>> =
  {
    reach: (run) => run.reachedFinalRelease,
    launch: (run) => run.launchedFinalRelease,
    clean: (run) => run.outcome === "victory",
  };

function summarizeCardOutcome(
  runs: readonly PlaytestRunResult[],
  cardId: string,
  outcome: CardOutcomeKey,
): CardOutcomeAssociation {
  const succeeds = cardOutcomePredicates[outcome];
  const presentRuns = runs.filter((run) => deckCopies(run, cardId) > 0);
  const absentRuns = runs.filter((run) => deckCopies(run, cardId) === 0);
  const successesWith = presentRuns.filter(succeeds).length;
  const successesWithout = absentRuns.filter(succeeds).length;
  const rateWith = presentRuns.length === 0 ? null : successesWith / presentRuns.length;
  const rateWithout = absentRuns.length === 0 ? null : successesWithout / absentRuns.length;
  const strata = [...new Set(runs.map((run) => run.scenarioId))].flatMap((scenarioId) => {
    const scenarioRuns = runs.filter((run) => run.scenarioId === scenarioId);
    const withCard = scenarioRuns.filter((run) => deckCopies(run, cardId) > 0);
    const withoutCard = scenarioRuns.filter((run) => deckCopies(run, cardId) === 0);
    if (withCard.length === 0 || withoutCard.length === 0) return [];
    const withSuccesses = withCard.filter(succeeds).length;
    const withoutSuccesses = withoutCard.filter(succeeds).length;
    const withRate = withSuccesses / withCard.length;
    const withoutRate = withoutSuccesses / withoutCard.length;
    const weight = (withCard.length * withoutCard.length) / scenarioRuns.length;
    const adjustedWithRate = (withSuccesses + 1) / (withCard.length + 2);
    const adjustedWithoutRate = (withoutSuccesses + 1) / (withoutCard.length + 2);
    const variance =
      (adjustedWithRate * (1 - adjustedWithRate)) / withCard.length +
      (adjustedWithoutRate * (1 - adjustedWithoutRate)) / withoutCard.length;
    return [
      {
        lift: withRate - withoutRate,
        weight,
        variance,
        runs: withCard.length + withoutCard.length,
      },
    ];
  });
  const totalWeight = strata.reduce((sum, stratum) => sum + stratum.weight, 0);
  const stratifiedLift =
    totalWeight === 0
      ? null
      : strata.reduce((sum, stratum) => sum + stratum.lift * stratum.weight, 0) / totalWeight;
  const standardError =
    totalWeight === 0
      ? null
      : Math.sqrt(
          strata.reduce((sum, stratum) => sum + stratum.weight ** 2 * stratum.variance, 0) /
            totalWeight ** 2,
        );
  return {
    successesWith,
    successesWithout,
    rateWith,
    rateWithout,
    rawLift: rateWith === null || rateWithout === null ? null : rateWith - rateWithout,
    stratifiedLift,
    confidenceLow:
      stratifiedLift === null || standardError === null
        ? null
        : Math.max(-1, stratifiedLift - 1.96 * standardError),
    confidenceHigh:
      stratifiedLift === null || standardError === null
        ? null
        : Math.min(1, stratifiedLift + 1.96 * standardError),
    strata: strata.length,
    stratifiedRuns: strata.reduce((sum, stratum) => sum + stratum.runs, 0),
  };
}

function createCardAssociations(runs: readonly PlaytestRunResult[]): CardAssociationSummary[] {
  return cards
    .filter((card) => card.tags.includes("reward"))
    .map((card) => {
      const eligibleRuns = runs.filter(
        (run) => !card.ownerId || run.squad.includes(card.ownerId) || deckCopies(run, card.id) > 0,
      );
      const presentRuns = eligibleRuns.filter((run) => deckCopies(run, card.id) > 0);
      const absentRuns = eligibleRuns.filter((run) => deckCopies(run, card.id) === 0);
      const winsWith = presentRuns.filter((run) => run.outcome === "victory").length;
      const winsWithout = absentRuns.filter((run) => run.outcome === "victory").length;
      const eligibleWins = winsWith + winsWithout;
      const winRateWith = presentRuns.length === 0 ? null : winsWith / presentRuns.length;
      const winRateWithout = absentRuns.length === 0 ? null : winsWithout / absentRuns.length;
      const offers = eligibleRuns.flatMap((run) =>
        (run.cardOffers ?? []).filter((offer) => offer.offeredCardIds.includes(card.id)),
      );
      const pickedCount = offers.reduce(
        (sum, offer) => sum + offer.selectedCardIds.filter((cardId) => cardId === card.id).length,
        0,
      );
      const acquisitions = eligibleRuns.flatMap((run) =>
        (run.cardAcquisitions ?? []).filter((acquisition) => acquisition.cardId === card.id),
      );
      const removals = eligibleRuns.flatMap((run) =>
        (run.cardRemovals ?? []).filter((removal) => removal.cardId === card.id),
      );
      return {
        cardId: card.id,
        cardName: card.name,
        ...(card.ownerId ? { ownerId: card.ownerId } : {}),
        rare: card.tags.includes("rare"),
        eligibleRuns: eligibleRuns.length,
        presentRuns: presentRuns.length,
        absentRuns: absentRuns.length,
        winsWith,
        winsWithout,
        winRateWith,
        winRateWithout,
        winRateLift:
          winRateWith === null || winRateWithout === null ? null : winRateWith - winRateWithout,
        averageCopiesWhenPresent: round(
          average(presentRuns.map((run) => deckCopies(run, card.id))),
          2,
        ),
        winningDeckInclusionRate: eligibleWins === 0 ? null : winsWith / eligibleWins,
        offeredCount: offers.length,
        pickedCount,
        pickRate: offers.length === 0 ? null : pickedCount / offers.length,
        acquisitionCount: acquisitions.length,
        removalCount: removals.length,
        averageTechDebtAtAcquisition:
          acquisitions.length === 0
            ? null
            : round(average(acquisitions.map((acquisition) => acquisition.techDebt)), 2),
        averageMoraleAtAcquisition:
          acquisitions.length === 0
            ? null
            : round(average(acquisitions.map((acquisition) => acquisition.morale)), 2),
        averageEncounterAtAcquisition:
          acquisitions.length === 0
            ? null
            : round(average(acquisitions.map((acquisition) => acquisition.encounters)), 2),
        outcomes: {
          reach: summarizeCardOutcome(eligibleRuns, card.id, "reach"),
          launch: summarizeCardOutcome(eligibleRuns, card.id, "launch"),
          clean: summarizeCardOutcome(eligibleRuns, card.id, "clean"),
        },
      };
    })
    .sort((left, right) => left.cardName.localeCompare(right.cardName));
}

function summarizeGroup(runs: readonly PlaytestRunResult[]): PlaytestScenarioSummary {
  const wins = runs.filter((run) => run.outcome === "victory").length;
  const reachedFinalRelease = runs.filter((run) => run.reachedFinalRelease).length;
  const launchedFinalRelease = runs.filter((run) => run.launchedFinalRelease).length;
  const days = runs.map((run) => run.days);
  return {
    scenarioId: runs[0]?.scenarioId ?? "unknown",
    scenarioName: runs[0]?.scenarioName ?? "Unknown",
    runs: runs.length,
    reachedFinalRelease,
    reachRate: runs.length === 0 ? 0 : reachedFinalRelease / runs.length,
    launchedFinalRelease,
    launchRate: runs.length === 0 ? 0 : launchedFinalRelease / runs.length,
    wins,
    winRate: runs.length === 0 ? 0 : wins / runs.length,
    stalled: runs.filter((run) => run.outcome === "stalled" || run.outcome === "incomplete").length,
    averageEncounters: round(average(runs.map((run) => run.encounters))),
    averageCyclesShipped: round(average(runs.map((run) => run.cyclesShipped))),
    averageDays: round(average(days)),
    averageEndingMorale: round(average(runs.map((run) => run.endingMorale))),
    averageTechDebt: round(average(runs.map((run) => run.endingTechDebt))),
    averageCardsPerDay: round(
      average(runs.map((run) => (run.days === 0 ? 0 : run.cardsPlayed / run.days))),
    ),
    averagePeakChain: round(average(runs.map((run) => run.peakChain))),
    averageAutomation: round(average(runs.map((run) => run.automationInstalled))),
    averageBlockPrevented: round(average(runs.map((run) => run.blockPrevented))),
    averageDeadHands: round(average(runs.map((run) => run.deadHands))),
    averageDefects: round(average(runs.map((run) => run.defects))),
    averageScheduleBonusCredits: round(average(runs.map((run) => run.scheduleBonusCredits))),
    loopGuardTrips: runs.reduce((sum, run) => sum + run.loopGuardTrips, 0),
    averageDurationMinutes: round(
      average(
        runs.flatMap((run) => (run.durationMs === undefined ? [] : [run.durationMs / 60_000])),
      ),
    ),
  };
}

export function createPlaytestReport(
  runs: readonly PlaytestRunResult[],
  scenarios: readonly PlaytestScenario[],
  generatedAt = new Date().toISOString(),
): PlaytestBatchReport {
  const summaries = [...new Set(runs.map((run) => run.scenarioId))].map((scenarioId) =>
    summarizeGroup(runs.filter((run) => run.scenarioId === scenarioId)),
  );
  const bossIds = [...new Set(runs.map((run) => run.bossId))].sort();
  const bossWinRates = bossIds.map((bossId) => {
    const bossRuns = runs.filter((run) => run.bossId === bossId);
    return {
      bossId,
      runs: bossRuns.length,
      reachRate:
        bossRuns.length === 0
          ? 0
          : bossRuns.filter((run) => run.reachedFinalRelease).length / bossRuns.length,
      launchRate:
        bossRuns.length === 0
          ? 0
          : bossRuns.filter((run) => run.launchedFinalRelease).length / bossRuns.length,
      winRate:
        bossRuns.length === 0
          ? 0
          : bossRuns.filter((run) => run.outcome === "victory").length / bossRuns.length,
    };
  });
  const diagnostics: string[] = [];
  const outcomeLabels = runs.map((run) =>
    run.outcome === "victory" ? "victory" : (run.cause ?? run.outcome),
  );
  const outcomeCounts = [...new Set(outcomeLabels)]
    .map((outcome) => ({
      outcome,
      runs: outcomeLabels.filter((candidate) => candidate === outcome).length,
    }))
    .sort((left, right) => right.runs - left.runs);
  const cardAssociations = createCardAssociations(runs);
  for (const summary of summaries) {
    const scenario = scenarios.find((candidate) => candidate.id === summary.scenarioId);
    if (summary.stalled > 0) {
      diagnostics.push(`${summary.scenarioName}: ${summary.stalled} runs did not reach Retro.`);
    }
    if (summary.loopGuardTrips > 0) {
      diagnostics.push(
        `${summary.scenarioName}: loop guard tripped ${summary.loopGuardTrips} times; inspect for an infinite or excessively long turn.`,
      );
    }
    if (summary.reachRate === 0) {
      diagnostics.push(`${summary.scenarioName}: never reached Final Release.`);
    } else if (summary.launchRate === 0) {
      diagnostics.push(`${summary.scenarioName}: reached Final Release but never launched.`);
    }
    if (summary.winRate === 0) {
      diagnostics.push(`${summary.scenarioName}: no clean wins in this batch.`);
    }
    if (summary.winRate === 1 && summary.averageEndingMorale >= 8) {
      diagnostics.push(
        `${summary.scenarioName}: 100% wins with high Morale; may be under-pressured.`,
      );
    }
    if (summary.runs >= 50 && summary.launchRate < 0.2) {
      diagnostics.push(
        `${summary.scenarioName}: only ${percent(summary.launchRate)} launched; severe low outlier.`,
      );
    }
    if (summary.runs >= 50 && summary.launchRate > 0.9) {
      diagnostics.push(
        `${summary.scenarioName}: ${percent(summary.launchRate)} launched; severe high outlier.`,
      );
    }
    if (summary.runs >= 50 && summary.winRate > 0 && summary.winRate < 0.03) {
      diagnostics.push(
        `${summary.scenarioName}: only ${percent(summary.winRate)} launched cleanly.`,
      );
    }
    if (scenario?.expectedSignal === "automation" && summary.averageAutomation < 2) {
      diagnostics.push(`${summary.scenarioName}: its automation engine barely installed anything.`);
    }
    if (scenario?.expectedSignal === "chain" && summary.averagePeakChain < 3) {
      diagnostics.push(`${summary.scenarioName}: average peak Chain stayed below 3.`);
    }
    if (scenario?.expectedSignal === "cards" && summary.averageCardsPerDay < 3.5) {
      diagnostics.push(`${summary.scenarioName}: Card Storm never became much of a storm.`);
    }
    if (scenario?.expectedSignal === "block" && summary.averageBlockPrevented < 5) {
      diagnostics.push(`${summary.scenarioName}: Block prevented very little Morale damage.`);
    }
    if (scenario?.expectedSignal === "debt" && summary.averageTechDebt < 1) {
      diagnostics.push(`${summary.scenarioName}: the Debt build never meaningfully touched Debt.`);
    }
  }
  if (summaries.length >= 2) {
    const launchRates = summaries.map((summary) => summary.launchRate);
    const launchSpread = Math.max(...launchRates) - Math.min(...launchRates);
    if (launchSpread >= 0.35) {
      diagnostics.push(
        `Build launch spread is ${percent(launchSpread)}; separate pilot and squad effects before balance changes.`,
      );
    }
  }
  if (runs.length >= 100 && runs.some((run) => (run.cardOffers?.length ?? 0) > 0)) {
    const neverOffered = cardAssociations.filter((card) => card.offeredCount === 0);
    const neverPicked = cardAssociations.filter(
      (card) => card.offeredCount >= 20 && card.pickedCount === 0,
    );
    const underSampled = cardAssociations.filter((card) => card.presentRuns < 30);
    if (neverOffered.length > 0) {
      const names = neverOffered
        .slice(0, 5)
        .map((card) => card.cardName)
        .join(", ");
      diagnostics.push(
        `${neverOffered.length} reward cards were never offered (${names}); inspect catalogue reachability.`,
      );
    }
    if (neverPicked.length > 0) {
      const names = neverPicked
        .slice(0, 5)
        .map((card) => card.cardName)
        .join(", ");
      diagnostics.push(
        `${neverPicked.length} reward cards were offered at least 20 times but never picked (${names}); inspect pilot valuation.`,
      );
    }
    if (underSampled.length > 0) {
      diagnostics.push(
        `${underSampled.length} reward cards finished in fewer than 30 decks; association coverage is incomplete.`,
      );
    }
  }
  return {
    schemaVersion: 1,
    generatedAt,
    totalRuns: runs.length,
    summaries,
    bossWinRates,
    outcomeCounts,
    cardAssociations,
    diagnostics,
    runs: [...runs],
  };
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function bar(value: number, width = 12): string {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function pad(value: string | number, width: number, align: "left" | "right" = "right"): string {
  const text = String(value);
  return align === "left" ? text.padEnd(width) : text.padStart(width);
}

function signedPercent(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatCardAssociationRows(associations: readonly CardAssociationSummary[]): string[] {
  const rankable = associations.filter(
    (card) =>
      card.presentRuns >= 30 &&
      card.absentRuns >= 30 &&
      card.outcomes.clean.strata >= 2 &&
      card.outcomes.clean.stratifiedLift !== null,
  );
  const positive = rankable
    .filter((card) => (card.outcomes.clean.confidenceLow ?? -1) > 0)
    .sort(
      (left, right) =>
        right.outcomes.clean.stratifiedLift! - left.outcomes.clean.stratifiedLift! ||
        right.presentRuns - left.presentRuns,
    )
    .slice(0, 8);
  const negative = rankable
    .filter((card) => (card.outcomes.clean.confidenceHigh ?? 1) < 0)
    .sort(
      (left, right) =>
        left.outcomes.clean.stratifiedLift! - right.outcomes.clean.stratifiedLift! ||
        right.presentRuns - left.presentRuns,
    )
    .slice(0, 8);
  const row = (card: CardAssociationSummary) => {
    const clean = card.outcomes.clean;
    const confidence = `[${signedPercent(clean.confidenceLow!)}, ${signedPercent(clean.confidenceHigh!)}]`;
    const pick = card.pickRate === null ? "--" : percent(card.pickRate);
    return `  ${pad(card.cardName, 26, "left")} ${pad(card.presentRuns, 4)}/${pad(card.eligibleRuns, 4)} decks · pick ${pad(pick, 4)} · reach ${pad(signedPercent(card.outcomes.reach.stratifiedLift ?? 0), 4)} · launch ${pad(signedPercent(card.outcomes.launch.stratifiedLift ?? 0), 4)} · clean ${pad(signedPercent(clean.stratifiedLift!), 4)} ${confidence}`;
  };

  if (positive.length === 0 && negative.length === 0) {
    return [
      "  No scenario-adjusted clean association clears 30 decks per side and a 95% interval yet.",
    ];
  }
  return [
    ...(positive.length > 0 ? ["  POSITIVE", ...positive.map(row)] : []),
    ...(positive.length > 0 && negative.length > 0 ? [""] : []),
    ...(negative.length > 0 ? ["  NEGATIVE", ...negative.map(row)] : []),
  ];
}

export function formatPlaytestReport(report: PlaytestBatchReport): string {
  const human = report.runs.length > 0 && report.runs.every((run) => run.policy === "human");
  const rows = report.summaries.map((summary) => [
    pad(summary.scenarioName, 24, "left"),
    `${bar(summary.launchRate)} ${pad(percent(summary.launchRate), 4)}`,
    pad(percent(summary.reachRate), 5),
    pad(percent(summary.winRate), 5),
    pad(summary.averageEncounters.toFixed(1), 6),
    pad(summary.averageCyclesShipped.toFixed(1), 7),
    pad(summary.averageDays.toFixed(1), 5),
    pad(summary.averageEndingMorale.toFixed(1), 6),
    pad(summary.averageTechDebt.toFixed(1), 5),
    pad(summary.averageCardsPerDay.toFixed(1), 7),
    pad(summary.averagePeakChain.toFixed(1), 6),
    pad(summary.averageAutomation.toFixed(1), 7),
    pad(summary.averageBlockPrevented.toFixed(1), 7),
    pad(summary.averageDeadHands.toFixed(1), 6),
    pad(summary.averageScheduleBonusCredits.toFixed(1), 7),
  ]);
  const header = [
    pad("BUILD", 24, "left"),
    pad("LAUNCH RATE", 17, "left"),
    pad("REACH", 5),
    pad("CLEAN", 5),
    pad("FIGHTS", 6),
    pad("SHIPPED", 7),
    pad("DAYS", 5),
    pad("MORALE", 6),
    pad("DEBT", 5),
    pad("CARDS/D", 7),
    pad("CHAIN", 6),
    pad("SCRIPT", 7),
    pad("BLOCKED", 7),
    pad("DEAD", 6),
    pad("EARLY$", 7),
  ];
  const separator = header.map((column) => "─".repeat(column.length));
  const bossRows = report.bossWinRates.map(
    (boss) =>
      `  ${pad(boss.bossId, 25, "left")} ${pad(percent(boss.reachRate), 4)} reached · ${bar(boss.launchRate, 12)} ${pad(percent(boss.launchRate), 4)} launched · ${pad(percent(boss.winRate), 4)} clean  (${boss.runs} runs)`,
  );
  const diagnostics =
    report.diagnostics.length === 0
      ? ["  ✓ No obvious smoke signals in this batch."]
      : report.diagnostics.map((diagnostic) => `  ! ${diagnostic}`);
  const outcomes = report.outcomeCounts.map(
    (outcome) =>
      `  ${pad(outcome.outcome, 24, "left")} ${pad(outcome.runs, 4)}  ${percent(outcome.runs / report.totalRuns)}`,
  );
  const deckModes = [...new Set(report.runs.map((run) => run.deckMode))];
  const deckLabel = `${deckModes.join(" + ")} deck${deckModes.length === 1 ? "s" : " modes"}`;
  const cardAssociationRows = formatCardAssociationRows(report.cardAssociations);

  return [
    human ? "LGTM! // HUMAN PLAYTESTS" : "LGTM! // SCRIPTED PLAYTESTS",
    `${report.totalRuns} ${human ? "recorded" : "seeded"} runs · ${deckLabel} · actual reducer · ${report.generatedAt}`,
    "",
    header.join("  "),
    separator.join("  "),
    ...rows.map((row) => row.join("  ")),
    ...(human
      ? [
          "",
          "WALL CLOCK",
          ...report.summaries.map(
            (summary) =>
              `  ${pad(summary.scenarioName, 24, "left")} ${summary.averageDurationMinutes.toFixed(1)} min average`,
          ),
        ]
      : []),
    "",
    "FINAL RELEASE BOSSES",
    ...bossRows,
    "",
    "OUTCOMES",
    ...outcomes,
    ...(!human
      ? [
          "",
          "CARD ASSOCIATIONS",
          "  Final permanent decks · scenario-adjusted lift · 95% interval · association, not causation",
          ...cardAssociationRows,
        ]
      : []),
    "",
    "SMOKE SIGNALS",
    ...diagnostics,
    "",
    "Legend: SCRIPT = Script power installed · BLOCKED = Morale damage prevented · DEAD = dead hands · EARLY$ = ahead-of-schedule Credits",
  ].join("\n");
}
