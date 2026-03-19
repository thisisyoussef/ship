import type { LLMAdapter } from '../../llm/types.js';
import { sanitizeOnDemandActionDraft } from '../on-demand-actions.js';
import type {
  FleetGraphAnalysisFinding,
  FleetGraphContextEnvelope,
  FleetGraphConversationTurn,
  FleetGraphDepthHint,
} from '../types.js';

/* ------------------------------------------------------------------ */
/*  State shape this node reads / writes                              */
/* ------------------------------------------------------------------ */

interface ReasonState {
  analysisFindings: FleetGraphAnalysisFinding[];
  analysisText?: string;
  context?: FleetGraphContextEnvelope;
  contextSummary?: string;
  conversationHistory: FleetGraphConversationTurn[];
  fetchedData: Record<string, unknown>;
  mode: 'proactive' | 'on_demand';
  turnCount: number;
  userMessage?: string;
}

interface ReasonOutput {
  analysisFindings: FleetGraphAnalysisFinding[];
  analysisText: string;
  conversationHistory: FleetGraphConversationTurn[];
  contextSummary?: string;
  deeperContextHint?: FleetGraphDepthHint;
  needsDeeperContext: boolean;
  pendingAction?: FleetGraphAnalysisFinding['proposedAction'];
  turnCount: number;
}

interface ReasonDeps {
  llm: LLMAdapter;
}

/* ------------------------------------------------------------------ */
/*  Prompt building                                                   */
/* ------------------------------------------------------------------ */

const SYSTEM_INSTRUCTIONS = `You are FleetGraph, a project intelligence agent for Ship — a project management tool.

You analyze project data and provide actionable insights. You reason about relationships, gaps, risk, and relevance — not just summarize data.

RESPONSE FORMAT: You MUST respond with valid JSON matching this schema:
{
  "analysisText": "string — 2-4 sentence narrative analysis for the user",
  "findings": [
    {
      "title": "string — short finding title",
      "summary": "string — 1-2 sentence explanation",
      "findingType": "string — one of: stale_issue, blocker, overload, missing_update, drift, risk, insight, missing_owner, missing_standup, deadline_risk, workload_imbalance",
      "severity": "info | warning | critical",
      "actionTier": "A | B | C",
      "evidence": ["string — specific data points supporting this finding"],
      "proposedAction": null or {
        "actionType": "approve_project_plan | approve_week_plan | start_week | assign_owner | assign_issues | post_comment | post_standup | escalate_risk | rebalance_load",
        "targetId": "string — document ID to act on",
        "targetType": "project | sprint | document | person",
        "endpoint": { "method": "POST | PATCH", "path": "string — API path, MUST start with /api/" }
      }
    }
  ],
  "needsDeeperContext": false,
  "deeperContextHint": null or {
    "type": "assignee_workload | linked_documents | sprint_issues | project_members",
    "ids": ["string — IDs to fetch"]
  }
}

Action tiers:
- A = read-only insight (no mutation needed) — USE THIS when no Ship API action exists
- B = server-backed approval flow (requires human review before execution)
- C = server-backed operational action (direct mutation)

CRITICAL: Only propose actions that match one of the supported FleetGraph action types below. If the best recommendation is advisory only, use actionTier "A" with proposedAction: null.

Supported FleetGraph action types and Ship API paths (ONLY these are valid):

SPRINT/WEEK ACTIONS:
- Start a week/sprint: POST /api/weeks/{weekId}/start (actionType: start_week, targetType: sprint)
- Approve a week plan: POST /api/weeks/{weekId}/approve-plan (actionType: approve_week_plan, targetType: sprint)
- Assign issues to sprint: PATCH /api/documents/{issueId} with body {"sprint_id": sprintId} (actionType: assign_issues, targetType: sprint)

PROJECT ACTIONS:
- Approve a project plan: POST /api/projects/{projectId}/approve-plan (actionType: approve_project_plan, targetType: project)
- Escalate/respond to deadline risk: POST /api/documents/{projectId}/comments (actionType: escalate_risk, targetType: project)

DOCUMENT ACTIONS:
- Assign owner to document: PATCH /api/documents/{documentId} with body {"owner_id": personId} (actionType: assign_owner, targetType: document)
- Post comment on document: POST /api/documents/{documentId}/comments (actionType: post_comment, targetType: document)

PERSON ACTIONS:
- Post standup for person: POST /api/standups (actionType: post_standup, targetType: person)
- Rebalance workload (reassign issues): PATCH /api/documents/{issueId} with body {"assignee_id": newPersonId} (actionType: rebalance_load, targetType: person)

WHEN TO USE EACH ACTION:
- Missing owner on sprint/project/document → assign_owner
- Sprint in planning past start date → start_week
- Week/project plan needs approval → approve_week_plan / approve_project_plan
- Issues not assigned to sprint → assign_issues
- Deadline at risk, needs documented decision → escalate_risk
- Team member hasn't posted standup → post_standup (advisory, suggest they post)
- Workload imbalance detected → rebalance_load
- General observation or feedback → post_comment

If the data is insufficient to draw conclusions, set needsDeeperContext to true with a specific hint.
If everything looks healthy, return an empty findings array with a positive analysisText.
Never fabricate data. Only reference what is present in the fetched data.`;

