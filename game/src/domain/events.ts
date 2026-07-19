import type { RunState } from "./models";

type EventArtTreatment = "scope" | "karaoke" | "call-grid" | "pull-request";
type EventChoiceTone = "steady" | "build" | "risk";
type EventOutcomeTone = "good" | "neutral" | "risk";
type EventLedgerResource = "credits" | "morale" | "tech-debt";
type DeferredEventPrimitive =
  | "deck-surgery"
  | "filtered-draft"
  | "tool-offer"
  | "next-cycle-modifier"
  | "temporary-guest-card";

interface EventOutcomeChip {
  text: string;
  tone: EventOutcomeTone;
}

export type EventEffect =
  | {
      kind: "ledger";
      resource: EventLedgerResource;
      amount: number;
      cap?: number;
    }
  | {
      kind: "deferred";
      primitive: DeferredEventPrimitive;
      preview: readonly EventOutcomeChip[];
      reason: string;
    };

interface EventRequirement {
  kind: "credits-at-least";
  amount: number;
  reason: string;
}

export interface EventChoiceDefinition {
  id: string;
  label: string;
  tone: EventChoiceTone;
  effects: readonly EventEffect[];
  requirements?: readonly EventRequirement[];
}

export interface EventDefinition {
  id: string;
  title: string;
  setup: string;
  artLabel: string;
  artTreatment: EventArtTreatment;
  eligibility: (run: RunState) => boolean;
  weight: (run: RunState) => number;
  choices: readonly EventChoiceDefinition[];
}

export interface ResolvedEventChoice {
  disabledReason?: string;
  effects: readonly Extract<EventEffect, { kind: "ledger" }>[];
  outcome: readonly EventOutcomeChip[];
}

const alwaysEligible = () => true;
const ordinaryWeight = () => 1;
const notInDemo = "Not in this demo";

export const eventDefinitions: readonly EventDefinition[] = [
  {
    id: "scope-creep",
    title: "Scope Creep",
    setup: "It's only one tiny thing. It is not one tiny thing.",
    artLabel: "+ ONE TINY THING",
    artTreatment: "scope",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "push-back",
        label: "Push Back",
        tone: "steady",
        effects: [{ kind: "ledger", resource: "morale", amount: 2, cap: 10 }],
      },
      {
        id: "sure-easy",
        label: "Sure, Easy",
        tone: "risk",
        effects: [
          { kind: "ledger", resource: "credits", amount: 35 },
          { kind: "ledger", resource: "tech-debt", amount: 3 },
        ],
      },
    ],
  },
  {
    id: "karaoke-night",
    title: "Karaoke Night",
    setup: "Someone has selected a song with a dangerously long instrumental intro.",
    artLabel: "♪ YOUR CUE ♪",
    artTreatment: "karaoke",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "solo",
        label: "Solo",
        tone: "steady",
        effects: [{ kind: "ledger", resource: "morale", amount: 4, cap: 10 }],
      },
      {
        id: "duet",
        label: "Duet",
        tone: "build",
        requirements: [{ kind: "credits-at-least", amount: 15, reason: "Need 15 Credits" }],
        effects: [
          {
            kind: "deferred",
            primitive: "deck-surgery",
            preview: [
              { text: "−15 Credits", tone: "risk" },
              { text: "Duplicate 1 non-Rare", tone: "good" },
            ],
            reason: notInDemo,
          },
        ],
      },
      {
        id: "power-ballad",
        label: "Power Ballad",
        tone: "risk",
        effects: [
          {
            kind: "deferred",
            primitive: "next-cycle-modifier",
            preview: [
              { text: "+2 Max Morale", tone: "good" },
              { text: "+1 Distraction next Cycle", tone: "risk" },
            ],
            reason: notInDemo,
          },
        ],
      },
    ],
  },
  {
    id: "cat-tax",
    title: "Cat Tax",
    setup: "A cat has entered the call and immediately improved it.",
    artLabel: "CAT HAS JOINED",
    artTreatment: "call-grid",
    eligibility: alwaysEligible,
    weight: (run) =>
      run.squad.some((developerId) => ["kirsten", "paul", "odin"].includes(developerId)) ? 3 : 1,
    choices: [
      {
        id: "wave-hello",
        label: "Wave Hello",
        tone: "steady",
        effects: [{ kind: "ledger", resource: "morale", amount: 3, cap: 10 }],
      },
      {
        id: "keyboard-review",
        label: "Keyboard Review",
        tone: "build",
        effects: [
          {
            kind: "deferred",
            primitive: "deck-surgery",
            preview: [{ text: "−2 Tech Debt", tone: "good" }],
            reason: notInDemo,
          },
        ],
      },
      {
        id: "make-them-mascot",
        label: "Make Them Mascot",
        tone: "risk",
        requirements: [{ kind: "credits-at-least", amount: 15, reason: "Need 15 Credits" }],
        effects: [
          {
            kind: "deferred",
            primitive: "tool-offer",
            preview: [
              { text: "−15 Credits", tone: "risk" },
              { text: "Gain Cat Tax", tone: "good" },
            ],
            reason: notInDemo,
          },
        ],
      },
    ],
  },
  {
    id: "design-opened-a-pr",
    title: "Design Opened a PR",
    setup: "The designers and PMs are coding now. Reactions are mixed but fascinated.",
    artLabel: "PR OPENED",
    artTreatment: "pull-request",
    eligibility: alwaysEligible,
    weight: ordinaryWeight,
    choices: [
      {
        id: "pair-up",
        label: "Pair Up",
        tone: "build",
        effects: [
          {
            kind: "deferred",
            primitive: "deck-surgery",
            preview: [{ text: "Add Pair Programming", tone: "good" }],
            reason: notInDemo,
          },
        ],
      },
      {
        id: "review-together",
        label: "Review Together",
        tone: "steady",
        effects: [
          {
            kind: "deferred",
            primitive: "deck-surgery",
            preview: [{ text: "Verify 1 discipline Basic", tone: "good" }],
            reason: notInDemo,
          },
        ],
      },
      {
        id: "merge-it",
        label: "Merge It",
        tone: "risk",
        effects: [
          { kind: "ledger", resource: "credits", amount: 20 },
          { kind: "ledger", resource: "tech-debt", amount: 2 },
        ],
      },
    ],
  },
];

