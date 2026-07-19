import matejaDelighted from "../assets/bosses/mateja-delighted-v1.webp";
import matejaMaster from "../assets/bosses/mateja-master-v1.webp";
import matejaPitching from "../assets/bosses/mateja-pitching-v1.webp";
import tristanMaster from "../assets/bosses/tristan-master-v1.webp";
import tristanSatisfied from "../assets/bosses/tristan-satisfied-v1.webp";
import tristanThinking from "../assets/bosses/tristan-thinking-v1.webp";
import { getCycle } from "./content";
import type {
  BossEffect,
  BossPhase,
  CycleDefinition,
  CycleState,
  IntentDefinition,
  RunState,
  TaskDefinition,
} from "./models";

type BossPhaseTrigger = { kind: "project-progress"; ratio: number } | { kind: "launch-ready" };

export type BossIntentEffect =
  | BossEffect
  | {
      kind: "validation-scope";
      taskIds: readonly string[];
      amount: number;
      fallback: BossEffect;
    }
  | {
      kind: "validation-crunch";
      taskIds: readonly string[];
      base: number;
      perOpenTask: number;
    };

export interface BossIntentDefinition {
  id: string;
  intentKind: IntentDefinition["kind"];
  label: string;
  summary: string;
  quote: string;
  sourceTaskId: string;
  effects: readonly BossIntentEffect[];
}

interface BossMilestoneDefinition {
  id: string;
  trigger: BossPhaseTrigger;
  effects: readonly BossEffect[];
  resolved: (cycle: CycleState) => boolean;
}

export interface BossPhaseDefinition {
  id: BossPhase;
  title: string;
  summary: string;
  reactionArt: string;
  onEnter: readonly BossEffect[];
  cadence: readonly BossIntentDefinition[];
  milestones?: readonly BossMilestoneDefinition[];
  exitTrigger?: BossPhaseTrigger;
}

export interface BossDefinition {
  id: string;
  stakeholder: string;
  title: string;
  projectTitle: string;
  warning: string;
  portrait: string;
  eligibility: (seed: number) => boolean;
  project: CycleDefinition;
  phases: readonly BossPhaseDefinition[];
  achievement: {
    name: string;
    rules: string;
  };
  retroLines: {
    victory: string;
    knownIssues: string;
    defeat: string;
  };
}

const matejaProject: TaskDefinition = {
  id: "final-release",
  name: "Datum: Monday Launch",
  role: "primary",
  requirements: [
    { discipline: "frontend", target: 10 },
    { discipline: "backend", target: 10 },
    { discipline: "infra", target: 10 },
  ],
  intents: [],
};

const makeItAPlatform: TaskDefinition = {
  id: "make-it-a-platform",
  name: "Make It a Platform",
  role: "complication",
  requirements: [
    { discipline: "backend", target: 8 },
    { discipline: "infra", target: 7 },
  ],
  intents: [],
};

const tristanProject: TaskDefinition = {
  id: "final-release",
  name: "Prove the Fraud Model",
  role: "primary",
  requirements: [
    { discipline: "frontend", target: 10 },
    { discipline: "backend", target: 10 },
    { discipline: "infra", target: 10 },
  ],
  intents: [],
};

const checkFalsePositives: TaskDefinition = {
  id: "check-false-positives",
  name: "Check False Positives",
  role: "complication",
  requirements: [{ discipline: "backend", target: 5 }],
  intents: [],
};

const segmentBreakdown: TaskDefinition = {
  id: "segment-breakdown",
  name: "Segment Breakdown",
  role: "complication",
  requirements: [{ discipline: "frontend", target: 5 }],
  intents: [],
};

const matejaWork = (amount: number): BossIntentDefinition => ({
  id: `i-built-this-bit-${amount}`,
  intentKind: "ai-assist",
  label: "I Built This Bit",
  summary: `Add ${amount} Unverified AI Assisted Work to the requirement with the most Work left.`,
  quote: "i had a go over the weekend",
  sourceTaskId: matejaProject.id,
  effects: [
    {
      kind: "work",
      target: { kind: "open-requirement", order: "most-remaining" },
      amount,
      workKind: "unverified",
    },
  ],
});

const matejaScope = (amount: number): BossIntentDefinition => ({
  id: `one-more-thing-${amount}`,
  intentKind: "scope",
  label: "One More Thing",
  summary: `Add ${amount} Scope to the requirement closest to completion.`,
  quote: "tiny thought",
  sourceTaskId: matejaProject.id,
  effects: [
    {
      kind: "scope",
      target: { kind: "open-requirement", order: "least-remaining" },
      amount,
    },
  ],
});

const crunch = (
  id: string,
  label: string,
  summary: string,
  quote: string,
  sourceTaskId: string,
  moraleLoss: number,
): BossIntentDefinition => ({
  id,
  intentKind: "crunch",
  label,
  summary,
  quote,
  sourceTaskId,
  effects: [{ kind: "crunch", moraleLoss }],
});

