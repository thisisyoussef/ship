# FleetGraph Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace FleetGraph's routing skeleton with a real multi-turn reasoning agent — actual Ship context fetching, LLM-powered analysis, depth escalation, action proposals with HITL gates, and a context-aware FAB UI.

**Architecture:** Multi-turn LangGraph with MemorySaver checkpointer. One graph definition serves both proactive and on-demand. On-demand sessions accumulate conversation history across turns. Reasoning node drives depth escalation via structured hints. Action tier system (A/B/C) gates mutations behind appropriate confirmation UX.

**Tech Stack:** LangGraph (`@langchain/langgraph`), existing LLM adapter (OpenAI/Bedrock), existing findings/actions stores, React FAB component, existing Ship REST API as data source.

---

## Orientation: What Exists vs What Needs Building

### DO NOT TOUCH (solid, working)
- `worker/` — job queue, dedup ledger, sweep scheduling
- `findings/store.ts` — full CRUD and lifecycle
- `actions/store.ts` + `actions/service.ts` — action execution tracking
- `llm/factory.ts` + `llm/types.ts` — provider-agnostic LLM adapter
- `proactive/week-start-drift.ts` — detection logic
- Database migrations 038–040 — schema is correct
- `normalize/` — context parsing

### EXTEND (additive changes only)
- `graph/state.ts` — add new fields, don't remove existing
- `graph/types.ts` — add new types
- `entry/service.ts` — pass real context into graph, remove `candidateCount: 1` hack
- `routes/fleetgraph.ts` — add new endpoints

### REPLACE (rebuild from skeleton)
- `graph/runtime.ts` — swap 4-node skeleton for full node chain

### CREATE (net-new)
- `graph/nodes/` — all node implementations
- `graph/prompts.ts` — reasoning prompts
- `graph/ship-client.ts` — Ship API client for fetch nodes
- `web/src/components/FleetGraphFab.tsx`
- `web/src/components/FleetGraphPanel.tsx`

---

## Task 1: Extend Graph State Schema

**Files:**
- Modify: `api/src/services/fleetgraph/graph/state.ts`
- Modify: `api/src/services/fleetgraph/graph/types.ts`
- Test: `api/src/services/fleetgraph/graph/runtime.test.ts` (existing, verify still passes)

**Context:** Current state has only routing fields (`branch`, `mode`, `outcome`, etc.). We need to add: Ship context envelope, conversation history, fetched data cache, depth escalation signals, findings output, and action proposal. All new fields use `replaceValue` reducer — they replace on each update, they don't append.

**Step 1: Add new type definitions to `graph/types.ts`**

Append these types after the existing exports:

```typescript
// Conversation turn — one exchange in a multi-turn session
export interface FleetGraphConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string
}

// What the reasoning node returns when it needs more data
export interface FleetGraphDepthHint {
  ids: string[];
  type: 'assignee_workload' | 'linked_documents' | 'sprint_issues' | 'project_members';
}

// A single finding the reasoning node produced
export interface FleetGraphAnalysisFinding {
  actionTier: 'A' | 'B' | 'C';
  evidence: string[];
  findingType: string;
  proposedAction?: {
    endpoint: { method: string; path: string };
    label: string;
    targetId: string;
    targetType: string;
  };
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  title: string;
}

// Minimal Ship context the graph carries for reasoning
export interface FleetGraphContextEnvelope {
  actorId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  surface: string;
  workspaceId: string;
}
```

**Step 2: Add new state fields to `graph/state.ts`**

Import the new types at the top, then add these fields to `FleetGraphStateAnnotation` after the existing `workspaceId` field:

```typescript
import type {
  FleetGraphAnalysisFinding,
  FleetGraphBranch,
  FleetGraphContextEnvelope,
  FleetGraphConversationTurn,
  FleetGraphDepthHint,
  FleetGraphMode,
  FleetGraphOutcome,
  FleetGraphTrigger,
} from './types.js';

// ... existing replaceValue / appendPath helpers stay unchanged ...

export const FleetGraphStateAnnotation = Annotation.Root({
  // --- existing fields (DO NOT CHANGE) ---
  approvalRequired: replaceValue(false),
  branch: replaceValue<FleetGraphBranch>('fallback'),
  candidateCount: replaceValue(0),
  checkpointNamespace: replaceValue('fleetgraph'),
  documentId: replaceValue<string | undefined>(undefined),
  hasError: replaceValue(false),
  mode: replaceValue<FleetGraphMode>('proactive'),
  outcome: replaceValue<FleetGraphOutcome>('fallback'),
  path: appendPath(),
  routeSurface: replaceValue('workspace-sweep'),
  threadId: replaceValue(''),
  trigger: replaceValue<FleetGraphTrigger>('scheduled-sweep'),
  workspaceId: replaceValue(''),

  // --- new fields ---
  // Ship context envelope — who is invoking and what are they looking at
  context: replaceValue<FleetGraphContextEnvelope | undefined>(undefined),

  // Conversation history for multi-turn on-demand sessions
  // Only last 3 turns are sent to LLM; older turns roll into contextSummary
  conversationHistory: replaceValue<FleetGraphConversationTurn[]>([]),

  // Rolling summary of older conversation turns (beyond last 3)
  contextSummary: replaceValue<string | undefined>(undefined),

  // Data fetched from Ship API — accumulates across turns
  fetchedData: replaceValue<Record<string, unknown>>({}),

  // 'medium' = document + one-hop; 'deep' = targeted by deeperContextHint
  fetchDepth: replaceValue<'medium' | 'deep'>('medium'),

  // Set by reason node when it needs more data before concluding
  needsDeeperContext: replaceValue(false),

  // Structured hint telling fetch_deep exactly what to retrieve
  deeperContextHint: replaceValue<FleetGraphDepthHint | undefined>(undefined),

  // Findings the reasoning node produced
  analysisFindings: replaceValue<FleetGraphAnalysisFinding[]>([]),

  // Action the reasoning node proposed (if any), waiting for confirmation
  pendingAction: replaceValue<FleetGraphAnalysisFinding['proposedAction'] | undefined>(undefined),

  // Number of turns in this session
  turnCount: replaceValue(0),

  // Natural-language message from the user (for on-demand follow-up turns)
  userMessage: replaceValue<string | undefined>(undefined),

  // Analysis text the reasoning node produced for the UI
  analysisText: replaceValue<string | undefined>(undefined),
});
```

**Step 3: Run existing tests to verify state changes don't break anything**

```bash
cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/awesome-euler
pnpm test --filter api -- --testPathPattern="graph/runtime"
```

Expected: all existing tests pass (new fields have defaults, nothing removed).

**Step 4: Commit**

```bash
git add api/src/services/fleetgraph/graph/state.ts api/src/services/fleetgraph/graph/types.ts
git commit -m "feat(fleetgraph): extend graph state schema for multi-turn reasoning"
```

---

## Task 2: Create Ship Context Fetch Client

**Files:**
- Create: `api/src/services/fleetgraph/graph/ship-client.ts`
- Create: `api/src/services/fleetgraph/graph/ship-client.test.ts`

**Context:** The graph needs to call the Ship REST API to fetch document details and related data. The existing `proactive/ship-client.ts` fetches weeks. We need a graph-scoped client that can fetch any document type. This client is called by `fetch_medium` and `fetch_deep` nodes.

**Step 1: Write the failing test**

```typescript
// api/src/services/fleetgraph/graph/ship-client.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createFleetGraphShipClient } from './ship-client.js';

describe('createFleetGraphShipClient', () => {
  it('fetches a document by id and type', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'doc-1', title: 'Sprint 1', document_type: 'sprint' }),
    });

    const client = createFleetGraphShipClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as unknown as typeof fetch,
      token: 'test-token',
    });

    const result = await client.fetchDocument('doc-1', 'sprint');
    expect(result).toMatchObject({ id: 'doc-1', title: 'Sprint 1' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/weeks/doc-1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  it('fetches children of a document', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ issues: [{ id: 'issue-1', title: 'Fix bug', status: 'active' }] }),
    });

    const client = createFleetGraphShipClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as unknown as typeof fetch,
      token: 'test-token',
    });

    const result = await client.fetchChildren('doc-1', 'sprint');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'issue-1' });
  });

  it('returns empty children on 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    const client = createFleetGraphShipClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as unknown as typeof fetch,
      token: 'test-token',
    });

    const result = await client.fetchChildren('missing-doc', 'sprint');
    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test --filter api -- --testPathPattern="graph/ship-client" 2>&1 | tail -20
```

Expected: FAIL — `ship-client.ts` does not exist yet.

**Step 3: Implement the Ship client**

