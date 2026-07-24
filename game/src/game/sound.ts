import type { TaskState } from "../domain/models";
import type { GameAction, GameState } from "./gameReducer";

export type GameSoundCue =
  | "achievement"
  | "block"
  | "boss"
  | "cancel"
  | "card"
  | "complete"
  | "damage"
  | "day"
  | "defect"
  | "defeat"
  | "exhaust"
  | "purchase"
  | "review"
  | "reward"
  | "select"
  | "ship"
  | "shuffle"
  | "victory"
  | "work";

function totalProgress(tasks: readonly TaskState[]): number {
  return tasks.reduce(
    (taskTotal, task) =>
      taskTotal +
      task.requirements.reduce(
        (requirementTotal, requirement) =>
          requirementTotal + requirement.verified + requirement.unverified,
        0,
      ),
    0,
  );
}

function totalUnverified(tasks: readonly TaskState[]): number {
  return tasks.reduce(
    (taskTotal, task) =>
      taskTotal +
      task.requirements.reduce(
        (requirementTotal, requirement) => requirementTotal + requirement.unverified,
        0,
      ),
    0,
  );
}

function readyTaskCount(tasks: readonly TaskState[]): number {
  return tasks.filter((task) => task.status === "ready").length;
}

function stunnedTaskCount(tasks: readonly TaskState[]): number {
  return tasks.filter((task) => task.stunned).length;
}

function playedCardCue(before: GameState, after: GameState): readonly GameSoundCue[] {
  const beforeCycle = before.run?.cycle;
  const afterCycle = after.run?.cycle;
  if (!beforeCycle || !afterCycle || beforeCycle === afterCycle) return [];

  const cues: GameSoundCue[] = [];
  if (
    beforeCycle.drawPile.length === 0 &&
    beforeCycle.discardPile.length > 0 &&
    afterCycle.drawPile.length > 0
  ) {
    cues.push("shuffle");
  }

  if (readyTaskCount(afterCycle.tasks) > readyTaskCount(beforeCycle.tasks)) {
    cues.push("complete");
  } else if (stunnedTaskCount(afterCycle.tasks) > stunnedTaskCount(beforeCycle.tasks)) {
    cues.push("cancel");
  } else if (totalUnverified(afterCycle.tasks) < totalUnverified(beforeCycle.tasks)) {
    cues.push("review");
  } else if (totalProgress(afterCycle.tasks) > totalProgress(beforeCycle.tasks)) {
    cues.push("work");
  } else if (afterCycle.block > beforeCycle.block) {
    cues.push("block");
  } else if (afterCycle.exhaustPile.length > beforeCycle.exhaustPile.length) {
    cues.push("exhaust");
  } else {
    cues.push("card");
  }
  return cues;
}

export function gameSoundCuesForAction(
  action: GameAction,
  before: GameState,
  after: GameState,
): readonly GameSoundCue[] {
  if (before === after) return [];

  switch (action.type) {
    case "PLAY_CARD":
      return playedCardCue(before, after);
    case "SHIP_TASK": {
      const task = before.run?.cycle?.tasks.find((candidate) => candidate.taskId === action.taskId);
      const defects =
        task?.requirements.reduce((total, requirement) => total + requirement.unverified, 0) ?? 0;
      return [defects > 0 ? "defect" : "ship"];
    }
    case "END_DAY":
      if (after.screen.name === "retro") return ["defeat"];
      return (after.run?.morale ?? 0) < (before.run?.morale ?? 0) ? ["damage"] : ["day"];
    case "LAUNCH_FINAL_RELEASE":
      return after.screen.name === "retro" && after.screen.outcome === "victory"
        ? ["victory"]
        : ["defect"];
    case "ACKNOWLEDGE_BOSS_TRANSITION":
      return ["boss"];
    case "CHOOSE_CARD_REWARD":
    case "CHOOSE_TOOL_REWARD":
      return ["reward"];
    case "BUY_SHOP_CARD":
    case "BUY_SHOP_SERVICE":
    case "BUY_SHOP_TOOL":
    case "REFRESH_SHOP":
      return ["purchase"];
    case "CHOOSE_EVENT":
    case "CHOOSE_EVENT_OPTION":
    case "CHOOSE_WEEKEND":
      return ["reward"];
    case "START_RUN":
    case "CONFIRM_SQUAD":
    case "RANDOMIZE_SQUAD":
    case "TOGGLE_DEVELOPER":
    case "VISIT_NODE":
      return ["select"];
    default:
      return [];
  }
}

interface Tone {
  duration: number;
  frequency: number;
  offset: number;
  type?: OscillatorType;
  volume?: number;
}