const needMoreData = (amount: number): BossIntentDefinition => ({
  id: `need-more-data-${amount}`,
  intentKind: "scope",
  label: "Need More Data",
  summary: `Add ${amount} Scope to each open Validation Task; if there are none, add it to Backend.`,
  quote: "could we increase the sample?",
  sourceTaskId: tristanProject.id,
  effects: [
    {
      kind: "validation-scope",
      taskIds: [checkFalsePositives.id, segmentBreakdown.id],
      amount,
      fallback: {
        kind: "scope",
        target: { kind: "task", taskId: tristanProject.id, discipline: "backend" },
        amount,
      },
    },
  ],
});

const checkOutliers = (amount: number): BossIntentDefinition => ({
  id: `check-the-outliers-${amount}`,
  intentKind: "regression",
  label: "Check the Outliers",
  summary: `Regress ${amount} Work from the most advanced open requirement.`,
  quote: "what happens if we remove that segment?",
  sourceTaskId: tristanProject.id,
  effects: [
    {
      kind: "regression",
      target: { kind: "open-requirement", order: "most-progress" },
      amount,
    },
  ],
});

const readoutTomorrow = (base: number, perOpenTask: number): BossIntentDefinition => ({
  id: `readout-tomorrow-${base}-${perOpenTask}`,
  intentKind: "crunch",
  label: "Readout Tomorrow",
  summary: `Lose ${base} Morale, plus ${perOpenTask} for each unfinished Validation Task. Block applies.`,
  quote: "this will be a very relaxed readout",
  sourceTaskId: tristanProject.id,
  effects: [
    {
      kind: "validation-crunch",
      taskIds: [checkFalsePositives.id, segmentBreakdown.id],
      base,
      perOpenTask,
    },
  ],
});

const alwaysEligible = () => true;

export const bossDefinitions: readonly BossDefinition[] = [
  {
    id: "mateja-weekend-pivot",
    stakeholder: "Mateja",
    title: "The Weekend Pivot",
    projectTitle: "Datum: Monday Launch",
    warning: "Expect rapid Scope and helpful Unverified Work.",
    portrait: matejaMaster,
    eligibility: alwaysEligible,
    project: {
      id: "mateja-weekend-pivot",
      name: "Datum: Monday Launch",
      maxDays: 9,
      tasks: [matejaProject, makeItAPlatform],
    },
    phases: [
      {
        id: "build",
        title: "Build",
        summary: "Mateja has already made a surprising amount of Datum.",
        reactionArt: matejaMaster,
        onEnter: [],
        cadence: [
          matejaWork(6),
          matejaScope(5),
          crunch(
            "demo-tomorrow-5",
            "Demo Tomorrow",
            "Lose 5 Morale. Block applies.",
            "demo tomorrow?",
            matejaProject.id,
            5,
          ),
        ],
        exitTrigger: { kind: "project-progress", ratio: 0.48 },
      },
      {
        id: "stakeholder-review",
        title: "Actually, It's a Platform",
        summary: "Make It a Platform is now required for launch. The helpful chaos intensifies.",
        reactionArt: matejaPitching,
        onEnter: [{ kind: "spawn-task", task: makeItAPlatform, requiredForLaunch: true }],
        cadence: [
          matejaWork(7),
          matejaScope(6),
          crunch(
            "demo-tomorrow-7",
            "Demo Tomorrow",
            "Lose 7 Morale. Block applies.",
            "i've invited a few people",
            matejaProject.id,
            7,
          ),
        ],
        exitTrigger: { kind: "launch-ready" },
      },
      {
        id: "launch-window",
        title: "Launch Window",
        summary: "Required Work is complete. Clean it up—or ship before the next idea arrives.",
        reactionArt: matejaDelighted,
        onEnter: [],
        cadence: [
          crunch(
            "demo-tomorrow-8",
            "Demo Tomorrow",
            "Lose 8 Morale. Block applies.",
            "the launch post is drafted",
            matejaProject.id,
            8,
          ),
          matejaScope(4),
        ],
      },
    ],
    achievement: {
      name: "Weekend Survivor",
      rules: "Ship Datum against Mateja.",
    },
    retroLines: {
      victory: "shipped before he invented a third product",
      knownIssues: "datum has entered its iterate-in-public era",
      defeat: "the demo was extremely compelling, technically",
    },
  },
  {
    id: "tristan-significance-test",
    stakeholder: "Tristan",
    title: "The Significance Test",
    projectTitle: "Prove the Fraud Model",
    warning: "Expect Validation Tasks and distributed pressure.",
    portrait: tristanMaster,
    eligibility: alwaysEligible,
    project: {
      id: "tristan-significance-test",
      name: "Prove the Fraud Model",
      maxDays: 9,
      tasks: [tristanProject, checkFalsePositives, segmentBreakdown],
    },
    phases: [
      {
        id: "build",
        title: "Build",
        summary: "The model looks promising. Tristan has several very reasonable questions.",
        reactionArt: tristanMaster,
        onEnter: [],
        cadence: [
          needMoreData(4),
          checkOutliers(4),
          crunch(
            "initial-readout-4",
            "Readout Tomorrow",
            "Lose 4 Morale. Block applies.",
            "quick sense-check tomorrow",
            tristanProject.id,
            4,
          ),
        ],
        exitTrigger: { kind: "project-progress", ratio: 0.45 },
      },
      {
        id: "stakeholder-review",
        title: "Segment the Results",
        summary:
          "Check False Positives is required. A second Validation Task arrives at 72% progress.",
        reactionArt: tristanThinking,
        onEnter: [{ kind: "spawn-task", task: checkFalsePositives, requiredForLaunch: true }],
        cadence: [needMoreData(3), checkOutliers(5), readoutTomorrow(4, 2)],
        milestones: [
          {
            id: "segment-breakdown",
            trigger: { kind: "project-progress", ratio: 0.72 },
            effects: [{ kind: "spawn-task", task: segmentBreakdown, requiredForLaunch: true }],
            resolved: (cycle) => cycle.tasks.some((task) => task.taskId === segmentBreakdown.id),
          },
        ],
        exitTrigger: { kind: "launch-ready" },
      },
      {
        id: "launch-window",
        title: "Confidence Gate",
        summary: "Both Validation Tasks shipped. Defend the readout and choose when to launch.",
        reactionArt: tristanSatisfied,
        onEnter: [],
        cadence: [readoutTomorrow(5, 2), checkOutliers(5)],
      },
    ],
    achievement: {
      name: "Statistically Shipped",
      rules: "Pass Tristan's Significance Test.",
    },
    retroLines: {
      victory: "sample size: acceptable",
      knownIssues: "directionally significant",
      defeat: "further research required",
    },
  },
] as const;