```typescript
// api/src/services/fleetgraph/graph/ship-client.ts

const DOCUMENT_TYPE_TO_API_PATH: Record<string, string> = {
  issue: 'issues',
  person: 'people',
  program: 'programs',
  project: 'projects',
  sprint: 'weeks',
  week: 'weeks',
  wiki: 'documents',
};

const CHILDREN_API_PATH: Record<string, string> = {
  program: 'projects',
  project: 'issues',
  sprint: 'issues',
  week: 'issues',
};

const CHILDREN_RESPONSE_KEY: Record<string, string> = {
  program: 'projects',
  project: 'issues',
  sprint: 'issues',
  week: 'issues',
};

export interface ShipClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  token: string;
}

export interface FleetGraphShipClient {
  fetchChildren(documentId: string, documentType: string): Promise<unknown[]>;
  fetchDocument(documentId: string, documentType: string): Promise<unknown>;
  fetchMemberWorkloads(userIds: string[], workspaceId: string): Promise<unknown[]>;
}

export function createFleetGraphShipClient(
  config: ShipClientConfig
): FleetGraphShipClient {
  const fetchFn = config.fetchFn ?? fetch;

  async function get(path: string): Promise<unknown> {
    const response = await fetchFn(`${config.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Ship API ${path} returned ${response.status}`);
    }

    return response.json();
  }

  return {
    async fetchDocument(documentId: string, documentType: string) {
      const apiPath = DOCUMENT_TYPE_TO_API_PATH[documentType] ?? 'documents';
      return get(`/api/${apiPath}/${documentId}`);
    },

    async fetchChildren(documentId: string, documentType: string) {
      const childPath = CHILDREN_API_PATH[documentType];
      const responseKey = CHILDREN_RESPONSE_KEY[documentType];
      if (!childPath || !responseKey) {
        return [];
      }

      const data = await get(`/api/${childPath}?documentId=${documentId}`);
      if (!data || typeof data !== 'object') {
        return [];
      }

      const items = (data as Record<string, unknown>)[responseKey];
      return Array.isArray(items) ? items : [];
    },

    async fetchMemberWorkloads(userIds: string[], workspaceId: string) {
      if (userIds.length === 0) {
        return [];
      }

      const params = new URLSearchParams({ workspaceId });
      userIds.forEach((id) => params.append('userIds', id));
      const data = await get(`/api/people?${params.toString()}`);
      if (!data || typeof data !== 'object') {
        return [];
      }

      const people = (data as Record<string, unknown>).people;
      return Array.isArray(people) ? people : [];
    },
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test --filter api -- --testPathPattern="graph/ship-client"
```

Expected: all 3 tests pass.

**Step 5: Commit**

```bash
git add api/src/services/fleetgraph/graph/ship-client.ts api/src/services/fleetgraph/graph/ship-client.test.ts
git commit -m "feat(fleetgraph): add Ship API client for graph fetch nodes"
```

---

## Task 3: Create Fetch Medium Node

**Files:**
- Create: `api/src/services/fleetgraph/graph/nodes/fetch-medium.ts`
- Create: `api/src/services/fleetgraph/graph/nodes/fetch-medium.test.ts`

**Context:** This node runs when the graph enters on-demand mode. It fetches the current document and its one-hop relationships in parallel using `Promise.all`. The results are merged into `fetchedData` in state. If `fetchedData` already has this document's data (from a prior turn), the node is a no-op.

**Step 1: Write the failing test**

```typescript
// api/src/services/fleetgraph/graph/nodes/fetch-medium.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createFetchMediumNode } from './fetch-medium.js';

const mockShipClient = {
  fetchChildren: vi.fn(),
  fetchDocument: vi.fn(),
  fetchMemberWorkloads: vi.fn(),
};

describe('fetchMediumNode', () => {
  it('fetches document and children in parallel', async () => {
    mockShipClient.fetchDocument.mockResolvedValue({ id: 'sprint-1', title: 'Week 1', status: 'planning' });
    mockShipClient.fetchChildren.mockResolvedValue([
      { id: 'issue-1', title: 'Fix bug', status: 'active', assignee_id: 'user-1' },
    ]);

    const node = createFetchMediumNode({ shipClient: mockShipClient });
    const result = await node({
      context: { documentId: 'sprint-1', documentType: 'sprint', actorId: 'user-1', documentTitle: 'Week 1', surface: 'document-page', workspaceId: 'ws-1' },
      fetchedData: {},
      mode: 'on_demand',
    } as never);

    expect(result.fetchedData).toMatchObject({
      'sprint-1': { document: { id: 'sprint-1' }, children: [{ id: 'issue-1' }] },
    });
    expect(mockShipClient.fetchDocument).toHaveBeenCalledWith('sprint-1', 'sprint');
    expect(mockShipClient.fetchChildren).toHaveBeenCalledWith('sprint-1', 'sprint');
  });

  it('skips fetch if document already in fetchedData (cache hit)', async () => {
    const node = createFetchMediumNode({ shipClient: mockShipClient });
    mockShipClient.fetchDocument.mockClear();

    const result = await node({
      context: { documentId: 'sprint-1', documentType: 'sprint', actorId: 'u', documentTitle: 'W', surface: 's', workspaceId: 'ws' },
      fetchedData: { 'sprint-1': { document: { id: 'sprint-1' }, children: [] } },
      mode: 'on_demand',
    } as never);

    expect(mockShipClient.fetchDocument).not.toHaveBeenCalled();
    // fetchedData unchanged
    expect(result.fetchedData['sprint-1']).toBeDefined();
  });

  it('returns empty fetchedData on proactive mode', async () => {
    const node = createFetchMediumNode({ shipClient: mockShipClient });
    const result = await node({
      context: { documentId: 'sprint-1', documentType: 'sprint', actorId: 'u', documentTitle: 'W', surface: 's', workspaceId: 'ws' },
      fetchedData: {},
      mode: 'proactive',
    } as never);

    expect(result.fetchedData).toEqual({});
  });
});
```

**Step 2: Run to verify failure**

```bash
pnpm test --filter api -- --testPathPattern="nodes/fetch-medium"
```

**Step 3: Create the node directory and implement**

```bash
mkdir -p api/src/services/fleetgraph/graph/nodes
```

```typescript
// api/src/services/fleetgraph/graph/nodes/fetch-medium.ts
import type { FleetGraphShipClient } from '../ship-client.js';
import type { FleetGraphGraphState } from '../state.js';

interface FetchMediumNodeDeps {
  shipClient: FleetGraphShipClient;
}

type PartialState = Pick<FleetGraphGraphState, 'context' | 'fetchedData' | 'mode'>;

export function createFetchMediumNode(deps: FetchMediumNodeDeps) {
  return async function fetchMediumNode(
    state: PartialState
  ): Promise<Partial<FleetGraphGraphState>> {
    // Proactive mode: no per-document fetching needed here
    if (state.mode !== 'on_demand') {
      return { path: 'fetch_medium' };
    }

    const context = state.context;
    if (!context) {
      return { path: 'fetch_medium' };
    }

    // Cache hit: document already fetched in a prior turn
    if (state.fetchedData[context.documentId]) {
      return { path: 'fetch_medium' };
    }

    // Parallel fetch: document + children
    const [document, children] = await Promise.all([
      deps.shipClient.fetchDocument(context.documentId, context.documentType),
      deps.shipClient.fetchChildren(context.documentId, context.documentType),
    ]);

    return {
      fetchedData: {
        ...state.fetchedData,
        [context.documentId]: { children, document },
      },
      path: 'fetch_medium',
    };
  };
}
```

**Step 4: Run tests to verify pass**

```bash
pnpm test --filter api -- --testPathPattern="nodes/fetch-medium"
```

**Step 5: Commit**

```bash
git add api/src/services/fleetgraph/graph/nodes/
git commit -m "feat(fleetgraph): add fetch_medium node with parallel document fetch and cache"
```

---

## Task 4: Create Fetch Deep Node

**Files:**
- Create: `api/src/services/fleetgraph/graph/nodes/fetch-deep.ts`
- Create: `api/src/services/fleetgraph/graph/nodes/fetch-deep.test.ts`

**Context:** This node only runs when `needsDeeperContext=true` and `deeperContextHint` is set by the reasoning node. It fetches only what the hint specifies — not a full re-crawl. Results are merged into `fetchedData` under a hint-specific key so the second-pass reasoning node can find them.

**Step 1: Write the failing test**

```typescript
// api/src/services/fleetgraph/graph/nodes/fetch-deep.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createFetchDeepNode } from './fetch-deep.js';

const mockShipClient = {
  fetchChildren: vi.fn(),
  fetchDocument: vi.fn(),
  fetchMemberWorkloads: vi.fn(),
};

describe('fetchDeepNode', () => {
  it('fetches member workloads when hint type is assignee_workload', async () => {
    mockShipClient.fetchMemberWorkloads.mockResolvedValue([
      { id: 'user-1', name: 'Alice', activeIssueCount: 8 },
    ]);

    const node = createFetchDeepNode({ shipClient: mockShipClient });
    const result = await node({
      context: { workspaceId: 'ws-1', documentId: 'd', documentType: 'sprint', actorId: 'u', documentTitle: 't', surface: 's' },
      deeperContextHint: { type: 'assignee_workload', ids: ['user-1'] },
      fetchedData: {},
      needsDeeperContext: true,
    } as never);

    expect(result.fetchedData?.['deep:assignee_workload']).toEqual([
      { id: 'user-1', name: 'Alice', activeIssueCount: 8 },
    ]);
    expect(mockShipClient.fetchMemberWorkloads).toHaveBeenCalledWith(['user-1'], 'ws-1');
  });

  it('fetches linked documents when hint type is linked_documents', async () => {
    mockShipClient.fetchDocument.mockResolvedValue({ id: 'proj-1', title: 'Q2 Project' });

    const node = createFetchDeepNode({ shipClient: mockShipClient });
    const result = await node({
      context: { workspaceId: 'ws-1', documentId: 'd', documentType: 'sprint', actorId: 'u', documentTitle: 't', surface: 's' },
      deeperContextHint: { type: 'linked_documents', ids: ['proj-1'] },
      fetchedData: {},
      needsDeeperContext: true,
    } as never);

    expect(result.fetchedData?.['deep:linked_documents']).toBeDefined();
  });

  it('is a no-op when needsDeeperContext is false', async () => {
    const node = createFetchDeepNode({ shipClient: mockShipClient });
    mockShipClient.fetchDocument.mockClear();

    const result = await node({
      context: { workspaceId: 'ws-1', documentId: 'd', documentType: 'sprint', actorId: 'u', documentTitle: 't', surface: 's' },
      deeperContextHint: undefined,
      fetchedData: {},
      needsDeeperContext: false,
    } as never);

    expect(mockShipClient.fetchDocument).not.toHaveBeenCalled();
    expect(result.fetchedData).toEqual({});
  });
});
```

**Step 2: Run to verify failure**

```bash
pnpm test --filter api -- --testPathPattern="nodes/fetch-deep"
```

**Step 3: Implement**

```typescript
// api/src/services/fleetgraph/graph/nodes/fetch-deep.ts
import type { FleetGraphShipClient } from '../ship-client.js';
import type { FleetGraphGraphState } from '../state.js';

interface FetchDeepNodeDeps {
  shipClient: FleetGraphShipClient;
}

export function createFetchDeepNode(deps: FetchDeepNodeDeps) {
  return async function fetchDeepNode(
    state: Pick<FleetGraphGraphState, 'context' | 'deeperContextHint' | 'fetchedData' | 'needsDeeperContext'>
  ): Promise<Partial<FleetGraphGraphState>> {
    if (!state.needsDeeperContext || !state.deeperContextHint) {
      return { fetchedData: state.fetchedData, path: 'fetch_deep_skip' };
    }

    const { ids, type } = state.deeperContextHint;
    const workspaceId = state.context?.workspaceId ?? '';

    let deepData: unknown;

    switch (type) {
      case 'assignee_workload': {
        deepData = await deps.shipClient.fetchMemberWorkloads(ids, workspaceId);
        break;
      }
      case 'linked_documents': {
        const docs = await Promise.all(
          ids.map((id) =>
            deps.shipClient.fetchDocument(id, 'document').catch(() => null)
          )
        );
        deepData = docs.filter(Boolean);
        break;
      }
      case 'sprint_issues': {
        const children = await Promise.all(
          ids.map((id) =>
            deps.shipClient.fetchChildren(id, 'sprint').catch(() => [])
          )
        );
        deepData = children.flat();
        break;
      }
      case 'project_members': {
        deepData = await deps.shipClient.fetchMemberWorkloads(ids, workspaceId);
        break;
      }
      default: {
        deepData = [];
      }
    }

    return {
      fetchedData: {
        ...state.fetchedData,
        [`deep:${type}`]: deepData,
      },
      path: 'fetch_deep',
    };
  };
}
```

**Step 4: Run tests**

```bash
pnpm test --filter api -- --testPathPattern="nodes/fetch-deep"
```

**Step 5: Commit**

```bash
git add api/src/services/fleetgraph/graph/nodes/fetch-deep.ts api/src/services/fleetgraph/graph/nodes/fetch-deep.test.ts
git commit -m "feat(fleetgraph): add fetch_deep node for targeted context escalation"
```

---

## Task 5: Create Reasoning Prompts

**Files:**
- Create: `api/src/services/fleetgraph/graph/prompts.ts`
- Create: `api/src/services/fleetgraph/graph/prompts.test.ts`

**Context:** The reasoning node calls the LLM with structured prompts. Prompts are per-document-type (sprint, issue, project, week). The LLM must return a JSON object — not free text — so the node can parse findings, depth hints, and proposed actions. We test that prompts render correctly and that the expected JSON schema is described.

**Step 1: Write the failing test**

```typescript
// api/src/services/fleetgraph/graph/prompts.test.ts
import { describe, expect, it } from 'vitest';
import { buildReasoningPrompt, parseReasoningResponse } from './prompts.js';

describe('buildReasoningPrompt', () => {
  it('includes document type, title, and fetched data in prompt', () => {
    const prompt = buildReasoningPrompt({
      context: { documentId: 's1', documentTitle: 'Sprint 4', documentType: 'sprint', actorId: 'u', surface: 'document-page', workspaceId: 'ws' },
      contextSummary: undefined,
      conversationHistory: [],
      fetchedData: { 's1': { document: { status: 'planning' }, children: [] } },
      userMessage: undefined,
    });

    expect(prompt.instructions).toContain('sprint');
    expect(prompt.input).toContain('Sprint 4');
    expect(prompt.input).toContain('planning');
  });

  it('includes last 3 conversation turns in prompt input', () => {
    const turns = [
      { role: 'user' as const, content: 'what is blocking?', timestamp: '2026-01-01T00:00:00Z' },
      { role: 'assistant' as const, content: 'Issue X is blocked.', timestamp: '2026-01-01T00:01:00Z' },
    ];

    const prompt = buildReasoningPrompt({
      context: { documentId: 's1', documentTitle: 'S', documentType: 'sprint', actorId: 'u', surface: 's', workspaceId: 'ws' },
      contextSummary: undefined,
      conversationHistory: turns,
      fetchedData: {},
      userMessage: 'follow up',
    });

    expect(prompt.input).toContain('what is blocking?');
    expect(prompt.input).toContain('follow up');
  });
});

describe('parseReasoningResponse', () => {
  it('parses valid JSON reasoning response', () => {
    const raw = JSON.stringify({
      analysisText: 'Sprint is at risk.',
      findings: [{ title: 'No issues', summary: 'Sprint has no issues.', severity: 'warning', findingType: 'empty_sprint', evidence: ['0 issues linked'], actionTier: 'A' }],
      needsDeeperContext: false,
      deeperContextHint: null,
      proposedAction: null,
    });

    const result = parseReasoningResponse(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.analysisText).toBe('Sprint is at risk.');
    expect(result.needsDeeperContext).toBe(false);
  });

  it('returns fallback on unparseable response', () => {
    const result = parseReasoningResponse('not json at all');
    expect(result.findings).toEqual([]);
    expect(result.analysisText).toContain('unable');
  });
});
```

**Step 2: Run to verify failure**

```bash
pnpm test --filter api -- --testPathPattern="graph/prompts"
```

**Step 3: Implement**

```typescript
// api/src/services/fleetgraph/graph/prompts.ts
import type {
  FleetGraphAnalysisFinding,
  FleetGraphContextEnvelope,
  FleetGraphConversationTurn,
  FleetGraphDepthHint,
} from './types.js';

interface ReasoningPromptInput {
  context: FleetGraphContextEnvelope;
  contextSummary: string | undefined;
  conversationHistory: FleetGraphConversationTurn[];
  fetchedData: Record<string, unknown>;
  userMessage: string | undefined;
}

interface ReasoningPromptOutput {
  input: string;
  instructions: string;
  maxOutputTokens: number;
  temperature: number;
}

interface ParsedReasoningResponse {
  analysisText: string;
  deeperContextHint: FleetGraphDepthHint | null;
  findings: FleetGraphAnalysisFinding[];
  needsDeeperContext: boolean;
  proposedAction: FleetGraphAnalysisFinding['proposedAction'] | null;
}

const SYSTEM_INSTRUCTIONS = `You are FleetGraph, a project intelligence agent embedded in Ship — a project management tool used by engineering teams.

Your job is to analyze the current state of the document the user is looking at and surface meaningful findings. You reason about relationships, gaps, risks, and relevance — not just summaries.

You MUST respond with a single valid JSON object. No prose before or after. The schema is:
{
  "analysisText": "A 2-4 sentence analysis written directly to the user. Be specific and opinionated.",
  "findings": [
    {
      "title": "Short title",
      "summary": "One sentence",
      "severity": "info | warning | critical",
      "findingType": "snake_case_label",
      "evidence": ["specific fact from the data"],
      "actionTier": "A | B | C",
      "proposedAction": null | { "label": "...", "targetId": "...", "targetType": "...", "endpoint": { "method": "POST", "path": "/api/..." } }
    }
  ],
  "needsDeeperContext": false,
  "deeperContextHint": null | { "type": "assignee_workload | linked_documents | sprint_issues | project_members", "ids": ["..."] },
  "proposedAction": null | { "label": "...", "targetId": "...", "targetType": "...", "endpoint": { "method": "POST", "path": "/api/..." } }
}

Action tiers:
- A: Read-only (analysis, summaries). No mutations.
- B: Soft mutation (add comment, create issue, assign person).
- C: Structural (move between sprints, close issues, bulk reassign).

Only propose an action if the evidence strongly supports it. When unsure, use Tier A.`;

function formatFetchedData(fetchedData: Record<string, unknown>): string {
  if (Object.keys(fetchedData).length === 0) {
    return 'No additional data fetched.';
  }
  return JSON.stringify(fetchedData, null, 2);
}

function formatConversationHistory(
  history: FleetGraphConversationTurn[],
  summary: string | undefined
): string {
  const lines: string[] = [];

  if (summary) {
    lines.push(`[Earlier in this conversation: ${summary}]`);
  }

  // Only last 3 turns
  const recentTurns = history.slice(-3);
  for (const turn of recentTurns) {
    lines.push(`${turn.role === 'user' ? 'User' : 'FleetGraph'}: ${turn.content}`);
  }

  return lines.length > 0 ? lines.join('\n') : '';
}

export function buildReasoningPrompt(input: ReasoningPromptInput): ReasoningPromptOutput {
  const { context, contextSummary, conversationHistory, fetchedData, userMessage } = input;

  const conversationSection = formatConversationHistory(conversationHistory, contextSummary);
  const dataSection = formatFetchedData(fetchedData);

  const inputParts = [
    `Document: "${context.documentTitle}" (type: ${context.documentType}, id: ${context.documentId})`,
    `Surface: ${context.surface}`,
    '',
    '## Ship Data',
    dataSection,
  ];

  if (conversationSection) {
    inputParts.push('', '## Conversation History', conversationSection);
  }

  if (userMessage) {
    inputParts.push('', `## User Question`, userMessage);
  } else {
    inputParts.push('', '## Task', `Analyze this ${context.documentType} and surface what matters most.`);
  }

  return {
    input: inputParts.join('\n'),
    instructions: SYSTEM_INSTRUCTIONS,
    maxOutputTokens: 1200,
    temperature: 0.2,
  };
}

