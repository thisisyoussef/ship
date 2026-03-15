import pg from 'pg';
import { TARGET_COUNTS } from './constants.mjs';

const { Pool } = pg;

const EXTRA_USERS = [
  ['maya.rivera@ship.local', 'Maya Rivera'],
  ['nina.clark@ship.local', 'Nina Clark'],
  ['owen.ross@ship.local', 'Owen Ross'],
  ['priya.shah@ship.local', 'Priya Shah'],
  ['quentin.ward@ship.local', 'Quentin Ward'],
  ['rachel.foster@ship.local', 'Rachel Foster'],
  ['sam.turner@ship.local', 'Sam Turner'],
  ['talia.brooks@ship.local', 'Talia Brooks'],
  ['umar.hassan@ship.local', 'Umar Hassan'],
  ['valerie.wright@ship.local', 'Valerie Wright'],
  ['wesley.price@ship.local', 'Wesley Price'],
  ['zoe.bennett@ship.local', 'Zoe Bennett'],
];

export async function getCorpusCounts(connectionString) {
  const pool = new Pool({ connectionString, ssl: false });
  try {
    const [documents, issues, weeks, users] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM documents'),
      pool.query(`SELECT COUNT(*)::int AS count FROM documents WHERE document_type = 'issue'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM documents WHERE document_type = 'sprint'`),
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
    ]);

    return {
      documents: documents.rows[0].count,
      issues: issues.rows[0].count,
      weeks: weeks.rows[0].count,
      users: users.rows[0].count,
    };
  } finally {
    await pool.end();
  }
}

