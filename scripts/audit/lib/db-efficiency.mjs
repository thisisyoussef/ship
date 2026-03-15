import {
  loginToApi,
  prepareSeededSchema,
  readTraceLength,
  readTraceSince,
  startApiServer,
} from './service-runtime.mjs';
import { ensureDir } from './fs.mjs';
import { join } from 'node:path';

export async function measureDbEfficiency({
  target,
  baseConnectionString,
  runCommand,
  reportEvent,
}) {
  const runtime = await prepareSeededSchema({
    baseConnectionString,
    target,
    categoryId: 'db-efficiency',
    runCommand,
    reportEvent,
  });

  const traceFile = join(target.outputDir, 'raw', `${target.label}-db-efficiency-trace.jsonl`);
  await ensureDir(join(target.outputDir, 'raw'));

  const apiServer = await startApiServer({
    target,
    categoryId: 'db-efficiency',
    connectionString: runtime.connectionString,
    webOrigin: 'http://127.0.0.1:5173',
    traceFile,
    reportEvent,
  });

  try {
    const auth = await loginToApi(apiServer.apiUrl);
    const traceBefore = await readTraceLength(traceFile);
    reportEvent?.({
      type: 'category-note',
      targetLabel: target.label,
      categoryId: 'db-efficiency',
      phase: 'measure',
      message: 'Tracing GET /api/weeks/:id/issues',
    });
    const response = await fetch(`${apiServer.apiUrl}/api/weeks/${auth.firstWeekId}/issues`, {
      headers: { cookie: auth.cookieHeader },
    });
    if (!response.ok) {
      throw new Error(`GET /api/weeks/:id/issues failed with status ${response.status}`);
    }

    const traceAfter = await readTraceSince(traceFile, traceBefore);
    const totalQueryMs = traceAfter.entries.reduce((sum, entry) => sum + entry.durationMs, 0);

    return {
      status: 'passed',
      corpus: runtime.counts,
      summaryValue: traceAfter.entries.length,
      metrics: {
        queryCount: traceAfter.entries.length,
        totalQueryMs: Number(totalQueryMs.toFixed(2)),
      },
      statements: traceAfter.entries,
    };
  } finally {
    await apiServer.stop();
  }
}