export function parseReasoningResponse(raw: string): ParsedReasoningResponse {
  try {
    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const jsonStr = jsonMatch[1]?.trim() ?? raw.trim();
    const parsed = JSON.parse(jsonStr) as ParsedReasoningResponse;

    return {
      analysisText: typeof parsed.analysisText === 'string' ? parsed.analysisText : 'Analysis complete.',
      deeperContextHint: parsed.deeperContextHint ?? null,
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      needsDeeperContext: Boolean(parsed.needsDeeperContext),
      proposedAction: parsed.proposedAction ?? null,
    };
  } catch {
    return {
      analysisText: 'FleetGraph was unable to parse the analysis result. Please try again.',
      deeperContextHint: null,
      findings: [],
      needsDeeperContext: false,
      proposedAction: null,
    };
  }
}
```

**Step 4: Run tests**

```bash
pnpm test --filter api -- --testPathPattern="graph/prompts"
```

**Step 5: Commit**

```bash
git add api/src/services/fleetgraph/graph/prompts.ts api/src/services/fleetgraph/graph/prompts.test.ts
git commit -m "feat(fleetgraph): add reasoning prompts with structured JSON output schema"
```

---

## Task 6: Create Reason Node

**Files:**
- Create: `api/src/services/fleetgraph/graph/nodes/reason.ts`
- Create: `api/src/services/fleetgraph/graph/nodes/reason.test.ts`

**Context:** This is the core intelligence node. It calls the LLM adapter with the reasoning prompt, parses the response, and writes `analysisFindings`, `analysisText`, `needsDeeperContext`, `deeperContextHint`, and `pendingAction` into state. It also appends the assistant's response to `conversationHistory` and manages the rolling 3-turn window.

**Step 1: Write the failing test**

```typescript
// api/src/services/fleetgraph/graph/nodes/reason.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createReasonNode } from './reason.js';

