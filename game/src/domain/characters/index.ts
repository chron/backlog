import type { CardDefinition, Developer } from "../models";
import { ireneContent } from "./irene";
import { kirstenContent } from "./kirsten";
import { leviContent } from "./levi";
import { madiContent } from "./madi";
import { nickContent } from "./nick";
import { odinContent } from "./odin";
import { paulContent } from "./paul";
import { sebContent } from "./seb";
import { mattContent } from "./matt";
import { tobyContent } from "./toby";
import { stephContent } from "./steph";
import { elspethContent } from "./elspeth";
import type { CharacterContent } from "./types";

export const characterContents = [
  paulContent,
  odinContent,
  ireneContent,
  madiContent,
  sebContent,
  tobyContent,
  stephContent,
  elspethContent,
  kirstenContent,
  mattContent,
  nickContent,
  leviContent,
] as const;

const characterContentCatalog: readonly CharacterContent[] = characterContents;

export const developers: readonly Developer[] = characterContentCatalog.map(
  (content) => content.developer,
);

export const characterStartingCards: readonly CardDefinition[] = characterContentCatalog.map(
  (content) => content.startingCard,
);

export const characterRewardCards: readonly CardDefinition[] = characterContentCatalog.flatMap(
  (content) => content.rewardCards,
);

export const characterGeneratedCards: readonly CardDefinition[] = characterContentCatalog.flatMap(
  (content) => content.generatedCards ?? [],
);
