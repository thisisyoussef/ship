import { createServer } from 'http';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (.env.local takes precedence)
config({ path: join(__dirname, '../.env.local') });
config({ path: join(__dirname, '../.env') });

async function registerFleetGraphSweepsOnBoot() {
  try {
    const { pool } = await import('./db/client.js');
    const { createFleetGraphWorkerStore } = await import(
      './services/fleetgraph/worker/store.js'
    );
    const workerStore = createFleetGraphWorkerStore(pool);

    // Find all active workspaces
    const result = await pool.query(
      'SELECT id FROM workspaces WHERE deleted_at IS NULL'
    );
    const workspaceIds = result.rows.map((row: { id: string }) => row.id);

    if (workspaceIds.length === 0) {
      console.log('FleetGraph boot: no workspaces found, skipping sweep registration');
      return;
    }

    const now = new Date();
    let registered = 0;
    for (const workspaceId of workspaceIds) {
      try {
        await workerStore.registerWorkspaceSweep(workspaceId, now);
        registered++;
      } catch {
        // Non-fatal — workspace may already have a schedule
      }
    }

    console.log(`FleetGraph boot: registered ${registered}/${workspaceIds.length} workspace(s) for sweeping`);
  } catch (err) {
    // Non-fatal — FleetGraph tables may not exist yet (pre-migration)
    console.warn('FleetGraph boot sweep registration skipped:', (err as Error).message);
  }
}

async function main() {
  // Load secrets from SSM in production (before importing app)
  if (process.env.NODE_ENV === 'production') {
    const { loadProductionSecrets } = await import('./config/ssm.js');
    await loadProductionSecrets();
    if (process.env.FLEETGRAPH_ENTRY_ENABLED === 'true') {
      const { assertFleetGraphSurfaceReadiness } = await import(
        './services/fleetgraph/deployment/index.js'
      );
      assertFleetGraphSurfaceReadiness('api');
    }
  }

  // Now import app after secrets are loaded
  const { createApp } = await import('./app.js');
  const { setupCollaboration } = await import('./collaboration/index.js');

  const PORT = process.env.PORT || 3000;
  const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

  const app = createApp(CORS_ORIGIN);
  const server = createServer(app);

  // DDoS protection: Set server-wide timeouts to prevent slow-read attacks (Slowloris)
  server.timeout = 60000; // 60 seconds max request duration
  server.keepAliveTimeout = 65000; // 65 seconds (slightly longer than timeout)
  server.headersTimeout = 66000; // 66 seconds (slightly longer than keepAlive)

  // Setup WebSocket collaboration server
  setupCollaboration(server);

  // Start server
  server.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`CORS origin: ${CORS_ORIGIN}`);

    // Register all active workspaces for FleetGraph sweeping on boot.
    // This ensures the worker always has sweep schedules to process after
    // a deployment or restart, even if the sweep_schedules table was empty.
    registerFleetGraphSweepsOnBoot().catch((err) => {
      console.error('FleetGraph boot sweep registration failed (non-fatal):', err);
    });
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