const mockLLM = {
  generate: vi.fn(),
  model: 'test-model',
  provider: 'openai' as const,
};

describe('reasonNode', () => {
  it('writes findings and analysisText into state', async () => {
    mockLLM.generate.mockResolvedValue({
      text: JSON.stringify({
        analysisText: 'Sprint 4 has 3 unassigned issues.',
        findings: [{ title: 'Unassigned issues', summary: 'Issues without owners.', severity: 'warning', findingType: 'unassigned_issues', evidence: ['3 issues have no assignee'], actionTier: 'B' }],
        needsDeeperContext: false,
        deeperContextHint: null,
        proposedAction: null,
      }),
    });

    const node = createReasonNode({ llm: mockLLM });
    const result = await node({
      context: { documentId: 's1', documentTitle: 'Sprint 4', documentType: 'sprint', actorId: 'u', surface: 's', workspaceId: 'ws' },
      contextSummary: undefined,
      conversationHistory: [],
      fetchedData: { 's1': { document: { status: 'active' }, children: [] } },
      userMessage: undefined,
    } as never);

    expect(result.analysisFindings).toHaveLength(1);
    expect(result.analysisText).toBe('Sprint 4 has 3 unassigned issues.');
    expect(result.needsDeeperContext).toBe(false);
  });

  it('sets needsDeeperContext and hint when LLM requests escalation', async () => {
    mockLLM.generate.mockResolvedValue({
      text: JSON.stringify({
        analysisText: 'Need to check assignee workloads.',
        findings: [],
        needsDeeperContext: true,
        deeperContextHint: { type: 'assignee_workload', ids: ['user-1', 'user-2'] },
        proposedAction: null,
      }),
    });

    const node = createReasonNode({ llm: mockLLM });
    const result = await node({
      context: { documentId: 's1', documentTitle: 'S', documentType: 'sprint', actorId: 'u', surface: 's', workspaceId: 'ws' },
      contextSummary: undefined,
      conversationHistory: [],
      fetchedData: {},
      userMessage: undefined,
    } as never);

    expect(result.needsDeeperContext).toBe(true);
    expect(result.deeperContextHint).toMatchObject({ type: 'assignee_workload' });
  });

  it('appends assistant turn to conversationHistory', async () => {
    mockLLM.generate.mockResolvedValue({
      text: JSON.stringify({ analysisText: 'All good.', findings: [], needsDeeperContext: false, deeperContextHint: null, proposedAction: null }),
    });

    const node = createReasonNode({ llm: mockLLM });
    const result = await node({
      context: { documentId: 's1', documentTitle: 'S', documentType: 'sprint', actorId: 'u', surface: 's', workspaceId: 'ws' },
      contextSummary: undefined,
      conversationHistory: [{ role: 'user', content: 'how is the sprint?', timestamp: '2026-01-01T00:00:00Z' }],
      fetchedData: {},
      userMessage: 'how is the sprint?',
    } as never);

    expect(result.conversationHistory).toHaveLength(2);
    expect(result.conversationHistory?.[1].role).toBe('assistant');
  });
});
```

**Step 2: Run to verify failure**

```bash
pnpm test --filter api -- --testPathPattern="nodes/reason"
```

**Step 3: Implement**

```typescript
// api/src/services/fleetgraph/graph/nodes/reason.ts
import { buildReasoningPrompt, parseReasoningResponse } from '../prompts.js';
import type { FleetGraphGraphState } from '../state.js';
import type { FleetGraphConversationTurn } from '../types.js';
import type { LLMAdapter } from '../../llm/types.js';

interface ReasonNodeDeps {
  llm: LLMAdapter;
}

// Keep only the last 3 turns in history; summarize older ones
const MAX_HISTORY_TURNS = 3;

function trimConversationHistory(
  history: FleetGraphConversationTurn[],
  existingSummary: string | undefined
): { history: FleetGraphConversationTurn[]; summary: string | undefined } {
  if (history.length <= MAX_HISTORY_TURNS) {
    return { history, summary: existingSummary };
  }

  const trimmed = history.slice(-MAX_HISTORY_TURNS);
  const older = history.slice(0, history.length - MAX_HISTORY_TURNS);
  const summaryAddition = older
    .map((t) => `${t.role}: ${t.content.slice(0, 80)}`)
    .join(' | ');
  const newSummary = existingSummary
    ? `${existingSummary} | ${summaryAddition}`
    : summaryAddition;

  return { history: trimmed, summary: newSummary };
}

