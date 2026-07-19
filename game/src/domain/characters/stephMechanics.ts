export interface AutomationMeters {
  script: number;
  guard: number;
}

type AutomationMeter = keyof AutomationMeters;

export interface AutomationMeterDelta {
  meter: AutomationMeter;
  before: number;
  after: number;
  added: number;
  focusGained: 1;
}

export interface AutomationTriggerPacket {
  iteration: number;
  meter: AutomationMeter;
  amount: number;
}

interface StephRequirementSnapshot extends AutomationMeters {
  target: number;
  verified: number;
  unverified: number;
}

export interface StephTaskSnapshot {
  taskId: string;
  status: "open" | "ready" | "shipped";
  requirements: readonly StephRequirementSnapshot[];
}

export interface GoldenPathInstallation {
  taskId: string;
  requirementIndex: number;
  meter: "script";
  amount: number;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normaliseMeters(meters: AutomationMeters): AutomationMeters {
  return { script: nonNegative(meters.script), guard: nonNegative(meters.guard) };
}

/** One uncapped Paved Road trigger per meter which actually increased. */
export function pavedRoadMeterIncreases(
  before: AutomationMeters,
  after: AutomationMeters,
): readonly AutomationMeterDelta[] {
  const safeBefore = normaliseMeters(before);
  const safeAfter = normaliseMeters(after);
  return (["script", "guard"] as const).flatMap((meter) =>
    safeAfter[meter] > safeBefore[meter]
      ? [
          {
            meter,
            before: safeBefore[meter],
            after: safeAfter[meter],
            added: safeAfter[meter] - safeBefore[meter],
            focusGained: 1 as const,
          },
        ]
      : [],
  );
}

export function pavedRoadFocus(before: AutomationMeters, after: AutomationMeters): number {
  return pavedRoadMeterIncreases(before, after).length;
}

export function installAutomationMeters(
  before: AutomationMeters,
  added: Partial<AutomationMeters>,
): { meters: AutomationMeters; pavedRoad: readonly AutomationMeterDelta[] } {
  const safeBefore = normaliseMeters(before);
  const meters = {
    script: safeBefore.script + nonNegative(added.script ?? 0),
    guard: safeBefore.guard + nonNegative(added.guard ?? 0),
  };
  return { meters, pavedRoad: pavedRoadMeterIncreases(safeBefore, meters) };
}

export function doubleAutomationMeters(meters: AutomationMeters): AutomationMeters {
  const safeMeters = normaliseMeters(meters);
  return { script: safeMeters.script * 2, guard: safeMeters.guard * 2 };
}

export function refactorAutomationMeters(meters: AutomationMeters): {
  meters: AutomationMeters;
  pavedRoad: readonly AutomationMeterDelta[];
} {
  const before = normaliseMeters(meters);
  const after = doubleAutomationMeters(before);
  return { meters: after, pavedRoad: pavedRoadMeterIncreases(before, after) };
}

/** Legacy combined packets, useful when Script and Guard resolve atomically. */
export function automationTriggerPackets(
  meters: AutomationMeters,
  times: number,
): readonly AutomationMeters[] {
  const count = Number.isFinite(times) ? Math.max(0, Math.floor(times)) : 0;
  const safeMeters = normaliseMeters(meters);
  return Array.from({ length: count }, () => ({ ...safeMeters }));
}

/**
 * Explicit trigger order for Hot Reload and Macro: each iteration resolves
 * Script then Guard, and absent meter types create no packet.
 */
export function automationMeterTriggerPackets(
  meters: AutomationMeters,
  times: number,
): readonly AutomationTriggerPacket[] {
  return automationTriggerPackets(meters, times).flatMap((packet, iteration) =>
    (["script", "guard"] as const).flatMap((meter) =>
      packet[meter] > 0 ? [{ iteration, meter, amount: packet[meter] }] : [],
    ),
  );
}

export function canRefactorAutomation(meters: AutomationMeters): boolean {
  const safeMeters = normaliseMeters(meters);
  return safeMeters.script > 0 || safeMeters.guard > 0;
}

export function canTriggerAutomation(meters: AutomationMeters): boolean {
  return canRefactorAutomation(meters);
}

/** Golden Path installations in Task then requirement board order. */
export function goldenPathInstallations(
  tasks: readonly StephTaskSnapshot[],
  power = 1,
): readonly GoldenPathInstallation[] {
  const amount = nonNegative(power);
  if (amount === 0) return [];

  return tasks.flatMap((task) => {
    if (task.status === "shipped") return [];
    return task.requirements.flatMap((requirement, requirementIndex) => {
      const remaining = Math.max(
        0,
        nonNegative(requirement.target) -
          nonNegative(requirement.verified) -
          nonNegative(requirement.unverified),
      );
      return remaining > 0
        ? [{ taskId: task.taskId, requirementIndex, meter: "script" as const, amount }]
        : [];
    });
  });
}