export async function expandCorpus(connectionString) {
  const pool = new Pool({ connectionString, ssl: false });
  try {
    const workspaceResult = await pool.query('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1');
    const workspaceId = workspaceResult.rows[0]?.id;
    if (!workspaceId) {
      throw new Error('Corpus expansion requires at least one workspace');
    }

    const devUserResult = await pool.query(
      `SELECT id, password_hash, name
       FROM users
       WHERE LOWER(email) = LOWER('dev@ship.local')
       LIMIT 1`
    );
    const devUser = devUserResult.rows[0];
    if (!devUser) {
      throw new Error('Corpus expansion requires the seeded dev@ship.local user');
    }

    const countsBefore = await getCorpusCounts(connectionString);

    if (countsBefore.users > TARGET_COUNTS.users) {
      throw new Error(`Seed produced ${countsBefore.users} users; expected at most ${TARGET_COUNTS.users}`);
    }
    if (countsBefore.issues > TARGET_COUNTS.issues) {
      throw new Error(`Seed produced ${countsBefore.issues} issues; expected at most ${TARGET_COUNTS.issues}`);
    }
    if (countsBefore.weeks > TARGET_COUNTS.weeks) {
      throw new Error(`Seed produced ${countsBefore.weeks} weeks; expected at most ${TARGET_COUNTS.weeks}`);
    }
    if (countsBefore.documents > TARGET_COUNTS.documents) {
      throw new Error(`Seed produced ${countsBefore.documents} documents; expected at most ${TARGET_COUNTS.documents}`);
    }

    for (const [email, name] of EXTRA_USERS) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );
      if (!existingUser.rows[0] && (await countUsers(pool)) < TARGET_COUNTS.users) {
        await pool.query(
          `INSERT INTO users (email, password_hash, name, last_workspace_id)
           VALUES ($1, $2, $3, $4)`,
          [email, devUser.password_hash, name, workspaceId]
        );
      }
    }

    const allUsers = await pool.query('SELECT id, email, name FROM users ORDER BY created_at ASC');
    for (const user of allUsers.rows) {
      const membership = await pool.query(
        `SELECT id FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, user.id]
      );
      if (!membership.rows[0]) {
        await pool.query(
          `INSERT INTO workspace_memberships (workspace_id, user_id, role)
           VALUES ($1, $2, 'member')`,
          [workspaceId, user.id]
        );
      }

      const personDoc = await pool.query(
        `SELECT id FROM documents
         WHERE workspace_id = $1
           AND document_type = 'person'
           AND properties->>'user_id' = $2
         LIMIT 1`,
        [workspaceId, user.id]
      );
      if (!personDoc.rows[0]) {
        await pool.query(
          `INSERT INTO documents (workspace_id, document_type, title, properties, created_by)
           VALUES ($1, 'person', $2, $3, $4)`,
          [workspaceId, user.name, JSON.stringify({ user_id: user.id, email: user.email, reports_to: devUser.id }), devUser.id]
        );
      }
    }

    await ensureWeekCount(pool, workspaceId, devUser.id);
    await ensureIssueCount(pool, workspaceId, devUser.id);

    let counts = await getCorpusCounts(connectionString);
    const missingDocuments = TARGET_COUNTS.documents - counts.documents;
    if (missingDocuments > 0) {
      const syntheticWikiCount = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM documents
         WHERE workspace_id = $1
           AND document_type = 'wiki'
           AND title LIKE 'Audit Corpus Wiki %'`,
        [workspaceId]
      );
      const startingIndex = syntheticWikiCount.rows[0].count + 1;

      await pool.query(
        `INSERT INTO documents (workspace_id, document_type, title, content, created_by)
         SELECT
           $1,
           'wiki',
           FORMAT('Audit Corpus Wiki %s', LPAD(($4 + series.seq - 1)::text, 3, '0')),
           JSONB_BUILD_OBJECT(
             'type', 'doc',
             'content', JSONB_BUILD_ARRAY(
               JSONB_BUILD_OBJECT(
                 'type', 'paragraph',
                 'content', JSONB_BUILD_ARRAY(
                   JSONB_BUILD_OBJECT(
                     'type', 'text',
                     'text', FORMAT('Synthetic audit corpus filler document %s.', $4 + series.seq - 1)
                   )
                 )
               )
             )
           ),
           $2
         FROM GENERATE_SERIES(1, $3) AS series(seq)`,
        [workspaceId, devUser.id, missingDocuments, startingIndex]
      );

      counts = await getCorpusCounts(connectionString);
    }

    if (
      counts.documents !== TARGET_COUNTS.documents ||
      counts.issues !== TARGET_COUNTS.issues ||
      counts.weeks !== TARGET_COUNTS.weeks ||
      counts.users !== TARGET_COUNTS.users
    ) {
      throw new Error(
        `Corpus mismatch after expansion: ${JSON.stringify(counts)} expected ${JSON.stringify(TARGET_COUNTS)}`
      );
    }

    return counts;
  } finally {
    await pool.end();
  }
}

