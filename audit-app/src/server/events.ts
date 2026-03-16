import { pool } from './db.js';
import { applyProgressEvent, createInitialProgress, type AuditProgressEvent, type ProgressSnapshot, type RunMode } from './progress.js';

type RunEventRowInput = {
  type: string;
  level?: string;
  phase?: string | null;
  targetLabel?: string | null;
  categoryId?: string | null;
  commandId?: string | null;
  stream?: string | null;
  message: string;
  payload?: unknown;
};

export async function recordAuditEvents(runId: string, events: AuditProgressEvent[]) {
  if (events.length === 0) {
    return null;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const runResult = await client.query(
      `SELECT mode, category, progress_json
       FROM audit_runs
       WHERE id = $1
       FOR UPDATE`,
      [runId]
    );

    const row = runResult.rows[0];
    if (!row) {
      throw new Error(`Run ${runId} not found`);
    }

    let progress = toProgressSnapshot(row.progress_json, row.mode, row.category);
    const storedEvents = events.flatMap((event) => {
      progress = applyProgressEvent(progress, event);
      return normalizeStoredEvents(event);
    });

    if (storedEvents.length > 0) {
      const values: unknown[] = [];
      const rows = storedEvents
        .map((event, index) => {
          const offset = index * 10;
          values.push(
            runId,
            event.type,
            event.level ?? 'info',
            event.phase ?? null,
            event.targetLabel ?? null,
            event.categoryId ?? null,
            event.commandId ?? null,
            event.stream ?? null,
            event.message,
            event.payload ? JSON.stringify(event.payload) : null
          );
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::jsonb)`;
        })
        .join(', ');

      await client.query(
        `INSERT INTO audit_run_events (
          run_id,
          event_type,
          level,
          phase,
          target_label,
          category_id,
          command_id,
          stream,
          message,
          payload
        ) VALUES ${rows}`,
        values
      );
    }

    await client.query(
      `UPDATE audit_runs
       SET progress_json = $2::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [runId, JSON.stringify(progress)]
    );

    await client.query('COMMIT');
    return progress;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function toProgressSnapshot(raw: unknown, mode: unknown, category: unknown): ProgressSnapshot {
  if (raw && typeof raw === 'object') {
    return raw as ProgressSnapshot;
  }

  const runMode: RunMode = mode === 'category' ? 'category' : 'full';
  return createInitialProgress(runMode, typeof category === 'string' ? category : null);
}

function normalizeStoredEvents(event: AuditProgressEvent) {
  const baseEvent = {
    type: event.type,
    level: event.level ?? 'info',
    phase: event.phase ?? null,
    targetLabel: event.targetLabel ?? null,
    categoryId: event.categoryId ?? null,
    commandId: event.commandId ?? null,
    stream: event.stream ?? null,
    payload: event.payload ?? null,
  };
  const normalizedMessage = stripAnsi(String(event.message ?? ''));

  if (event.type !== 'command-output') {
    return [
      {
        ...baseEvent,
        message: truncateMessage(normalizedMessage.trim() || '(empty output)'),
      },
    ];
  }

  const lines = normalizedMessage
    .split(/[\r\n]+/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-120);

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line) => ({
    ...baseEvent,
    message: truncateMessage(line),
  }));
}

function truncateMessage(message: string) {
  return message.length > 700 ? `${message.slice(0, 697)}...` : message;
}

function stripAnsi(message: string) {
  return message.replace(/\u001b\[[0-9;]*m/g, '');
}