function buildUserInput(state: ReasonState): string {
  const parts: string[] = [];

  // Context
  if (state.context) {
    parts.push(`## Current Context
- Document: ${state.context.documentTitle} (${state.context.documentType})
- Document ID: ${state.context.documentId}
- Surface: ${state.context.surface}
- Mode: ${state.mode}`);
  }

  // Fetched data
  const dataKeys = Object.keys(state.fetchedData);
  if (dataKeys.length > 0) {
    parts.push(`## Ship Data\n${JSON.stringify(state.fetchedData, null, 2)}`);
  }

  // Conversation history (last 3 turns)
  const recentTurns = state.conversationHistory.slice(-3);
  if (recentTurns.length > 0) {
    parts.push(`## Recent Conversation
${recentTurns.map((t) => `${t.role}: ${t.content}`).join('\n')}`);
  }

  // Context summary of older turns
  if (state.contextSummary) {
    parts.push(`## Earlier Context Summary\n${state.contextSummary}`);
  }

  // Current user message (follow-up turn)
  if (state.userMessage) {
    parts.push(`## User Question\n${state.userMessage}`);
  } else if (state.turnCount === 0) {
    parts.push(`## Task\nProvide an initial analysis of this ${state.context?.documentType ?? 'document'}. Identify risks, blockers, stale items, and anything that needs attention.`);
  }

  return parts.join('\n\n');
}

/* ------------------------------------------------------------------ */
/*  JSON parsing                                                      */
/* ------------------------------------------------------------------ */

interface ReasonLLMResponse {
  analysisText: string;
  deeperContextHint?: FleetGraphDepthHint | null;
  findings: FleetGraphAnalysisFinding[];
  needsDeeperContext: boolean;
}

function normalizeEndpointPath(path: string): string {
  // Ensure path starts with /api/
  if (!path.startsWith('/api/')) {
    return `/api${path.startsWith('/') ? '' : '/'}${path}`
  }
  return path
}

function sanitizeFinding(finding: FleetGraphAnalysisFinding): FleetGraphAnalysisFinding {
  if (finding.proposedAction?.endpoint?.path) {
    const proposedAction = sanitizeOnDemandActionDraft({
      ...finding.proposedAction,
      evidence: finding.evidence,
      endpoint: {
        ...finding.proposedAction.endpoint,
        path: normalizeEndpointPath(finding.proposedAction.endpoint.path),
      },
    })

    if (!proposedAction) {
      console.warn('[FleetGraph] Rejecting unsupported on-demand action proposal')
      return {
        ...finding,
        actionTier: 'A',
        proposedAction: undefined,
      }
    }

    return {
      ...finding,
      proposedAction,
    }
  }
  return finding
}

function parseReasonResponse(text: string): ReasonLLMResponse {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as ReasonLLMResponse;
    const findings = Array.isArray(parsed.findings) ? parsed.findings : []
    return {
      analysisText: parsed.analysisText || 'Analysis complete.',
      deeperContextHint: parsed.deeperContextHint ?? undefined,
      findings: findings.map(sanitizeFinding),
      needsDeeperContext: Boolean(parsed.needsDeeperContext),
    };
  } catch {
    // If JSON parsing fails, treat the whole response as analysis text
    return {
      analysisText: text.slice(0, 500),
      findings: [],
      needsDeeperContext: false,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Loop-depth guard                                                  */
/* ------------------------------------------------------------------ */

const MAX_FETCH_DEPTH = 2

/* ------------------------------------------------------------------ */
/*  Node factory                                                      */
/* ------------------------------------------------------------------ */

export function createReasonNode(deps: ReasonDeps) {
  return async (state: ReasonState): Promise<ReasonOutput> => {
    const input = buildUserInput(state);

    const response = await deps.llm.generate({
      input,
      instructions: SYSTEM_INSTRUCTIONS,
      maxOutputTokens: 2000,
      temperature: 0,
    });

    const parsed = parseReasonResponse(response.text);

    // Build updated conversation history
    const newTurn: FleetGraphConversationTurn = {
      content: parsed.analysisText,
      role: 'assistant',
      timestamp: new Date().toISOString(),
    };

    // If there was a user message, add it as a turn too
    const userTurn: FleetGraphConversationTurn | undefined = state.userMessage
      ? {
          content: state.userMessage,
          role: 'user',
          timestamp: new Date().toISOString(),
        }
      : undefined;

    const updatedHistory = [
      ...state.conversationHistory,
      ...(userTurn ? [userTurn] : []),
      newTurn,
    ];

    // Rolling summary: if > 6 turns, summarize older ones
    let contextSummary = state.contextSummary;
    if (updatedHistory.length > 6) {
      const olderTurns = updatedHistory.slice(0, -3);
      contextSummary = olderTurns
        .map((t) => `${t.role}: ${t.content.slice(0, 100)}`)
        .join('\n');
    }

    // Find the highest-tier action to propose
    const actionFinding = parsed.findings.find(
      (f) => f.proposedAction && (f.actionTier === 'B' || f.actionTier === 'C')
    );

    // Cap fetch-depth loops: ignore the LLM's request for deeper context once
    // we've already done MAX_FETCH_DEPTH round-trips to avoid infinite cycles.
    const allowDeeperContext = parsed.needsDeeperContext && state.turnCount < MAX_FETCH_DEPTH

    return {
      analysisFindings: parsed.findings,
      analysisText: parsed.analysisText,
      contextSummary,
      conversationHistory: updatedHistory,
      deeperContextHint: parsed.deeperContextHint ?? undefined,
      needsDeeperContext: allowDeeperContext,
      pendingAction: actionFinding?.proposedAction,
      turnCount: state.turnCount + 1,
    };
  };
}

// Export for testing
export { buildUserInput, parseReasonResponse, SYSTEM_INSTRUCTIONS };