const cueTones: Record<GameSoundCue, readonly Tone[]> = {
  achievement: [
    { frequency: 523, offset: 0, duration: 0.1 },
    { frequency: 659, offset: 0.08, duration: 0.1 },
    { frequency: 784, offset: 0.16, duration: 0.18 },
  ],
  block: [{ frequency: 180, offset: 0, duration: 0.12, type: "square", volume: 0.035 }],
  boss: [
    { frequency: 110, offset: 0, duration: 0.18, type: "sawtooth", volume: 0.035 },
    { frequency: 165, offset: 0.12, duration: 0.22, type: "sawtooth", volume: 0.03 },
  ],
  cancel: [
    { frequency: 360, offset: 0, duration: 0.09, type: "square", volume: 0.025 },
    { frequency: 220, offset: 0.07, duration: 0.13, type: "square", volume: 0.025 },
  ],
  card: [{ frequency: 260, offset: 0, duration: 0.08, volume: 0.025 }],
  complete: [
    { frequency: 392, offset: 0, duration: 0.09 },
    { frequency: 523, offset: 0.07, duration: 0.12 },
  ],
  damage: [
    { frequency: 150, offset: 0, duration: 0.16, type: "sawtooth", volume: 0.04 },
    { frequency: 105, offset: 0.1, duration: 0.18, type: "sawtooth", volume: 0.035 },
  ],
  day: [{ frequency: 330, offset: 0, duration: 0.12, type: "triangle", volume: 0.025 }],
  defect: [
    { frequency: 196, offset: 0, duration: 0.11, type: "square", volume: 0.03 },
    { frequency: 147, offset: 0.09, duration: 0.17, type: "square", volume: 0.025 },
  ],
  defeat: [
    { frequency: 247, offset: 0, duration: 0.15, type: "triangle" },
    { frequency: 196, offset: 0.13, duration: 0.18, type: "triangle" },
    { frequency: 147, offset: 0.28, duration: 0.25, type: "triangle" },
  ],
  exhaust: [{ frequency: 170, offset: 0, duration: 0.1, type: "sawtooth", volume: 0.025 }],
  purchase: [
    { frequency: 440, offset: 0, duration: 0.07, type: "square", volume: 0.025 },
    { frequency: 554, offset: 0.06, duration: 0.1, type: "square", volume: 0.025 },
  ],
  review: [
    { frequency: 520, offset: 0, duration: 0.08, type: "triangle" },
    { frequency: 650, offset: 0.06, duration: 0.1, type: "triangle" },
  ],
  reward: [
    { frequency: 440, offset: 0, duration: 0.09 },
    { frequency: 660, offset: 0.08, duration: 0.14 },
  ],
  select: [{ frequency: 300, offset: 0, duration: 0.06, volume: 0.02 }],
  ship: [
    { frequency: 392, offset: 0, duration: 0.09 },
    { frequency: 523, offset: 0.08, duration: 0.1 },
    { frequency: 659, offset: 0.16, duration: 0.18 },
  ],
  shuffle: [
    { frequency: 210, offset: 0, duration: 0.05, type: "square", volume: 0.018 },
    { frequency: 260, offset: 0.05, duration: 0.05, type: "square", volume: 0.018 },
    { frequency: 310, offset: 0.1, duration: 0.06, type: "square", volume: 0.018 },
  ],
  victory: [
    { frequency: 392, offset: 0, duration: 0.12 },
    { frequency: 523, offset: 0.1, duration: 0.12 },
    { frequency: 659, offset: 0.2, duration: 0.12 },
    { frequency: 784, offset: 0.3, duration: 0.3 },
  ],
  work: [
    { frequency: 260, offset: 0, duration: 0.08, type: "triangle" },
    { frequency: 390, offset: 0.055, duration: 0.11, type: "triangle" },
  ],
};

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const AudioContextConstructor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextConstructor) return undefined;
  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

function scheduleTone(context: AudioContext, tone: Tone, startAt: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = startAt + tone.offset;
  const end = start + tone.duration;
  oscillator.type = tone.type ?? "sine";
  oscillator.frequency.setValueAtTime(tone.frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(tone.volume ?? 0.032, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.01);
}

export function playGameSounds(cues: readonly GameSoundCue[], enabled = true): void {
  if (!enabled || cues.length === 0) return;
  const context = getAudioContext();
  if (!context) return;

  const schedule = () => {
    const start = context.currentTime + 0.01;
    cues.slice(0, 2).forEach((cue, cueIndex) => {
      const cueStart = start + cueIndex * 0.11;
      cueTones[cue].forEach((tone) => scheduleTone(context, tone, cueStart));
    });
  };
  if (context.state === "suspended") {
    void context
      .resume()
      .then(schedule)
      .catch(() => undefined);
  } else {
    schedule();
  }
}
