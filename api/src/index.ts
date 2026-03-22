import { createServer } from 'http';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (.env.local takes precedence)
config({ path: join(__dirname, '../.env.local') });
config({ path: join(__dirname, '../.env') });

async function ensureFleetGraphDemoFindings() {
  try {
    const { pool } = await import('./db/client.js');
    const { DEMO_IDS } = await import('./services/fleetgraph/demo/constants.js');

    // Check if demo sprints exist
    const demoCheck = await pool.query(
      'SELECT id FROM documents WHERE id = $1',
      [DEMO_IDS.SPRINT_ALL_THREE]
    );
    if (demoCheck.rows.length === 0) {
      console.log('FleetGraph boot: demo sprints not seeded yet, skipping');
      return;
    }

    // Get workspace and sprint context
    const wsResult = await pool.query('SELECT id, sprint_start_date FROM workspaces WHERE archived_at IS NULL LIMIT 1');
    if (wsResult.rows.length === 0) return;
    const workspaceId = wsResult.rows[0].id as string;

    // Get a user for owner context
    const userResult = await pool.query(
      'SELECT user_id FROM workspace_memberships WHERE workspace_id = $1 LIMIT 1',
      [workspaceId]
    );
    if (userResult.rows.length === 0) return;

    // Get program and project for associations
    const progResult = await pool.query(
      `SELECT da.related_id FROM document_associations da
       WHERE da.document_id = $1 AND da.relationship_type = 'program' LIMIT 1`,
      [DEMO_IDS.SPRINT_ALL_THREE]
    );
    const projResult = await pool.query(
      `SELECT da.related_id FROM document_associations da
       WHERE da.document_id = $1 AND da.relationship_type = 'project' LIMIT 1`,
      [DEMO_IDS.SPRINT_ALL_THREE]
    );

    if (progResult.rows.length === 0 || projResult.rows.length === 0) {
      console.log('FleetGraph boot: demo associations missing, skipping');
      return;
    }

    // Get current sprint number from the demo sprint
    const sprintDoc = await pool.query(
      "SELECT properties->>'sprint_number' as sprint_number FROM documents WHERE id = $1",
      [DEMO_IDS.SPRINT_ALL_THREE]
    );
    const currentSprintNumber = parseInt(sprintDoc.rows[0]?.sprint_number ?? '1', 10);

    const { seedFleetGraphDemoData } = await import(
      './services/fleetgraph/demo/seed-demo-data.js'
    );
    await seedFleetGraphDemoData(pool, {
      currentSprintNumber,
      ownerUserId: userResult.rows[0].user_id as string,
      programId: progResult.rows[0].related_id as string,
      projectId: projResult.rows[0].related_id as string,
      workspaceId,
      workspaceSprintStartDate: (wsResult.rows[0].sprint_start_date as Date)?.toISOString?.()?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    });
    console.log('FleetGraph boot: demo findings ensured');
  } catch (err) {
    console.warn('FleetGraph boot demo findings skipped:', (err as Error).message);
  }
}

async function registerFleetGraphSweepsOnBoot() {
  try {
    const { pool } = await import('./db/client.js');
    const { createFleetGraphWorkerStore } = await import(
      './services/fleetgraph/worker/store.js'
    );
    const workerStore = createFleetGraphWorkerStore(pool);

    // Find all active workspaces
    const result = await pool.query(
      'SELECT id FROM workspaces WHERE archived_at IS NULL'
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

    // Ensure FleetGraph demo findings exist on every boot.
    // This runs the seed-demo-data function which upserts demo sprints and
    // their findings so the Findings tab always has content to show.
    ensureFleetGraphDemoFindings().catch((err) => {
      console.error('FleetGraph boot demo findings failed (non-fatal):', err);
    });

    // Register all active workspaces for FleetGraph sweeping on boot.
    registerFleetGraphSweepsOnBoot().catch((err) => {
      console.error('FleetGraph boot sweep registration failed (non-fatal):', err);
    });
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
