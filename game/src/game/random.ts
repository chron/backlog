const DEFAULT_SEED = 0x5eed1234;

export function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? DEFAULT_SEED : normalized;
}

export function createRunSeed(): number {
  return normalizeSeed(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
}

function nextRandom(rngState: number): { value: number; rngState: number } {
  const nextState = (normalizeSeed(rngState) + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return {
    value: ((value ^ (value >>> 14)) >>> 0) / 4294967296,
    rngState: nextState,
  };
}

export function sampleOne<T>(items: readonly T[], rngState: number): { item: T; rngState: number } {
  if (items.length === 0) throw new Error("Cannot sample an empty collection.");
  const next = nextRandom(rngState);
  return {
    item: items[Math.floor(next.value * items.length)] as T,
    rngState: next.rngState,
  };
}
