import type {
  CardTag,
  Discipline,
  EventBountyTask,
  EventNextCycleModifier,
  EventRewardModifier,
  MapEdge,
  RunState,
  ToolId,
} from "./models";

type EventArtTreatment = "scope" | "karaoke" | "call-grid" | "pull-request";
type EventChoiceTone = "steady" | "build" | "risk";
type EventOutcomeTone = "good" | "neutral" | "risk";
type EventLedgerResource = "credits" | "morale" | "max-morale" | "tech-debt";

export interface EventOutcomeChip {
  text: string;
  tone: EventOutcomeTone;
}

export interface EventCardFilter {
  cardIds?: readonly string[];
  tagsAny?: readonly CardTag[];
  tagsAll?: readonly CardTag[];
  excludedTags?: readonly CardTag[];
  disciplines?: readonly (Discipline | "flexible")[];
  rarities?: readonly ("normal" | "rare")[];
  owner?: "squad" | "non-squad";
  startersOnly?: boolean;
}

export type EventDeckSurgeryEffect =
  | { kind: "deck-surgery"; operation: "add"; cardId: string }
  | {
      kind: "deck-surgery";
      operation: "remove" | "duplicate";
      filter: EventCardFilter;
    }
  | {
      kind: "deck-surgery";
      operation: "transform";
      filter: EventCardFilter;
      transform: { kind: "verify" } | { kind: "replace"; cardId: string };
    };

export type EventEffect =
  | {
      kind: "ledger";
      resource: EventLedgerResource;
      amount: number;
    }
  | EventDeckSurgeryEffect
  | {
      kind: "filtered-draft";
      count: number;
      filter: EventCardFilter;
    }
  | {
      kind: "tool-offer";
      count: number;
      toolIds?: readonly ToolId[];
    }
  | {
      kind: "next-cycle-modifier";
      modifier: EventNextCycleModifier;
    }
  | {
      kind: "temporary-guest-card";
      count: number;
      cardIds?: readonly string[];
    }
  | {
      kind: "bounty-task";
      bounty: EventBountyTask;
    }
  | {
      kind: "reward-modifier";
      modifier: EventRewardModifier;
    }
  | {
      kind: "map-modifier";
      modifier: { kind: "reveal-upcoming"; count: number } | { kind: "connection"; edge: MapEdge };
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

const alwaysEligible = () => true;
const ordinaryWeight = () => 1;

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
        effects: [{ kind: "ledger", resource: "morale", amount: 2 }],
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
        effects: [{ kind: "ledger", resource: "morale", amount: 4 }],
      },
      {
        id: "duet",
        label: "Duet",
        tone: "build",
        requirements: [{ kind: "credits-at-least", amount: 15, reason: "Need 15 Credits" }],
        effects: [
          { kind: "ledger", resource: "credits", amount: -15 },
          {
            kind: "deck-surgery",
            operation: "duplicate",
            filter: { rarities: ["normal"] },
          },
        ],
      },
      {
        id: "power-ballad",
        label: "Power Ballad",
        tone: "risk",
        effects: [
          { kind: "ledger", resource: "max-morale", amount: 2 },
          {
            kind: "next-cycle-modifier",
            modifier: { kind: "queued-status", cardId: "distraction", count: 1 },
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
      run.squad.some((developerId) => ["paul", "odin"].includes(developerId)) ? 3 : 1,
    choices: [
      {
        id: "wave-hello",
        label: "Wave Hello",
        tone: "steady",
        effects: [{ kind: "ledger", resource: "morale", amount: 3 }],
      },
      {
        id: "keyboard-review",
        label: "Keyboard Review",
        tone: "build",
        effects: [{ kind: "ledger", resource: "tech-debt", amount: -2 }],
      },
      {
        id: "make-them-mascot",
        label: "Make Them Mascot",
        tone: "risk",
        requirements: [{ kind: "credits-at-least", amount: 15, reason: "Need 15 Credits" }],
        effects: [
          { kind: "ledger", resource: "credits", amount: -15 },
          { kind: "tool-offer", count: 1, toolIds: [] },
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
        effects: [{ kind: "deck-surgery", operation: "add", cardId: "pair-programming" }],
      },
      {
        id: "review-together",
        label: "Review Together",
        tone: "steady",
        effects: [
          {
            kind: "deck-surgery",
            operation: "transform",
            filter: {
              tagsAll: ["basic"],
              disciplines: ["frontend", "backend", "infra"],
            },
            transform: { kind: "verify" },
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

export function resolveEventRequirement(
  requirement: EventRequirement,
  run: RunState,
): string | undefined {
  switch (requirement.kind) {
    case "credits-at-least":
      return run.credits < requirement.amount ? requirement.reason : undefined;
  }
}
