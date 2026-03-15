import { ensureAuditTables } from './db.js';

await ensureAuditTables();

console.log('Audit execution moved to GitHub Actions. This Render worker is idle.');

while (true) {
  await new Promise((resolve) => setTimeout(resolve, 60_000));
}