export function getEvent(eventId: string): EventDefinition {
  const event = eventDefinitions.find((candidate) => candidate.id === eventId);
  if (!event) throw new Error(`Unknown Event: ${eventId}`);
  return event;
}

function resolveRequirement(requirement: EventRequirement, run: RunState): string | undefined {
  switch (requirement.kind) {
    case "credits-at-least":
      return run.credits < requirement.amount ? requirement.reason : undefined;
  }
}

function ledgerOutcome(
  effect: Extract<EventEffect, { kind: "ledger" }>,
  run: RunState,
): EventOutcomeChip {
  if (effect.resource === "morale") {
    const amount = Math.min(effect.amount, Math.max(0, (effect.cap ?? 10) - run.morale));
    return {
      text: amount > 0 ? `+${amount} Morale` : "Morale Full",
      tone: amount > 0 ? "good" : "neutral",
    };
  }
  const label = effect.resource === "credits" ? "Credits" : "Tech Debt";
  return {
    text: `${effect.amount > 0 ? "+" : ""}${effect.amount} ${label}`,
    tone: effect.amount > 0 && effect.resource === "tech-debt" ? "risk" : "good",
  };
}

export function resolveEventChoice(
  choice: EventChoiceDefinition,
  run: RunState,
): ResolvedEventChoice {
  const requirementReason = choice.requirements
    ?.map((requirement) => resolveRequirement(requirement, run))
    .find(Boolean);
  const deferred = choice.effects.find(
    (effect): effect is Extract<EventEffect, { kind: "deferred" }> => effect.kind === "deferred",
  );
  return {
    disabledReason: requirementReason ?? deferred?.reason,
    effects: choice.effects.filter(
      (effect): effect is Extract<EventEffect, { kind: "ledger" }> => effect.kind === "ledger",
    ),
    outcome: choice.effects.flatMap((effect) =>
      effect.kind === "ledger" ? [ledgerOutcome(effect, run)] : effect.preview,
    ),
  };
}
