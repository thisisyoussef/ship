import { task } from '@langchain/langgraph'

import type { LLMAdapter } from '../llm/index.js'
import {
  buildUnassignedIssuesFindingDraft,
  buildUnassignedIssuesFindingKey,
  selectUnassignedIssuesCandidate,
  type UnassignedIssuesCandidate,
} from '../proactive/unassigned-issues.js'
import type { FleetGraphShipApiClient } from '../proactive/types.js'
import { calculateWeekStartDate } from '../proactive/sprint-utils.js'
import {
  runFleetGraphTrace,
  type FleetGraphTracingSettings,
  type LangSmithClientLike,
} from '../tracing/index.js'
import type { FleetGraphFindingStore } from '../findings/types.js'
import type {
  FleetGraphRuntimeInput,
  FleetGraphScenarioResult,
} from './types.js'

interface UnassignedIssuesScenarioDeps {
  findings: FleetGraphFindingStore
  llmAdapter: LLMAdapter
  now: () => Date
  shipClient: FleetGraphShipApiClient
  tracingClient?: LangSmithClientLike
  tracingSettings: FleetGraphTracingSettings
}

interface ShipWeeksResponse {
  weeks: Awaited<ReturnType<FleetGraphShipApiClient['listWeeks']>>['weeks']
  workspace_sprint_start_date: string
}

function buildSummaryPrompt(candidate: UnassignedIssuesCandidate) {
  return JSON.stringify({
    startDate: candidate.startDate.toISOString().slice(0, 10),
    sprintNumber: candidate.week.sprint_number,
    totalCount: candidate.totalCount,
    unassignedCount: candidate.unassignedCount,
    weekName: candidate.week.name,
  })
}

function buildQuietResult(): FleetGraphScenarioResult {
  return {
    branch: 'quiet',
    evidence: [],
    metadata: {},
    scenario: 'unassigned_sprint_issues',
    score: 0,
  }
}

export function createUnassignedIssuesScenarioRunner(
  deps: UnassignedIssuesScenarioDeps
) {
  const listActiveFindingsTask = task(
    'fleetgraph.proactive.unassigned_sprint_issues.list_active_findings',
    async (workspaceId: string) => deps.findings.listActiveFindings({ workspaceId })
  )
  const listWeeksTask = task(
    'fleetgraph.proactive.unassigned_sprint_issues.list_weeks',
    async () => deps.shipClient.listWeeks()
  )
  const listSprintIssuesTask = task(
    'fleetgraph.proactive.unassigned_sprint_issues.list_sprint_issues',
    async (sprintId: string) => deps.shipClient.listSprintIssues(sprintId)
  )
  const resolveFindingTask = task(
    'fleetgraph.proactive.unassigned_sprint_issues.resolve_finding',
    async (input: { findingKey: string; nowIso: string }) =>
      deps.findings.resolveFinding(input.findingKey, new Date(input.nowIso))
  )
  const traceUnassignedIssuesTask = task(
    'fleetgraph.proactive.trace_unassigned_sprint_issues',
    async (input: {
      candidate: UnassignedIssuesCandidate
      routeSurface: string
      workspaceId: string
    }) => {
      const traceResult = await runFleetGraphTrace(
        {
          adapter: deps.llmAdapter,
          context: {
            branch: 'reasoned',
            documentId: input.candidate.week.id,
            mode: 'proactive',
            outcome: 'advisory',
            routeSurface: input.routeSurface,
            trigger: 'scheduled-sweep',
            workspaceId: input.workspaceId,
          },
          request: {
            input: buildSummaryPrompt(input.candidate),
            instructions: [
              'You are FleetGraph, a PM-facing project intelligence agent.',
              'Write one concise advisory sentence under 180 characters.',
              'State why the unassigned issues in this sprint need attention without inventing missing facts.',
            ].join(' '),
          },
          settings: deps.tracingSettings,
        },
        {
          client: deps.tracingClient,
        }
      )

      return {
        summary: traceResult.result.text,
        tracePublicUrl: traceResult.trace.publicUrl,
        traceRunId: traceResult.trace.runId,
      }
    }
  )

  return async function runUnassignedIssuesScenario(
    state: FleetGraphRuntimeInput
  ): Promise<FleetGraphScenarioResult> {
    const [activeFindings, weeks] = await Promise.all([
      listActiveFindingsTask(state.workspaceId),
      listWeeksTask(),
    ])

    // Find active sprint (prefer 'active', fall back to 'planning') whose start date has passed
    const now = deps.now()
    const activeSprint = findActiveSprint(weeks as ShipWeeksResponse, now)

    if (!activeSprint) {
      const staleFindings = activeFindings.filter(
        (finding) => finding.findingType === 'unassigned_sprint_issues'
      )
      await Promise.all(
        staleFindings.map((finding) =>
          resolveFindingTask({
            findingKey: finding.findingKey,
            nowIso: now.toISOString(),
          })
        )
      )
      return buildQuietResult()
    }

    const issues = await listSprintIssuesTask(activeSprint.id)
    const candidate = selectUnassignedIssuesCandidate(weeks as ShipWeeksResponse, issues, now)

    const candidateKey = candidate
      ? buildUnassignedIssuesFindingKey(state.workspaceId, candidate.week.id)
      : null

    const staleFindings = activeFindings.filter((finding) =>
      finding.findingType === 'unassigned_sprint_issues'
      && finding.findingKey !== candidateKey
    )

    await Promise.all(
      staleFindings.map((finding) =>
        resolveFindingTask({
          findingKey: finding.findingKey,
          nowIso: now.toISOString(),
        })
      )
    )

    if (!candidate) {
      return buildQuietResult()
    }

    const trace = await traceUnassignedIssuesTask({
      candidate,
      routeSurface: state.routeSurface ?? 'workspace-sweep',
      workspaceId: state.workspaceId,
    })
    const draft = buildUnassignedIssuesFindingDraft(
      candidate,
      state.workspaceId,
      trace.summary
    )

    return {
      branch: 'reasoned',
      documentId: candidate.week.id,
      documentType: 'sprint',
      evidence: draft.evidence,
      findingKey: draft.findingKey,
      metadata: draft.metadata,
      recommendedAction: draft.recommendedAction,
      scenario: 'unassigned_sprint_issues',
      score: 1,
      summary: draft.summary,
      title: draft.title,
      tracePublicUrl: trace.tracePublicUrl,
      traceRunId: trace.traceRunId,
    }
  }
}

function findActiveSprint(
  weeks: ShipWeeksResponse,
  now: Date
): { id: string } | null {
  const eligible = weeks.weeks
    .filter((week) => week.status !== 'completed')
    .map((week) => {
      const startDate = calculateWeekStartDate(
        weeks.workspace_sprint_start_date,
        week.sprint_number
      )
      if (startDate > now) {
        return null
      }
      if (week.status === 'active' || week.status === 'planning') {
        return { id: week.id, startDate, status: week.status }
      }
      return null
    })
    .filter((entry): entry is { id: string; startDate: Date; status: 'active' | 'planning' } => entry !== null)
    .sort((left, right) => {
      if (left.status === 'active' && right.status !== 'active') return -1
      if (right.status === 'active' && left.status !== 'active') return 1
      return left.startDate.getTime() - right.startDate.getTime()
    })

  return eligible[0] ?? null
}