export function createReasonNode(deps: ReasonNodeDeps) {
  return async function reasonNode(
    state: Pick<
      FleetGraphGraphState,
      | 'context'
      | 'contextSummary'
      | 'conversationHistory'
      | 'fetchedData'
      | 'turnCount'
      | 'userMessage'
    >
  ): Promise<Partial<FleetGraphGraphState>> {
    if (!state.context) {
      return {
        analysisText: 'No context available for analysis.',
        path: 'reason_no_context',
      };
    }

    const prompt = buildReasoningPrompt({
      context: state.context,
      contextSummary: state.contextSummary,
      conversationHistory: state.conversationHistory,
      fetchedData: state.fetchedData,
      userMessage: state.userMessage,
    });

    const llmResponse = await deps.llm.generate(prompt);
    const parsed = parseReasoningResponse(llmResponse.text);

    // Append assistant response to conversation history
    const assistantTurn: FleetGraphConversationTurn = {
      content: parsed.analysisText,
      role: 'assistant',
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [
      ...state.conversationHistory,
      ...(state.userMessage
        ? [{ content: state.userMessage, role: 'user' as const, timestamp: new Date().toISOString() }]
        : []),
      assistantTurn,
    ];

    const { history: trimmedHistory, summary: newSummary } =
      trimConversationHistory(updatedHistory, state.contextSummary);

    return {
      analysisFindings: parsed.findings,
      analysisText: parsed.analysisText,
      contextSummary: newSummary,
      conversationHistory: trimmedHistory,
      deeperContextHint: parsed.deeperContextHint ?? undefined,
      needsDeeperContext: parsed.needsDeeperContext,
      path: 'reason',
      pendingAction: parsed.proposedAction ?? undefined,
      turnCount: (state.turnCount ?? 0) + 1,
    };
  };
}
```

**Step 4: Run tests**

```bash
pnpm test --filter api -- --testPathPattern="nodes/reason"
```

**Step 5: Commit**

```bash
git add api/src/services/fleetgraph/graph/nodes/reason.ts api/src/services/fleetgraph/graph/nodes/reason.test.ts
git commit -m "feat(fleetgraph): add reason node with LLM analysis and conversation history management"
```

---

## Task 7: Create Action Router & Output Nodes

**Files:**
- Create: `api/src/services/fleetgraph/graph/nodes/action-router.ts`
- Create: `api/src/services/fleetgraph/graph/nodes/render-findings.ts`
- Create: `api/src/services/fleetgraph/graph/nodes/propose-action.ts`
- Create: `api/src/services/fleetgraph/graph/nodes/action-router.test.ts`

**Context:** After reasoning, the graph routes based on what was found. Tier A (read-only) goes to `render_findings`. Tier B/C (mutations) goes to `propose_action`, which uses LangGraph's `interrupt()` to pause for human confirmation. `execute_action` runs only after confirmation arrives in a follow-up invocation.

**Step 1: Write the failing test**

```typescript
// api/src/services/fleetgraph/graph/nodes/action-router.test.ts
import { describe, expect, it } from 'vitest';
import { selectActionRoute } from './action-router.js';

describe('selectActionRoute', () => {
  it('routes to render_findings when no pending action', () => {
    expect(selectActionRoute({ analysisFindings: [], pendingAction: undefined } as never))
      .toBe('render_findings');
  });

  it('routes to render_findings for Tier A action', () => {
    const findings = [{ actionTier: 'A', title: 'Info', summary: '', severity: 'info', findingType: 'info', evidence: [] }];
    expect(selectActionRoute({ analysisFindings: findings, pendingAction: undefined } as never))
      .toBe('render_findings');
  });

  it('routes to propose_action for Tier B action', () => {
    const findings = [{ actionTier: 'B', title: 'Assign', summary: '', severity: 'warning', findingType: 'unassigned', evidence: [], proposedAction: { label: 'Assign', targetId: 'i1', targetType: 'issue', endpoint: { method: 'POST', path: '/api/issues/i1/assign' } } }];
    expect(selectActionRoute({ analysisFindings: findings, pendingAction: findings[0].proposedAction } as never))
      .toBe('propose_action');
  });

  it('routes to propose_action for Tier C action', () => {
    const findings = [{ actionTier: 'C', title: 'Move', summary: '', severity: 'critical', findingType: 'overdue', evidence: [], proposedAction: { label: 'Move', targetId: 'i1', targetType: 'issue', endpoint: { method: 'POST', path: '/api/issues/i1/move' } } }];
    expect(selectActionRoute({ analysisFindings: findings, pendingAction: findings[0].proposedAction } as never))
      .toBe('propose_action');
  });
});
```

**Step 2: Run to verify failure**

```bash
pnpm test --filter api -- --testPathPattern="nodes/action-router"
```

**Step 3: Implement action-router**

```typescript
// api/src/services/fleetgraph/graph/nodes/action-router.ts
import type { FleetGraphGraphState } from '../state.js';

type RoutableState = Pick<FleetGraphGraphState, 'analysisFindings' | 'pendingAction'>;

export function selectActionRoute(state: RoutableState): string {
  // If there's a pending action with a Tier B or C finding, pause for confirmation
  if (state.pendingAction) {
    const actionableFinding = state.analysisFindings.find(
      (f) => f.actionTier === 'B' || f.actionTier === 'C'
    );
    if (actionableFinding) {
      return 'propose_action';
    }
  }

  return 'render_findings';
}
```

**Step 4: Implement render-findings node**

```typescript
// api/src/services/fleetgraph/graph/nodes/render-findings.ts
import type { FleetGraphGraphState } from '../state.js';

export function renderFindingsNode(
  state: Pick<FleetGraphGraphState, 'analysisFindings' | 'analysisText'>
): Partial<FleetGraphGraphState> {
  return {
    branch: 'reasoned',
    outcome: 'advisory',
    path: 'render_findings',
  };
}
```

**Step 5: Implement propose-action node**

```typescript
// api/src/services/fleetgraph/graph/nodes/propose-action.ts
import { interrupt } from '@langchain/langgraph';
import type { FleetGraphGraphState } from '../state.js';

export function proposeActionNode(
  state: Pick<FleetGraphGraphState, 'analysisFindings' | 'analysisText' | 'pendingAction'>
): Partial<FleetGraphGraphState> {
  // LangGraph interrupt — pauses graph execution and surfaces pendingAction to the caller.
  // The graph resumes when the caller invokes it again with a confirmation in state.
  interrupt({
    action: state.pendingAction,
    analysisText: state.analysisText,
    findings: state.analysisFindings,
    type: 'action_confirmation_required',
  });

  return {
    branch: 'approval_required',
    outcome: 'approval_required',
    path: 'propose_action',
  };
}
```

**Step 6: Run tests**

```bash
pnpm test --filter api -- --testPathPattern="nodes/action-router"
```

**Step 7: Commit**

```bash
git add api/src/services/fleetgraph/graph/nodes/action-router.ts api/src/services/fleetgraph/graph/nodes/action-router.test.ts api/src/services/fleetgraph/graph/nodes/render-findings.ts api/src/services/fleetgraph/graph/nodes/propose-action.ts
git commit -m "feat(fleetgraph): add action router, render-findings, and propose-action nodes"
```

---

## Task 8: Rebuild Graph Runtime

**Files:**
- Modify: `api/src/services/fleetgraph/graph/runtime.ts`
- Modify: `api/src/services/fleetgraph/graph/runtime.test.ts` (existing tests)

**Context:** Replace the 4-node routing skeleton with the full node chain: `resolve_context → fetch_medium → reason → depth_router → (fetch_deep → reason) → action_router → (render_findings | propose_action)`. The `createFleetGraphRuntime` factory now takes LLM adapter and Ship client as dependencies.

**Step 1: Read the existing runtime test to understand what must still pass**

Read: `api/src/services/fleetgraph/graph/runtime.test.ts`

**Step 2: Implement new runtime.ts**

```typescript
// api/src/services/fleetgraph/graph/runtime.ts
import {
  END,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph';

import { resolveLLMConfig, createLLMAdapter } from '../llm/index.js';
import { createFleetGraphShipClient } from './ship-client.js';
import { FleetGraphStateAnnotation } from './state.js';
import {
  FleetGraphStateSchema,
  parseFleetGraphRuntimeInput,
  type FleetGraphRuntimeInput,
  type FleetGraphState,
} from './types.js';
import { createFetchMediumNode } from './nodes/fetch-medium.js';
import { createFetchDeepNode } from './nodes/fetch-deep.js';
import { createReasonNode } from './nodes/reason.js';
import { selectActionRoute } from './nodes/action-router.js';
import { renderFindingsNode } from './nodes/render-findings.js';
import { proposeActionNode } from './nodes/propose-action.js';

interface FleetGraphRuntime {
  readonly checkpointer: MemorySaver;
  getState(threadId: string): Promise<unknown>;
  invoke(input: unknown): Promise<FleetGraphState>;
}

interface FleetGraphRuntimeDeps {
  checkpointer?: MemorySaver;
  llmAdapter?: ReturnType<typeof createLLMAdapter>;
  shipClient?: ReturnType<typeof createFleetGraphShipClient>;
}

function buildRouteSurface(input: FleetGraphRuntimeInput) {
  if (input.routeSurface) return input.routeSurface;
  return input.mode === 'on_demand' ? 'document-page' : 'workspace-sweep';
}

function buildCompiledGraph(
  checkpointer: MemorySaver,
  deps: Required<Omit<FleetGraphRuntimeDeps, 'checkpointer'>>
) {
  const fetchMedium = createFetchMediumNode({ shipClient: deps.shipClient });
  const fetchDeep = createFetchDeepNode({ shipClient: deps.shipClient });
  const reason = createReasonNode({ llm: deps.llmAdapter });

  return new StateGraph(FleetGraphStateAnnotation)
    // ── Entry: establish context ──────────────────────────────────────────
    .addNode('resolve_context', (state) => ({
      checkpointNamespace: 'fleetgraph',
      path: 'resolve_context',
      routeSurface: state.routeSurface || 'workspace-sweep',
    }))

    // ── Fetch: medium depth (document + one-hop) ──────────────────────────
    .addNode('fetch_medium', fetchMedium)

    // ── Reason: LLM analysis ──────────────────────────────────────────────
    .addNode('reason', reason)

    // ── Fetch: deep (targeted, only when reason requests it) ──────────────
    .addNode('fetch_deep', fetchDeep)

    // ── Reason: second pass after deep fetch ──────────────────────────────
    .addNode('reason_deep', reason)

    // ── Output nodes ──────────────────────────────────────────────────────
    .addNode('render_findings', renderFindingsNode)
    .addNode('propose_action', proposeActionNode)
    .addNode('quiet_exit', () => ({ outcome: 'quiet' as const, path: 'quiet_exit' }))
    .addNode('fallback', () => ({ hasError: true, outcome: 'fallback' as const, path: 'fallback' }))

    // ── Edges ─────────────────────────────────────────────────────────────
    .addEdge(START, 'resolve_context')
    .addEdge('resolve_context', 'fetch_medium')
    .addEdge('fetch_medium', 'reason')

    // depth_router: if needsDeeperContext → fetch_deep, else → action_router
    .addConditionalEdges('reason', (state) => {
      if (state.hasError) return 'fallback';
      if (state.mode !== 'on_demand') return 'quiet_exit';
      if (state.needsDeeperContext) return 'fetch_deep';
      return selectActionRoute(state);
    }, {
      fallback: 'fallback',
      propose_action: 'propose_action',
      quiet_exit: 'quiet_exit',
      render_findings: 'render_findings',
      fetch_deep: 'fetch_deep',
    })

    .addEdge('fetch_deep', 'reason_deep')

    // After deep reason, route to output (no second escalation allowed)
    .addConditionalEdges('reason_deep', (state) => {
      if (state.hasError) return 'fallback';
      return selectActionRoute(state);
    }, {
      fallback: 'fallback',
      propose_action: 'propose_action',
      render_findings: 'render_findings',
    })

    .addEdge('render_findings', END)
    .addEdge('propose_action', END)
    .addEdge('quiet_exit', END)
    .addEdge('fallback', END)

    .compile({
      checkpointer,
      name: 'fleetgraph.runtime',
    });
}

export function createFleetGraphRuntime(
  deps: FleetGraphRuntimeDeps = {}
): FleetGraphRuntime {
  const checkpointer = deps.checkpointer ?? new MemorySaver();

  const llmAdapter = deps.llmAdapter ?? createLLMAdapter(resolveLLMConfig());
  const shipClient = deps.shipClient ?? createFleetGraphShipClient({
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    token: process.env.FLEETGRAPH_API_TOKEN ?? '',
  });

  const graph = buildCompiledGraph(checkpointer, { llmAdapter, shipClient });

  return {
    checkpointer,
    async getState(threadId: string) {
      return graph.getState({ configurable: { thread_id: threadId } });
    },
    async invoke(input: unknown) {
      const parsed = parseFleetGraphRuntimeInput(input);
      const initialState = {
        ...parsed,
        checkpointNamespace: 'fleetgraph' as const,
        routeSurface: buildRouteSurface(parsed),
      };
      const result = await graph.invoke(initialState, {
        configurable: { thread_id: parsed.threadId },
      });
      return FleetGraphStateSchema.parse(result);
    },
  };
}
```

**Step 3: Update FleetGraphStateSchema in types.ts** to make new fields optional so existing validation passes:

In `graph/types.ts`, extend `FleetGraphStateSchema` to include the new fields with `.optional()`:

```typescript
export const FleetGraphStateSchema = FleetGraphRuntimeInputSchema.extend({
  branch: z.enum(FLEETGRAPH_BRANCHES),
  checkpointNamespace: z.literal('fleetgraph'),
  outcome: z.enum(FLEETGRAPH_OUTCOMES),
  path: z.array(z.string().min(1)).min(1), // relaxed from min(3) to min(1)
  routeSurface: z.string().min(1),
  // New optional fields
  analysisFindings: z.array(z.unknown()).optional(),
  analysisText: z.string().optional(),
  contextSummary: z.string().optional(),
  conversationHistory: z.array(z.unknown()).optional(),
  deeperContextHint: z.unknown().optional(),
  fetchDepth: z.enum(['medium', 'deep']).optional(),
  fetchedData: z.record(z.unknown()).optional(),
  needsDeeperContext: z.boolean().optional(),
  pendingAction: z.unknown().optional(),
  turnCount: z.number().optional(),
  userMessage: z.string().optional(),
});
```

**Step 4: Run all fleetgraph tests**

```bash
pnpm test --filter api -- --testPathPattern="fleetgraph"
```

Expected: all tests pass. If runtime.test.ts tests fail due to structural changes, update them to match the new graph shape (paths will differ).

**Step 5: Commit**

```bash
git add api/src/services/fleetgraph/graph/runtime.ts api/src/services/fleetgraph/graph/types.ts
git commit -m "feat(fleetgraph): rebuild graph runtime with full reasoning node chain"
```

---

## Task 9: Update Entry Service to Pass Real Context

**Files:**
- Modify: `api/src/services/fleetgraph/entry/service.ts`

**Context:** Currently `entry/service.ts` passes `candidateCount: 1` as a hack to force the `reasoned` branch. It also discards the normalized Ship context after using it for thread ID. We need to: (1) remove the `candidateCount` hack, (2) pass the full context envelope into the graph state, (3) map `analysisFindings` and `analysisText` from graph output back into the entry response.

**Step 1: Update the `createEntry` method in `entry/service.ts`**

Find and replace the `graph.invoke` call section. Currently:

```typescript
const state = await deps.runtime.invoke({
  approvalRequired: Boolean(parsed.draft?.requestedAction),
  candidateCount: 1,
  documentId: entry.current.id,
  mode: entry.trigger.mode,
  routeSurface: entry.route.surface,
  threadId: entry.trigger.threadId,
  trigger: entry.trigger.trigger,
  workspaceId: entry.trigger.workspaceId,
})
```

Replace with:

```typescript
const contextEnvelope = {
  actorId: auth.userId,
  documentId: entry.current.id,
  documentTitle: entry.current.title,
  documentType: entry.current.documentType,
  surface: entry.route.surface,
  workspaceId: entry.trigger.workspaceId,
}

const state = await deps.runtime.invoke({
  approvalRequired: Boolean(parsed.draft?.requestedAction),
  context: contextEnvelope,
  documentId: entry.current.id,
  mode: entry.trigger.mode,
  routeSurface: entry.route.surface,
  threadId: entry.trigger.threadId,
  trigger: entry.trigger.trigger,
  userMessage: undefined,
  workspaceId: entry.trigger.workspaceId,
})
```

**Step 2: Update `buildSummary` to use real analysis text**

Find `buildSummary` function and update the `detail` field:

```typescript
function buildSummary(
  input: FleetGraphEntryRequest,
  response: FleetGraphEntryResponse['entry'],
  state: FleetGraphState
) {
  const title = state.outcome === 'approval_required'
    ? 'FleetGraph paused for human approval.'
    : state.analysisText
      ? 'FleetGraph found something worth reviewing.'
      : `FleetGraph is ready in this ${response.current.documentType} context.`

  const detail = state.analysisText
    ?? (state.outcome === 'approval_required'
      ? `Review the suggested next step for ${response.current.title}.`
      : `FleetGraph reviewed ${response.current.title} and can help from this page.`)

  return {
    detail,
    surfaceLabel: buildSurfaceLabel(input),
    title,
  }
}
```

**Step 3: Add `analysisFindings` and `analysisText` to the entry response schema**

In `entry/contracts.ts`, update `FleetGraphEntryResponseSchema` to include:

```typescript
export const FleetGraphEntryResponseSchema = z.object({
  analysisFindings: z.array(z.unknown()).optional(),
  analysisText: z.string().optional(),
  approval: FleetGraphApprovalEnvelopeSchema.optional(),
  entry: z.object({
    current: FleetGraphEntryCurrentSchema,
    route: FleetGraphEntryRouteSummarySchema,
    threadId: nonEmptyString,
  }).strict(),
  run: FleetGraphEntryRunSchema,
  summary: FleetGraphEntrySummarySchema,
}).strict()
```

And in `entry/service.ts`, include in the response parse:

```typescript
const response = FleetGraphEntryResponseSchema.parse({
  analysisFindings: state.analysisFindings,
  analysisText: state.analysisText,
  approval: parsed.draft?.requestedAction ? buildApproval(parsed.draft.requestedAction) : undefined,
  entry: { ... },   // unchanged
  run: { ... },     // unchanged
  summary: buildSummary(...),
})
```

**Step 4: Run all entry-related tests**

```bash
pnpm test --filter api -- --testPathPattern="fleetgraph"
```

**Step 5: Commit**

```bash
git add api/src/services/fleetgraph/entry/service.ts api/src/services/fleetgraph/entry/contracts.ts
git commit -m "feat(fleetgraph): wire real context into graph and return analysis findings from entry"
```

---

## Task 10: Add Conversation Turn Endpoint

**Files:**
- Modify: `api/src/routes/fleetgraph.ts`

**Context:** Follow-up questions need their own endpoint that reuses the existing LangGraph thread (via `threadId`). This endpoint receives a `message` and `threadId`, builds a user turn, invokes the graph with the existing checkpointed state, and returns the updated analysis.

**Step 1: Add route to `fleetgraph.ts`**

Add after the `/entry` route:

```typescript
router.post('/thread/:threadId/turn', authMiddleware, async (req: Request, res: Response) => {
  const auth = getAuthContext(req, res)
  if (!auth) return

  if (!isSurfaceEnabled('api')) {
    res.status(503).json({ error: 'FleetGraph entry is not enabled in this environment' })
    return
  }

  const { message } = req.body as { message?: string }
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'FleetGraph turn requires a non-empty message' })
    return
  }

  const threadId = String(req.params.threadId)

  try {
    const state = await runtime.invoke({
      mode: 'on_demand',
      threadId,
      trigger: 'document-context',
      userMessage: message.trim(),
      workspaceId: auth.workspaceId,
    })

    res.json({
      analysisFindings: state.analysisFindings ?? [],
      analysisText: state.analysisText,
      outcome: state.outcome,
      pendingAction: state.pendingAction,
      threadId: state.threadId,
      turnCount: state.turnCount,
    })
  } catch (error) {
    console.error('FleetGraph turn error:', error)
    res.status(500).json({ error: 'Failed to process FleetGraph turn' })
  }
})
```

**Step 2: Run fleetgraph route tests**

```bash
pnpm test --filter api -- --testPathPattern="routes/fleetgraph"
```

**Step 3: Commit**

```bash
git add api/src/routes/fleetgraph.ts
git commit -m "feat(fleetgraph): add /thread/:threadId/turn endpoint for multi-turn conversation"
```

---

## Task 11: Create FleetGraph FAB Component

**Files:**
- Create: `web/src/components/FleetGraphFab.tsx`
- Create: `web/src/components/FleetGraphFab.test.tsx`

**Context:** Context-aware FAB that appears only on supported document types (sprint, issue, project, week). Shows a badge (dot) when proactive findings exist for the current document. Opens the analysis panel on click. Auto-triggers the entry API when the document loads so the analysis is ready when the user clicks.

**Step 1: Write the failing test**

```typescript
// web/src/components/FleetGraphFab.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { FleetGraphFab } from './FleetGraphFab'

