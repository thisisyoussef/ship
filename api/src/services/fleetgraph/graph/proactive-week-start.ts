import { task } from '@langchain/langgraph'

import type { LLMAdapter } from '../llm/index.js'
import {
  buildWeekStartFindingDraft,
  buildWeekStartFindingKey,
  selectWeekStartDriftCandidate,
} from '../proactive/week-start-drift.js'
import type {
  FleetGraphShipApiClient,
  WeekStartDriftCandidate,
} from '../proactive/types.js'
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

interface WeekStartScenarioDeps {
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

function shouldPreserveDemoFinding(metadata: Record<string, unknown> | undefined) {
  return metadata?.preserveDemoLane === true
}

function excludePreservedDemoWeeks(
  weeks: ShipWeeksResponse,
  activeFindings: Awaited<ReturnType<FleetGraphFindingStore['listActiveFindings']>>
) {
  const preservedWeekIds = new Set(
    activeFindings
      .filter((finding) => shouldPreserveDemoFinding(finding.metadata))
      .map((finding) => finding.documentId)
  )

  if (preservedWeekIds.size === 0) {
    return weeks
  }

  return {
    ...weeks,
    weeks: weeks.weeks.filter((week) => !preservedWeekIds.has(week.id)),
  }
}

function buildSummaryPrompt(candidate: WeekStartDriftCandidate) {
  return JSON.stringify({
    issueCount: candidate.week.issue_count,
    ownerName: candidate.week.owner?.name,
    startDate: candidate.startDate.toISOString().slice(0, 10),
    status: candidate.week.status,
    weekName: candidate.week.name,
  })
}

function buildQuietResult(): FleetGraphScenarioResult {
  return {
    branch: 'quiet',
    evidence: [],
    metadata: {},
    scenario: 'week_start_drift',
    score: 0,
  }
}

export function createWeekStartDriftScenarioRunner(
  deps: WeekStartScenarioDeps
) {
  const listActiveFindingsTask = task(
    'fleetgraph.proactive.list_active_findings',
    async (workspaceId: string) => deps.findings.listActiveFindings({ workspaceId })
  )
  const listWeeksTask = task(
    'fleetgraph.proactive.list_weeks',
    async () => deps.shipClient.listWeeks()
  )
  const resolveFindingTask = task(
    'fleetgraph.proactive.resolve_finding',
    async (input: { findingKey: string; nowIso: string }) =>
      deps.findings.resolveFinding(input.findingKey, new Date(input.nowIso))
  )
  const traceWeekStartTask = task(
    'fleetgraph.proactive.trace_week_start',
    async (input: {
      candidate: WeekStartDriftCandidate
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
              'State why the week needs attention without inventing missing facts.',
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

  return async function runWeekStartDriftScenario(
    state: FleetGraphRuntimeInput
  ): Promise<FleetGraphScenarioResult> {
    const activeFindings = await listActiveFindingsTask(state.workspaceId)
    const weeks = await listWeeksTask()
    const candidate = selectWeekStartDriftCandidate(
      excludePreservedDemoWeeks(weeks, activeFindings),
      deps.now()
    )
    const candidateKey = candidate
      ? buildWeekStartFindingKey(state.workspaceId, candidate.week.id)
      : null

    const staleFindings = activeFindings.filter((finding) => (
      finding.findingType === 'week_start_drift'
      && finding.findingKey !== candidateKey
      && !shouldPreserveDemoFinding(finding.metadata)
    ))

    await Promise.all(
      staleFindings.map((finding) =>
        resolveFindingTask({
          findingKey: finding.findingKey,
          nowIso: deps.now().toISOString(),
        })
      )
    )

    if (!candidate) {
      return buildQuietResult()
    }

    const trace = await traceWeekStartTask({
      candidate,
      routeSurface: state.routeSurface ?? 'workspace-sweep',
      workspaceId: state.workspaceId,
    })
    const draft = buildWeekStartFindingDraft(
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
      scenario: 'week_start_drift',
      score: 1,
      summary: draft.summary,
      title: draft.title,
      tracePublicUrl: trace.tracePublicUrl,
      traceRunId: trace.traceRunId,
    }
  }
}
