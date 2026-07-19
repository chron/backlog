import type { CycleDefinition, EncounterShape, EncounterTier } from "./models";

export interface AuthoredCycleDefinition extends CycleDefinition {
  tier: EncounterTier;
  shape: EncounterShape;
}

export const authoredCycleCatalogue = [
  {
    id: "status-refresh",
    name: "Status Refresh",
    tier: "early",
    shape: "balanced",
    maxDays: 4,
    tasks: [
      {
        id: "status-composer-v2",
        name: "Status Composer",
        requirements: [
          { discipline: "frontend", target: 8 },
          { discipline: "backend", target: 6 },
        ],
        intents: [
          { kind: "scope", discipline: "frontend", amount: 2 },
          { kind: "crunch", moraleLoss: 2 },
          { kind: "regression", discipline: "backend", amount: 2 },
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
    ],
  },
  {
    id: "participant-profiles",
    name: "Participant Profiles",
    tier: "early",
    shape: "balanced",
    maxDays: 4,
    tasks: [
      {
        id: "profile-editor",
        name: "Profile Editor",
        requirements: [
          { discipline: "frontend", target: 5 },
          { discipline: "backend", target: 3 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "scope", discipline: "frontend", amount: 2 },
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "search-index",
        name: "Search Index",
        requirements: [
          { discipline: "backend", target: 5 },
          { discipline: "infra", target: 3 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "crunch", moraleLoss: 2 },
          { kind: "regression", discipline: "backend", amount: 2 },
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
    ],
  },
  {
    id: "finish-mcp-server",
    name: "Finish the MCP Server",
    tier: "early",
    shape: "balanced",
    maxDays: 4,
    tasks: [
      {
        id: "tool-handlers",
        name: "Tool Handlers",
        requirements: [{ discipline: "backend", target: 6 }],
        intents: [
          { kind: "scope", discipline: "backend", amount: 2 },
          null,
          { kind: "regression", discipline: "backend", amount: 2 },
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "auth-and-hosting",
        name: "Auth & Hosting",
        requirements: [
          { discipline: "backend", target: 5 },
          { discipline: "infra", target: 4 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "interruption" },
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
    ],
  },
  {
    id: "marketing-site-astro",
    name: "Convert Marketing Site to Astro",
    tier: "mid",
    shape: "tall",
    maxDays: 6,
    tasks: [
      {
        id: "astro-migration",
        name: "Astro Migration",
        requirements: [
          { discipline: "frontend", target: 20 },
          { discipline: "infra", target: 6 },
        ],
        intents: [
          { kind: "scope", discipline: "frontend", amount: 4 },
          { kind: "crunch", moraleLoss: 2 },
          { kind: "regression", discipline: "frontend", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "infra", amount: 3 },
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
    ],
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    tier: "mid",
    shape: "tall",
    maxDays: 6,
    tasks: [
      {
        id: "data-pipeline-project",
        name: "Data Pipeline",
        requirements: [
          { discipline: "backend", target: 20 },
          { discipline: "infra", target: 8 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "scope", discipline: "backend", amount: 4 },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "regression", discipline: "backend", amount: 3 },
          { kind: "scope", discipline: "infra", amount: 3 },
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
    ],
  },
  {
    id: "every-methodology",
    name: "Every Methodology at Once",
    tier: "mid",
    shape: "wide",
    maxDays: 5,
    tasks: [
      {
        id: "tree-test",
        name: "Tree Test",
        requirements: [{ discipline: "frontend", target: 4 }],
        intents: [
          { kind: "scope", discipline: "frontend", amount: 2 },
          null,
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "card-sort",
        name: "Card Sort",
        requirements: [{ discipline: "frontend", target: 4 }],
        intents: [
          { kind: "interruption" },
          null,
          { kind: "scope", discipline: "frontend", amount: 2 },
        ],
      },
      {
        id: "first-click",
        name: "First Click",
        requirements: [{ discipline: "frontend", target: 3 }],
        intents: [
          null,
          { kind: "crunch", moraleLoss: 2 },
          null,
          { kind: "regression", discipline: "frontend", amount: 2 },
        ],
      },
      {
        id: "five-second-test",
        name: "Five-Second Test",
        requirements: [{ discipline: "frontend", target: 3 }],
        intents: [
          null,
          { kind: "scope", discipline: "frontend", amount: 2 },
          null,
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "unmoderated-runner",
        name: "Unmoderated Runner",
        requirements: [
          { discipline: "frontend", target: 2 },
          { discipline: "backend", target: 4 },
          { discipline: "infra", target: 4 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          null,
          { kind: "regression", discipline: "backend", amount: 2 },
          null,
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
    ],
  },
  {
    id: "ai-results-analysis",
    name: "AI Results Analysis",
    tier: "mid",
    shape: "verification",
    maxDays: 5,
    tasks: [
      {
        id: "theme-clustering",
        name: "Theme Clustering",
        requirements: [{ discipline: "backend", target: 8 }],
        intents: [
          { kind: "ai-assist", discipline: "backend", amount: 3 },
          null,
          { kind: "scope", discipline: "backend", amount: 3 },
          null,
          { kind: "crunch", moraleLoss: 3 },
        ],
      },
      {
        id: "insight-summaries",
        name: "Insight Summaries",
        requirements: [
          { discipline: "frontend", target: 6 },
          { discipline: "backend", target: 4 },
        ],
        intents: [
          { kind: "ai-assist", discipline: "frontend", amount: 3 },
          null,
          { kind: "regression", discipline: "backend", amount: 2 },
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "evidence-links",
        name: "Evidence Links",
        requirements: [
          { discipline: "frontend", target: 4 },
          { discipline: "infra", target: 3 },
        ],
        intents: [
          null,
          { kind: "ai-assist", discipline: "infra", amount: 3 },
          { kind: "interruption" },
          null,
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
    ],
  },
  {
    id: "observer-rooms",
    name: "Build Observer Rooms",
    tier: "mid",
    shape: "balanced",
    maxDays: 5,
    tasks: [
      {
        id: "observer-ui",
        name: "Observer UI",
        requirements: [{ discipline: "frontend", target: 7 }],
        intents: [
          { kind: "scope", discipline: "frontend", amount: 3 },
          null,
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "live-presence",
        name: "Live Presence",
        requirements: [
          { discipline: "backend", target: 6 },
          { discipline: "infra", target: 3 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "crunch", moraleLoss: 3 },
          null,
          { kind: "regression", discipline: "backend", amount: 3 },
        ],
      },
      {
        id: "permissions-invites",
        name: "Permissions & Invites",
        requirements: [
          { discipline: "frontend", target: 3 },
          { discipline: "backend", target: 5 },
          { discipline: "infra", target: 3 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "scope", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
          null,
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
    ],
  },
  {
    id: "sharkimedes-2",
    name: "Sharkimedes 2.0",
    tier: "mid",
    shape: "volatile",
    maxDays: 5,
    tasks: [
      {
        id: "long-term-memory",
        name: "Long-Term Memory",
        requirements: [{ discipline: "backend", target: 7 }],
        intents: [
          { kind: "interruption" },
          { kind: "spawn", taskId: "one-more-catchphrase", taskName: "One More Catchphrase" },
          { kind: "scope", discipline: "backend", amount: 3 },
        ],
      },
      {
        id: "sharkimedes-admin-ui",
        name: "Admin UI",
        requirements: [{ discipline: "frontend", target: 5 }],
        intents: [
          null,
          { kind: "scope", discipline: "frontend", amount: 3 },
          null,
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "meme-retrieval",
        name: "Meme Retrieval",
        requirements: [
          { discipline: "backend", target: 5 },
          { discipline: "infra", target: 3 },
        ],
        intents: [
          { kind: "interruption" },
          null,
          { kind: "regression", discipline: "backend", amount: 2 },
        ],
      },
      {
        id: "productionise-sharkimedes",
        name: "Productionise It",
        requirements: [{ discipline: "infra", target: 6 }],
        intents: [
          null,
          { kind: "blocked", discipline: "infra" },
          null,
          { kind: "crunch", moraleLoss: 3 },
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
      {
        id: "one-more-catchphrase",
        name: "One More Catchphrase",
        role: "complication",
        requirements: [{ discipline: "backend", target: 4 }],
        intents: [{ kind: "interruption" }],
      },
    ],
  },
  {
    id: "change-ci-again",
    name: "Change CI Again",
    tier: "late",
    shape: "volatile",
    maxDays: 6,
    tasks: [
      {
        id: "new-pipeline",
        name: "New Pipeline",
        requirements: [
          { discipline: "backend", target: 6 },
          { discipline: "infra", target: 9 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "scope", discipline: "infra", amount: 4 },
          null,
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
      {
        id: "preview-environments",
        name: "Preview Environments",
        requirements: [
          { discipline: "frontend", target: 4 },
          { discipline: "backend", target: 5 },
          { discipline: "infra", target: 5 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "regression", discipline: "backend", amount: 3 },
          null,
          { kind: "scope", discipline: "frontend", amount: 3 },
        ],
      },
      {
        id: "delete-old-config",
        name: "Delete Old Config",
        requirements: [
          { discipline: "backend", target: 4 },
          { discipline: "infra", target: 5 },
        ],
        intents: [
          null,
          { kind: "blocked", discipline: "backend" },
          { kind: "crunch", moraleLoss: 4 },
          null,
          { kind: "regression", discipline: "infra", amount: 3 },
          { kind: "crunch", moraleLoss: 6 },
        ],
      },
    ],
  },
  {
    id: "tanstack-router",
    name: "Switch to TanStack Router",
    tier: "late",
    shape: "volatile",
    maxDays: 6,
    tasks: [
      {
        id: "route-tree",
        name: "Route Tree",
        requirements: [{ discipline: "frontend", target: 12 }],
        intents: [
          { kind: "scope", discipline: "frontend", amount: 4 },
          null,
          { kind: "regression", discipline: "frontend", amount: 4 },
          null,
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
      {
        id: "loaders-actions",
        name: "Loaders & Actions",
        requirements: [
          { discipline: "frontend", target: 8 },
          { discipline: "backend", target: 6 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "scope", discipline: "backend", amount: 4 },
          null,
          { kind: "regression", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
      {
        id: "deep-links",
        name: "Deep Links",
        requirements: [
          { discipline: "frontend", target: 7 },
          { discipline: "infra", target: 5 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "frontend", amount: 3 },
          { kind: "regression", discipline: "frontend", amount: 3 },
          null,
          { kind: "crunch", moraleLoss: 6 },
        ],
      },
    ],
  },
  {
    id: "session-is-live",
    name: "The Session Is Live",
    tier: "late",
    shape: "crunch",
    maxDays: 5,
    tasks: [
      {
        id: "recording-pipeline",
        name: "Recording Pipeline",
        requirements: [
          { discipline: "backend", target: 8 },
          { discipline: "infra", target: 6 },
        ],
        intents: [
          { kind: "crunch", moraleLoss: 3 },
          { kind: "regression", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 5 },
          null,
          { kind: "crunch", moraleLoss: 6 },
        ],
      },
      {
        id: "observer-room-live",
        name: "Observer Room",
        requirements: [
          { discipline: "frontend", target: 7 },
          { discipline: "backend", target: 4 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "frontend", amount: 3 },
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
      {
        id: "live-transcript",
        name: "Live Transcript",
        requirements: [
          { discipline: "frontend", target: 5 },
          { discipline: "backend", target: 6 },
        ],
        intents: [
          { kind: "scope", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "crunch", moraleLoss: 4 },
          { kind: "regression", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 6 },
        ],
      },
    ],
  },
  {
    id: "enterprise-sso",
    name: "Enterprise SSO",
    tier: "late",
    shape: "volatile",
    maxDays: 6,
    tasks: [
      {
        id: "saml-login",
        name: "SAML Login",
        requirements: [
          { discipline: "frontend", target: 4 },
          { discipline: "backend", target: 9 },
        ],
        intents: [
          { kind: "scope", discipline: "backend", amount: 4 },
          null,
          { kind: "crunch", moraleLoss: 3 },
          { kind: "regression", discipline: "backend", amount: 3 },
          null,
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
      {
        id: "scim-provisioning",
        name: "SCIM Provisioning",
        requirements: [
          { discipline: "backend", target: 8 },
          { discipline: "infra", target: 6 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "scope", discipline: "backend", amount: 4 },
          null,
          { kind: "crunch", moraleLoss: 4 },
          { kind: "scope", discipline: "infra", amount: 3 },
        ],
      },
      {
        id: "audit-logs",
        name: "Audit Logs",
        requirements: [
          { discipline: "frontend", target: 4 },
          { discipline: "backend", target: 6 },
          { discipline: "infra", target: 5 },
        ],
        intents: [
          { kind: "interruption" },
          { kind: "crunch", moraleLoss: 3 },
          { kind: "scope", discipline: "infra", amount: 3 },
          null,
          { kind: "regression", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 6 },
        ],
      },
    ],
  },
  {
    id: "upgrade-every-dependency",
    name: "Upgrade Every Dependency",
    tier: "safe-incident",
    shape: "wide",
    maxDays: 5,
    tasks: [
      {
        id: "frontend-dependencies",
        name: "Frontend Dependencies",
        requirements: [{ discipline: "frontend", target: 7 }],
        intents: [
          { kind: "scope", discipline: "frontend", amount: 2 },
          null,
          { kind: "crunch", moraleLoss: 2 },
        ],
      },
      {
        id: "backend-dependencies",
        name: "Backend Dependencies",
        requirements: [{ discipline: "backend", target: 7 }],
        intents: [
          null,
          { kind: "scope", discipline: "backend", amount: 2 },
          null,
          { kind: "regression", discipline: "backend", amount: 2 },
        ],
      },
      {
        id: "runtime-images",
        name: "Runtime & Images",
        requirements: [{ discipline: "infra", target: 6 }],
        intents: [
          { kind: "blocked", discipline: "infra" },
          null,
          { kind: "crunch", moraleLoss: 3 },
          null,
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
      {
        id: "lockfile-archaeology",
        name: "Lockfile Archaeology",
        requirements: [
          { discipline: "frontend", target: 2 },
          { discipline: "backend", target: 2 },
          { discipline: "infra", target: 2 },
        ],
        intents: [{ kind: "interruption" }],
      },
    ],
  },
  {
    id: "migrate-postgres-safely",
    name: "Migrate Postgres Without Drama",
    tier: "safe-incident",
    shape: "balanced",
    maxDays: 5,
    tasks: [
      {
        id: "schema-migration",
        name: "Schema Migration",
        requirements: [{ discipline: "backend", target: 10 }],
        intents: [
          { kind: "scope", discipline: "backend", amount: 3 },
          null,
          { kind: "regression", discipline: "backend", amount: 3 },
          { kind: "crunch", moraleLoss: 4 },
        ],
      },
      {
        id: "backfill",
        name: "Backfill",
        requirements: [
          { discipline: "backend", target: 8 },
          { discipline: "infra", target: 6 },
        ],
        intents: [
          { kind: "blocked", discipline: "infra" },
          { kind: "crunch", moraleLoss: 3 },
          null,
          { kind: "scope", discipline: "infra", amount: 3 },
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
      {
        id: "cutover",
        name: "Cutover",
        requirements: [
          { discipline: "backend", target: 6 },
          { discipline: "infra", target: 8 },
        ],
        intents: [
          null,
          { kind: "interruption" },
          { kind: "crunch", moraleLoss: 3 },
          null,
          { kind: "crunch", moraleLoss: 5 },
        ],
      },
    ],
  },
] as const satisfies readonly AuthoredCycleDefinition[];

const earlyPool = authoredCycleCatalogue.filter(
  (cycle) => cycle.tier === "early" && cycle.id !== "status-refresh",
);
const tallPool = authoredCycleCatalogue.filter(
  (cycle) => cycle.tier === "mid" && cycle.shape === "tall",
);
const midFlexPool = authoredCycleCatalogue.filter(
  (cycle) => cycle.tier === "mid" && cycle.shape !== "tall" && cycle.shape !== "wide",
);
const latePool = authoredCycleCatalogue.filter((cycle) => cycle.tier === "late");

function seededIndex(seed: number, salt: number, length: number): number {
  let value = ((seed >>> 0) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) % length;
}

export interface EncounterLineup {
  opener: string;
  early: string;
  tall: string;
  wide: string;
  mid: string;
  late: string;
  safeIncidents: readonly [string, string];
}

export function selectEncounterLineup(seed: number): EncounterLineup {
  return {
    opener: "status-refresh",
    early: earlyPool[seededIndex(seed, 0x11, earlyPool.length)]!.id,
    tall: tallPool[seededIndex(seed, 0x22, tallPool.length)]!.id,
    wide: "every-methodology",
    mid: midFlexPool[seededIndex(seed, 0x33, midFlexPool.length)]!.id,
    late: latePool[seededIndex(seed, 0x44, latePool.length)]!.id,
    safeIncidents: ["upgrade-every-dependency", "migrate-postgres-safely"],
  };
}