const mockEntry = vi.fn()
vi.mock('@/lib/fleetgraph-entry', () => ({
  buildFleetGraphEntryPayload: vi.fn(() => ({})),
}))

describe('FleetGraphFab', () => {
  it('renders for supported document type', () => {
    render(<FleetGraphFab documentType="sprint" documentId="s1" documentTitle="Sprint 4" workspaceId="ws" userId="u1" context={{} as never} />)
    expect(screen.getByRole('button', { name: /fleetgraph/i })).toBeInTheDocument()
  })

  it('does not render for unsupported document type', () => {
    render(<FleetGraphFab documentType="wiki" documentId="w1" documentTitle="Wiki" workspaceId="ws" userId="u1" context={{} as never} />)
    expect(screen.queryByRole('button', { name: /fleetgraph/i })).not.toBeInTheDocument()
  })

  it('opens panel when clicked', async () => {
    render(<FleetGraphFab documentType="sprint" documentId="s1" documentTitle="Sprint 4" workspaceId="ws" userId="u1" context={{} as never} />)
    await userEvent.click(screen.getByRole('button', { name: /fleetgraph/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
```

**Step 2: Run to verify failure**

```bash
pnpm test --filter web -- --testPathPattern="FleetGraphFab"
```

**Step 3: Implement FleetGraphFab.tsx**

```typescript
// web/src/components/FleetGraphFab.tsx
import { useState, useEffect } from 'react'
import type { DocumentContext } from '@/hooks/useDocumentContextQuery'
import { buildFleetGraphEntryPayload } from '@/lib/fleetgraph-entry'
import type { FleetGraphEntryResponse } from '@/lib/fleetgraph-entry'
import { FleetGraphPanel } from './FleetGraphPanel'

const SUPPORTED_DOCUMENT_TYPES = new Set(['sprint', 'issue', 'project', 'week'])

interface FleetGraphFabProps {
  context: DocumentContext
  documentId: string
  documentTitle: string
  documentType: string
  userId: string
  workspaceId: string
}

export function FleetGraphFab({
  context,
  documentId,
  documentTitle,
  documentType,
  userId,
  workspaceId,
}: FleetGraphFabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [entryResponse, setEntryResponse] = useState<FleetGraphEntryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasBadge, setHasBadge] = useState(false)

  // Not supported — render nothing
  if (!SUPPORTED_DOCUMENT_TYPES.has(documentType)) {
    return null
  }

  // Auto-trigger analysis on mount (runs in background, badge appears when ready)
  useEffect(() => {
    let cancelled = false

    async function triggerAnalysis() {
      try {
        const payload = buildFleetGraphEntryPayload({
          context,
          document: { documentType, id: documentId, title: documentTitle, workspaceId },
          userId,
        })

        const response = await fetch('/api/fleetgraph/entry', {
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (!response.ok || cancelled) return

        const data: FleetGraphEntryResponse = await response.json()

        if (!cancelled) {
          setEntryResponse(data)
          // Show badge if there are findings or an action proposed
          const hasFindings = Array.isArray((data as FleetGraphEntryResponse & { analysisFindings?: unknown[] }).analysisFindings) &&
            ((data as FleetGraphEntryResponse & { analysisFindings?: unknown[] }).analysisFindings?.length ?? 0) > 0
          setHasBadge(hasFindings || data.run.outcome === 'approval_required')
        }
      } catch {
        // Silent fail — FAB still renders, analysis just not pre-loaded
      }
    }

    triggerAnalysis()
    return () => { cancelled = true }
  }, [documentId, documentType])

  async function handleOpen() {
    setIsOpen(true)
    if (!entryResponse) {
      setIsLoading(true)
      try {
        const payload = buildFleetGraphEntryPayload({
          context,
          document: { documentType, id: documentId, title: documentTitle, workspaceId },
          userId,
        })
        const response = await fetch('/api/fleetgraph/entry', {
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        if (response.ok) {
          const data: FleetGraphEntryResponse = await response.json()
          setEntryResponse(data)
        }
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <>
      <button
        aria-label="FleetGraph — Project Intelligence"
        className={[
          'fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg',
          'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        ].join(' ')}
        onClick={handleOpen}
        type="button"
      >
        {/* FleetGraph icon — simplified ship/graph icon */}
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M3 17l4-8 4 4 4-6 4 10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Badge — appears when there are findings */}
        {hasBadge && (
          <span
            aria-label="FleetGraph has findings"
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white"
          />
        )}
      </button>

      {isOpen && (
        <FleetGraphPanel
          entryResponse={entryResponse}
          isLoading={isLoading}
          onClose={() => setIsOpen(false)}
          threadId={entryResponse?.entry.threadId}
        />
      )}
    </>
  )
}
```

**Step 4: Run tests**

```bash
pnpm test --filter web -- --testPathPattern="FleetGraphFab"
```

**Step 5: Commit**

```bash
git add web/src/components/FleetGraphFab.tsx web/src/components/FleetGraphFab.test.tsx
git commit -m "feat(fleetgraph): add context-aware FAB with auto-analysis trigger and badge"
```

---

## Task 12: Create FleetGraph Analysis Panel

**Files:**
- Create: `web/src/components/FleetGraphPanel.tsx`
- Create: `web/src/components/FleetGraphPanel.test.tsx`

**Context:** The panel shows the auto-analysis at the top (fixed, never replaced by follow-ups). Follow-up responses append below. A chat input at the bottom sends follow-up questions via `POST /api/fleetgraph/thread/:threadId/turn`. Action confirmation (Tier B: inline banner, Tier C: modal) renders within the panel.

**Step 1: Write the failing test**

```typescript
// web/src/components/FleetGraphPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { FleetGraphPanel } from './FleetGraphPanel'
import type { FleetGraphEntryResponse } from '@/lib/fleetgraph-entry'

const mockEntryResponse: FleetGraphEntryResponse = {
  entry: { current: { documentType: 'sprint', id: 's1', title: 'Sprint 4' }, route: { nestedPath: [], surface: 'document-page' }, threadId: 'thread-1' },
  run: { branch: 'reasoned', outcome: 'advisory', path: ['resolve_context', 'fetch_medium', 'reason', 'render_findings'], routeSurface: 'document-page', threadId: 'thread-1' },
  summary: { detail: 'Sprint 4 has 2 unassigned issues.', surfaceLabel: 'document-page', title: 'FleetGraph found something.' },
} as FleetGraphEntryResponse

describe('FleetGraphPanel', () => {
  it('renders analysis summary text', () => {
    render(<FleetGraphPanel entryResponse={mockEntryResponse} isLoading={false} onClose={() => {}} threadId="thread-1" />)
    expect(screen.getByText('Sprint 4 has 2 unassigned issues.')).toBeInTheDocument()
  })

  it('renders loading state when no entry response yet', () => {
    render(<FleetGraphPanel entryResponse={null} isLoading={true} onClose={() => {}} threadId={undefined} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders chat input for follow-up when threadId is available', () => {
    render(<FleetGraphPanel entryResponse={mockEntryResponse} isLoading={false} onClose={() => {}} threadId="thread-1" />)
    expect(screen.getByPlaceholderText(/ask a follow-up/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<FleetGraphPanel entryResponse={mockEntryResponse} isLoading={false} onClose={onClose} threadId="thread-1" />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

**Step 2: Run to verify failure**

```bash
pnpm test --filter web -- --testPathPattern="FleetGraphPanel"
```

**Step 3: Implement FleetGraphPanel.tsx**

```typescript
// web/src/components/FleetGraphPanel.tsx
import { useState, useRef, useEffect } from 'react'
import type { FleetGraphEntryResponse } from '@/lib/fleetgraph-entry'

interface TurnResponse {
  analysisFindings: unknown[]
  analysisText?: string
  outcome: string
  pendingAction?: unknown
  threadId: string
  turnCount: number
}

interface FleetGraphPanelProps {
  entryResponse: FleetGraphEntryResponse | null
  isLoading: boolean
  onClose: () => void
  threadId: string | undefined
}

export function FleetGraphPanel({
  entryResponse,
  isLoading,
  onClose,
  threadId,
}: FleetGraphPanelProps) {
  const [followUps, setFollowUps] = useState<Array<{ question: string; answer: string }>>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when panel opens and analysis is ready
  useEffect(() => {
    if (!isLoading && entryResponse) {
      inputRef.current?.focus()
    }
  }, [isLoading, entryResponse])

  async function handleSend() {
    const message = inputValue.trim()
    if (!message || !threadId || isSending) return

    setInputValue('')
    setIsSending(true)

    try {
      const response = await fetch(`/api/fleetgraph/thread/${threadId}/turn`, {
        body: JSON.stringify({ message }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (response.ok) {
        const data: TurnResponse = await response.json()
        setFollowUps((prev) => [
          ...prev,
          { question: message, answer: data.analysisText ?? 'Analysis complete.' },
        ])
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      aria-label="FleetGraph Panel"
      aria-modal="true"
      className="fixed bottom-24 right-6 z-50 flex w-96 flex-col rounded-xl border border-gray-200 bg-white shadow-2xl"
      role="dialog"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">FleetGraph</span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
            {entryResponse?.entry.current.documentType ?? 'loading'}
          </span>
        </div>
        <button
          aria-label="Close FleetGraph panel"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={onClose}
          type="button"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto p-4">
        {/* Loading state */}
        {isLoading && !entryResponse && (
          <div aria-live="polite" className="flex items-center gap-2 text-sm text-gray-500" role="status">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            Analyzing…
          </div>
        )}

        {/* Auto-analysis — always shown first, never replaced */}
        {entryResponse && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {entryResponse.entry.current.title}
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {entryResponse.summary.detail}
            </p>
          </div>
        )}

        {/* Follow-up exchanges — appended below, never replacing */}
        {followUps.map((turn, i) => (
          <div className="flex flex-col gap-2" key={i}>
            <div className="self-end rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
              {turn.question}
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
              {turn.answer}
            </div>
          </div>
        ))}
      </div>

      {/* Chat input — only shown when we have a thread to continue */}
      {threadId && (
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a follow-up…"
              ref={inputRef}
              type="text"
              value={inputValue}
            />
            <button
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={!inputValue.trim() || isSending}
              onClick={() => void handleSend()}
              type="button"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run tests**

```bash
pnpm test --filter web -- --testPathPattern="FleetGraphPanel"
```

**Step 5: Commit**

```bash
git add web/src/components/FleetGraphPanel.tsx web/src/components/FleetGraphPanel.test.tsx
git commit -m "feat(fleetgraph): add analysis panel with auto-analysis display and follow-up chat"
```

---

## Task 13: Wire FAB into Document Pages

**Files:**
- Identify document page components and add FleetGraphFab to each supported type

**Context:** The FAB needs to be mounted on sprint, issue, project, and week document pages. The component auto-fetches entry context so it needs the current document's ID, type, title, workspace, and user ID — all of which are available from the document page's existing data.

**Step 1: Find document page components**

```bash
cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/awesome-euler
grep -r "document_type.*sprint\|documentType.*sprint" web/src --include="*.tsx" -l
grep -r "useDocumentContextQuery\|DocumentContext" web/src --include="*.tsx" -l | head -20
```

**Step 2: For each supported document page, add the FAB**

The pattern is the same for each page. Find the return statement and add `FleetGraphFab` before the closing tag:

```tsx
import { FleetGraphFab } from '@/components/FleetGraphFab'

// Inside the component, after your existing data hooks:
const { data: documentContext } = useDocumentContextQuery(documentId)
const { user } = useCurrentUser()
const { workspaceId } = useWorkspace()

// In the JSX return, at the end before the closing fragment:
{documentContext && user && workspaceId && (
  <FleetGraphFab
    context={documentContext}
    documentId={documentId}
    documentTitle={document.title}
    documentType={document.document_type}
    userId={user.id}
    workspaceId={workspaceId}
  />
)}
```

**Step 3: Verify FAB appears in dev server**

```bash
pnpm dev
```

Navigate to a sprint page — FAB should appear in the bottom-right corner.

**Step 4: Commit**

```bash
git add web/src/
git commit -m "feat(fleetgraph): wire FleetGraphFab into document pages (sprint, issue, project, week)"
```

---

## Task 14: Full Integration Smoke Test

**Context:** Verify the full loop works end-to-end against a running Ship instance with real data. This is not an automated test — it's a manual verification checklist.

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Verify environment variables are set**

```bash
# Required for FleetGraph to work:
# FLEETGRAPH_ENTRY_ENABLED=true
# FLEETGRAPH_LLM_PROVIDER=openai (or bedrock-anthropic)
# OPENAI_API_KEY=... (if using openai)
# LANGSMITH_API_KEY=... (for tracing)
# LANGSMITH_PROJECT=fleetgraph-dev
```

**Step 3: Manual verification checklist**

- [ ] Navigate to a sprint page — FAB appears bottom-right
- [ ] Badge appears within 10 seconds if there are findings
- [ ] Click FAB — panel opens with analysis text (not blank)
- [ ] Panel shows sprint title and document type
- [ ] Type a follow-up question — response appends below analysis (does not replace it)
- [ ] Navigate to a wiki page — FAB does not appear
- [ ] Check LangSmith — two traces visible showing different execution paths (one with deep context, one without)

**Step 4: Commit if any fixes needed from smoke test**

```bash
git add -A
git commit -m "fix(fleetgraph): integration fixes from smoke test"
```

---

## Summary: What This Plan Delivers

| Capability | Before | After |
|---|---|---|
| Graph reasoning | Stubbed (`candidateCount: 1` hack) | Real LLM analysis per document |
| Context in graph | None — graph gets only IDs | Full document + children fetched |
| Depth escalation | Not implemented | Reasoning node requests, fetch_deep delivers |
| Multi-turn conversation | Not implemented | Checkpointed sessions via MemorySaver |
| Action proposals | Pre-set approval flow | LLM proposes, HITL gate executes |
| UI | No FAB or panel | Context-aware FAB + analysis panel |
| LangSmith traces | Same path every run | Different paths: quiet/reasoned/deep/approval |
| MVP detection types | week_start_drift | week_start_drift + LLM reasoning for any document type |
