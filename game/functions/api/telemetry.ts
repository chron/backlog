import {
  parseProductionTelemetryBatch,
  type ProductionRunSnapshot,
  type ProductionTelemetryBatch,
  type ProductionTelemetryEvent,
} from "../../src/telemetry/contract";

const maxRequestBytes = 64 * 1024;
const noStoreHeaders = { "Cache-Control": "no-store" };

class RequestBodyTooLargeError extends Error {}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) return undefined;

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxRequestBytes) throw new RequestBodyTooLargeError();
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(body);
}

function runValues(event: ProductionTelemetryEvent) {
  const snapshot = event.snapshot;
  return {
    completedAt: snapshot.outcome ? event.at : null,
    outcome: snapshot.outcome ?? null,
    cause: snapshot.cause ?? null,
    seed: snapshot.seed ?? null,
    bossId: snapshot.bossId ?? null,
    morale: snapshot.morale ?? null,
    maxMorale: snapshot.maxMorale ?? null,
    techDebt: snapshot.techDebt ?? null,
    currentNodeId: snapshot.currentNodeId ?? null,
  };
}

function createRunUpsert(
  database: D1Database,
  batch: ProductionTelemetryBatch,
  first: ProductionTelemetryEvent,
  last: ProductionTelemetryEvent,
): D1PreparedStatement {
  const values = runValues(last);
  return database
    .prepare(
      `INSERT INTO runs (
        run_id, schema_version, started_at, updated_at, completed_at, last_screen,
        seed, squad_json, boss_id, outcome, cause, duration_ms, ending_morale,
        max_morale, ending_tech_debt, peak_tech_debt, deck_size, tools_json,
        current_node_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET
        started_at = MIN(runs.started_at, excluded.started_at),
        updated_at = MAX(runs.updated_at, excluded.updated_at),
        completed_at = COALESCE(runs.completed_at, excluded.completed_at),
        peak_tech_debt = MAX(runs.peak_tech_debt, excluded.peak_tech_debt)`,
    )
    .bind(
      batch.runId,
      batch.schemaVersion,
      first.at,
      last.at,
      values.completedAt,
      last.screenAfter,
      values.seed,
      JSON.stringify(last.snapshot.squad),
      values.bossId,
      values.outcome,
      values.cause,
      last.snapshot.elapsedMs,
      values.morale,
      values.maxMorale,
      values.techDebt,
      last.snapshot.techDebt ?? 0,
      last.snapshot.deckSize,
      JSON.stringify(last.snapshot.tools),
      values.currentNodeId,
    );
}

function createEventInsert(
  database: D1Database,
  runId: string,
  event: ProductionTelemetryEvent,
): D1PreparedStatement {
  return database
    .prepare(
      `INSERT OR IGNORE INTO run_events (
        run_id, sequence, occurred_at, action_type, accepted, screen_before,
        screen_after, details_json, snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      runId,
      event.sequence,
      event.at,
      event.type,
      event.accepted ? 1 : 0,
      event.screenBefore,
      event.screenAfter,
      JSON.stringify(event.details),
      JSON.stringify(event.snapshot),
    );
}

function createRunSummaryUpdate(
  database: D1Database,
  runId: string,
  last: ProductionTelemetryEvent,
): D1PreparedStatement {
  const snapshot: ProductionRunSnapshot = last.snapshot;
  const values = runValues(last);
  return database
    .prepare(
      `UPDATE runs SET
        updated_at = MAX(updated_at, ?), completed_at = COALESCE(completed_at, ?),
        last_screen = ?, seed = ?, squad_json = ?, boss_id = ?, outcome = ?, cause = ?,
        duration_ms = ?,
        action_count = (SELECT COUNT(*) FROM run_events WHERE run_id = ?),
        accepted_action_count = (SELECT COALESCE(SUM(accepted), 0) FROM run_events WHERE run_id = ?),
        encounters = ?, cycles_shipped = ?, cycles_missed = ?, days = ?,
        cards_played = ?, generated_cards_played = ?, cards_exhausted = ?,
        tasks_shipped = ?, defects = ?, ending_morale = ?, max_morale = ?,
        ending_tech_debt = ?, peak_tech_debt = MAX(peak_tech_debt, ?),
        deck_size = ?, tools_json = ?, current_node_id = ?
      WHERE run_id = ?
        AND ? >= (SELECT COALESCE(MAX(sequence), 0) FROM run_events WHERE run_id = ?)`,
    )
    .bind(
      last.at,
      values.completedAt,
      last.screenAfter,
      values.seed,
      JSON.stringify(snapshot.squad),
      values.bossId,
      values.outcome,
      values.cause,
      snapshot.elapsedMs,
      runId,
      runId,
      snapshot.encounters,
      snapshot.cyclesShipped,
      snapshot.cyclesMissed,
      snapshot.days,
      snapshot.cardsPlayed,
      snapshot.generatedCardsPlayed,
      snapshot.cardsExhausted,
      snapshot.tasksShipped,
      snapshot.defects,
      values.morale,
      values.maxMorale,
      values.techDebt,
      snapshot.techDebt ?? 0,
      snapshot.deckSize,
      JSON.stringify(snapshot.tools),
      values.currentNodeId,
      runId,
      last.sequence,
      runId,
    );
}

export async function persistTelemetryBatch(
  database: D1Database,
  batch: ProductionTelemetryBatch,
): Promise<void> {
  const events = [...batch.events].sort((left, right) => left.sequence - right.sequence);
  const first = events[0];
  const last = events.at(-1);
  if (!first || !last) return;
  await database.batch([
    createRunUpsert(database, batch, first, last),
    ...events.map((event) => createEventInsert(database, batch.runId, event)),
    createRunSummaryUpdate(database, batch.runId, last),
  ]);
}

export async function handleTelemetryRequest(
  request: Request,
  database: D1Database,
): Promise<Response> {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin telemetry is not accepted." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json") && !contentType.startsWith("text/plain")) {
    return Response.json({ error: "Expected JSON." }, { status: 415 });
  }

  try {
    const batch = parseProductionTelemetryBatch(await readBoundedJson(request));
    if (!batch) return Response.json({ error: "Invalid telemetry batch." }, { status: 400 });
    await persistTelemetryBatch(database, batch);
    return new Response(null, { status: 204, headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "Telemetry batch is too large." }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    }
    console.error(
      JSON.stringify({
        message: "telemetry ingestion failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json({ error: "Telemetry unavailable." }, { status: 500 });
  }
}
