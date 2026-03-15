import { loginToApi, prepareSeededSchema, runLoadTest, startApiServer } from './service-runtime.mjs';

const CONCURRENCY_LEVELS = [10, 25, 50];
const REQUESTS_PER_BAND = 200;

export async function measureApiResponse({
  target,
  baseConnectionString,
  runCommand,
  reportEvent,
}) {
  const runtime = await prepareSeededSchema({
    baseConnectionString,
    target,
    categoryId: 'api-response',
    runCommand,
    reportEvent,
  });
  const apiServer = await startApiServer({
    target,
    categoryId: 'api-response',
    connectionString: runtime.connectionString,
    webOrigin: 'http://127.0.0.1:5173',
    reportEvent,
  });

  try {
    const auth = await loginToApi(apiServer.apiUrl);
    const endpoints = [
      { name: '/api/documents', path: '/api/documents' },
      { name: '/api/issues', path: '/api/issues' },
      { name: '/api/documents/:id', path: `/api/documents/${auth.firstDocumentId}` },
      { name: '/api/weeks/:id/issues', path: `/api/weeks/${auth.firstWeekId}/issues` },
      { name: '/api/search/learnings?q=api', path: '/api/search/learnings?q=api' },
    ];

    const results = {};
    for (const endpoint of endpoints) {
      reportEvent?.({
        type: 'category-note',
        targetLabel: target.label,
        categoryId: 'api-response',
        phase: 'measure',
        message: `Benchmarking ${endpoint.name}`,
      });
      results[endpoint.name] = [];
      for (const concurrency of CONCURRENCY_LEVELS) {
        results[endpoint.name].push(
          await runLoadTest({
            url: `${apiServer.apiUrl}${endpoint.path}`,
            cookieHeader: auth.cookieHeader,
            totalRequests: REQUESTS_PER_BAND,
            concurrency,
            onProgress: ({ completedCount, totalRequests, percent }) => {
              reportEvent?.({
                type: 'load-progress',
                targetLabel: target.label,
                categoryId: 'api-response',
                phase: 'measure',
                message: `${endpoint.name} @ c${concurrency}: ${completedCount}/${totalRequests} requests (${percent}%)`,
                payload: {
                  endpoint: endpoint.name,
                  concurrency,
                  completedCount,
                  totalRequests,
                  percent,
                },
              });
            },
          })
        );
      }
    }

    return {
      status: 'passed',
      corpus: runtime.counts,
      summaryValue: results['/api/documents'].find((band) => band.concurrency === 50)?.p95Ms ?? 0,
      metrics: {
        headlineP95Ms: results['/api/documents'].find((band) => band.concurrency === 50)?.p95Ms ?? 0,
      },
      endpointResults: results,
    };
  } finally {
    await apiServer.stop();
  }
}