function seededIndex(seed: number, length: number): number {
  let value = (seed ^ 0xb055f19e) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) % length;
}

export function selectBossDefinition(
  seed: number,
  catalogue: readonly BossDefinition[] = bossDefinitions,
): BossDefinition {
  const eligible = catalogue.filter((boss) => boss.eligibility(seed));
  if (eligible.length === 0) throw new Error("No eligible Final Release boss definitions.");
  return eligible[seededIndex(seed, eligible.length)]!;
}

export function getBossDefinition(
  id: string,
  catalogue: readonly BossDefinition[] = bossDefinitions,
): BossDefinition {
  const boss = catalogue.find((candidate) => candidate.id === id);
  if (!boss) throw new Error(`Unknown boss: ${id}`);
  return boss;
}

export function getBossPhase(boss: BossDefinition, phase: BossPhase): BossPhaseDefinition {
  const definition = boss.phases.find((candidate) => candidate.id === phase);
  if (!definition) throw new Error(`Boss ${boss.id} does not define phase ${phase}.`);
  return definition;
}

function phaseStartedDay(run: RunState, phase: BossPhase): number {
  if (phase === "build") return 1;
  for (const event of [...run.history].reverse()) {
    if (event.kind === "boss-phase-changed" && event.to === phase) return event.day;
  }
  return 1;
}

export function getScheduledBossIntent(
  run: RunState,
  cycle: CycleState,
  boss: BossDefinition = getBossDefinition(cycle.boss?.bossId ?? run.selectedBossId),
): BossIntentDefinition | undefined {
  if (!cycle.boss) return undefined;
  const cadence = getBossPhase(boss, cycle.boss.phase).cadence;
  if (cadence.length === 0) return undefined;
  const elapsedDays = Math.max(0, cycle.day - phaseStartedDay(run, cycle.boss.phase));
  return cadence[elapsedDays % cadence.length];
}

export function getScheduledBossMoraleLoss(
  run: RunState,
  cycle: CycleState,
  boss: BossDefinition = getBossDefinition(cycle.boss?.bossId ?? run.selectedBossId),
): number {
  const intent = getScheduledBossIntent(run, cycle, boss);
  if (!intent) return 0;
  const sourceTask = cycle.tasks.find((task) => task.taskId === intent.sourceTaskId);
  if (sourceTask?.stunned) return 0;
  return intent.effects.reduce((total, effect) => {
    if (effect.kind === "crunch") return total + effect.moraleLoss;
    if (effect.kind !== "validation-crunch") return total;
    const unfinishedValidations = effect.taskIds.filter((taskId) => {
      const task = cycle.tasks.find((candidate) => candidate.taskId === taskId);
      return task && task.status !== "shipped";
    }).length;
    return total + effect.base + effect.perOpenTask * unfinishedValidations;
  }, 0);
}

export function getEncounterCycleDefinition(cycle: CycleState): CycleDefinition {
  return cycle.boss ? getBossDefinition(cycle.boss.bossId).project : getCycle(cycle.cycleId);
}