async function ensureWeekCount(pool, workspaceId, devUserId) {
  const currentWeeks = await pool.query(
    `SELECT COUNT(*)::int AS count FROM documents WHERE workspace_id = $1 AND document_type = 'sprint'`,
    [workspaceId]
  );
  let missing = TARGET_COUNTS.weeks - currentWeeks.rows[0].count;
  if (missing <= 0) {
    return;
  }

  const program = await pool.query(
    `SELECT id FROM documents WHERE workspace_id = $1 AND document_type = 'program' ORDER BY created_at ASC LIMIT 1`,
    [workspaceId]
  );
  const project = await pool.query(
    `SELECT id FROM documents WHERE workspace_id = $1 AND document_type = 'project' ORDER BY created_at ASC LIMIT 1`,
    [workspaceId]
  );
  const person = await pool.query(
    `SELECT id FROM documents
     WHERE workspace_id = $1 AND document_type = 'person' AND properties->>'user_id' = $2
     LIMIT 1`,
    [workspaceId, devUserId]
  );
  const maxWeekNumber = await pool.query(
    `SELECT COALESCE(MAX((properties->>'sprint_number')::int), 0) AS max_week
     FROM documents
     WHERE workspace_id = $1 AND document_type = 'sprint'`,
    [workspaceId]
  );

  let nextWeekNumber = maxWeekNumber.rows[0].max_week + 1;
  while (missing > 0) {
    const sprintResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, properties, created_by)
       VALUES ($1, 'sprint', $2, $3, $4)
       RETURNING id`,
      [
        workspaceId,
        `Week ${nextWeekNumber}`,
        JSON.stringify({
          sprint_number: nextWeekNumber,
          owner_id: devUserId,
          project_id: project.rows[0].id,
          assignee_ids: person.rows[0] ? [person.rows[0].id] : [],
          plan: 'Synthetic audit corpus week',
          success_criteria: 'Synthetic audit corpus week',
          confidence: 50,
          status: 'planned',
        }),
        devUserId,
      ]
    );

    const sprintId = sprintResult.rows[0].id;
    await pool.query(
      `INSERT INTO document_associations (document_id, related_id, relationship_type, metadata)
       VALUES ($1, $2, 'project', '{"created_via":"audit-corpus"}')
       ON CONFLICT (document_id, related_id, relationship_type) DO NOTHING`,
      [sprintId, project.rows[0].id]
    );
    await pool.query(
      `INSERT INTO document_associations (document_id, related_id, relationship_type, metadata)
       VALUES ($1, $2, 'program', '{"created_via":"audit-corpus"}')
       ON CONFLICT (document_id, related_id, relationship_type) DO NOTHING`,
      [sprintId, program.rows[0].id]
    );

    nextWeekNumber += 1;
    missing -= 1;
  }
}

async function ensureIssueCount(pool, workspaceId, devUserId) {
  const issueCountResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM documents WHERE workspace_id = $1 AND document_type = 'issue'`,
    [workspaceId]
  );
  let missing = TARGET_COUNTS.issues - issueCountResult.rows[0].count;
  if (missing <= 0) {
    return;
  }

  const program = await pool.query(
    `SELECT id FROM documents WHERE workspace_id = $1 AND document_type = 'program' ORDER BY created_at ASC LIMIT 1`,
    [workspaceId]
  );
  const project = await pool.query(
    `SELECT id FROM documents WHERE workspace_id = $1 AND document_type = 'project' ORDER BY created_at ASC LIMIT 1`,
    [workspaceId]
  );
  const maxTicketResult = await pool.query(
    `SELECT COALESCE(MAX(ticket_number), 0) AS max_ticket
     FROM documents
     WHERE workspace_id = $1 AND document_type = 'issue'`,
    [workspaceId]
  );

  let nextTicket = maxTicketResult.rows[0].max_ticket + 1;
  while (missing > 0) {
    const issueResult = await pool.query(
      `INSERT INTO documents (workspace_id, document_type, title, properties, ticket_number, created_by)
       VALUES ($1, 'issue', $2, $3, $4, $5)
       RETURNING id`,
      [
        workspaceId,
        `Audit Corpus Issue ${String(nextTicket).padStart(3, '0')}`,
        JSON.stringify({
          state: 'backlog',
          priority: 'low',
          source: 'internal',
          assignee_id: devUserId,
          estimate: 1,
        }),
        nextTicket,
        devUserId,
      ]
    );
    const issueId = issueResult.rows[0].id;

    await pool.query(
      `INSERT INTO document_associations (document_id, related_id, relationship_type, metadata)
       VALUES ($1, $2, 'project', '{"created_via":"audit-corpus"}')
       ON CONFLICT (document_id, related_id, relationship_type) DO NOTHING`,
      [issueId, project.rows[0].id]
    );
    await pool.query(
      `INSERT INTO document_associations (document_id, related_id, relationship_type, metadata)
       VALUES ($1, $2, 'program', '{"created_via":"audit-corpus"}')
       ON CONFLICT (document_id, related_id, relationship_type) DO NOTHING`,
      [issueId, program.rows[0].id]
    );

    nextTicket += 1;
    missing -= 1;
  }
}

async function countUsers(pool) {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  return result.rows[0].count;
}
