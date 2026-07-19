import type { CardDefinition } from "./models";

export interface CardGlossaryEntry {
  id: string;
  term: string;
  description: string;
}

interface GlossaryDefinition extends CardGlossaryEntry {
  appliesTo: (card: CardDefinition) => boolean;
}

const glossary: readonly GlossaryDefinition[] = [
  {
    id: "prototype",
    term: "Prototype",
    description: "Each stack adds +1 Work to every Work card for the rest of this Cycle.",
    appliesTo: (card) => Boolean(card.spawnSideQuest),
  },
  {
    id: "side-quest",
    term: "Side Quest",
    description: "A required 3-Work Task with no Intent. Ship it to gain Prototype.",
    appliesTo: (card) => Boolean(card.spawnSideQuest),
  },
  {
    id: "verify",
    term: "Verify",
    description: "Converts Unverified Work into safe Verified Work on one Task.",
    appliesTo: (card) => card.kind === "review",
  },
  {
    id: "distraction",
    term: "Distraction",
    description: "An unplayable card that clogs a hand for one Day, then disappears.",
    appliesTo: (card) => card.id === "distraction" || Boolean(card.queuedDistractions),
  },
  {
    id: "stun",
    term: "Stun",
    description: "Cancels one Task's Intent for this Day.",
    appliesTo: (card) => Boolean(card.stun),
  },
  {
    id: "block",
    term: "Block",
    description: "Prevents that much incoming Morale loss until the Day ends.",
    appliesTo: (card) => Boolean(card.block || card.blockPerCardPlayed),
  },
  {
    id: "script",
    term: "Script",
    description: "Adds Verified Work to its requirement at the start of every Day.",
    appliesTo: (card) => Boolean(card.automation),
  },
  {
    id: "guard",
    term: "Guard",
    description: "Creates Block at the start of every Day.",
    appliesTo: (card) => card.automation?.kind === "install" && Boolean(card.automation.blockPower),
  },
  {
    id: "tech-debt",
    term: "Tech Debt",
    description: "Persists for the run. Every 3 adds an unplayable Tech Debt card to your deck.",
    appliesTo: (card) => card.id === "tech-debt" || Boolean(card.techDebtAdded),
  },
  {
    id: "ai-assisted",
    term: "AI Assisted",
    description: "A card tag used by AI synergies and Madi's Custom Setup.",
    appliesTo: (card) => card.tags.includes("ai-assisted"),
  },
  {
    id: "unverified",
    term: "Unverified",
    description: "Counts as Work, but creates Defects and Tech Debt if shipped before Verify.",
    appliesTo: (card) => card.workKind === "unverified",
  },
  {
    id: "generated",
    term: "Generated",
    description: "Created during a Cycle. It disappears when the Cycle ends.",
    appliesTo: (card) => card.tags.includes("generated") || Boolean(card.generatedCards),
  },
  {
    id: "exhaust",
    term: "Exhaust",
    description: "Removed for the rest of this Cycle after it is played.",
    appliesTo: (card) => Boolean(card.exhaust),
  },
  {
    id: "any",
    term: "Any",
    description: "Can target Frontend, Backend, or Infra at full value.",
    appliesTo: (card) => card.kind === "work" && card.discipline === "flexible",
  },
];

export function getCardGlossaryEntries(card: CardDefinition): readonly CardGlossaryEntry[] {
  return glossary
    .filter((entry) => entry.appliesTo(card))
    .map(({ id, term, description }) => ({ id, term, description }));
}
