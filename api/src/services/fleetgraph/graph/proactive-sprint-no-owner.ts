import { task } from '@langchain/langgraph'

import type { LLMAdapter } from '../llm/index.js'
import {
  buildSprintNoOwnerFindingDraft,
  buildSprintNoOwnerFindingKey,
  selectSprintNoOwnerCandidate,
  type SprintNoOwnerCandidate,
} from '../proactive/sprint-no-owner.js'
import type { FleetGraphShipApiClient } from '../proactive/types.js'
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

interface SprintNoOwnerScenarioDeps {
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

function buildSummaryPrompt(candidate: SprintNoOwnerCandidate) {
  return JSON.stringify({
    issueCount: candidate.week.issue_count,
    sprintNumber: candidate.week.sprint_number,
    startDate: candidate.startDate.toISOString().slice(0, 10),
    status: candidate.week.status,
    weekName: candidate.week.name,
    weekStatus: candidate.week.status,
  })
}

function buildQuietResult(): FleetGraphScenarioResult {
  return {
    branch: 'quiet',
    evidence: [],
    metadata: {},
    scenario: 'sprint_no_owner',
    score: 0,
  }
}

export function createSprintNoOwnerScenarioRunner(
  deps: SprintNoOwnerScenarioDeps
) {
  const listActiveFindingsTask = task(
    'fleetgraph.proactive.sprint_no_owner.list_active_findings',
    async (workspaceId: string) => deps.findings.listActiveFindings({ workspaceId })
  )
  const listWeeksTask = task(
    'fleetgraph.proactive.sprint_no_owner.list_weeks',
    async () => deps.shipClient.listWeeks()
  )
  const resolveFindingTask = task(
    'fleetgraph.proactive.sprint_no_owner.resolve_finding',
    async (input: { findingKey: string; nowIso: string }) =>
      deps.findings.resolveFinding(input.findingKey, new Date(input.nowIso))
  )
  const traceSprintNoOwnerTask = task(
    'fleetgraph.proactive.trace_sprint_no_owner',
    async (input: {
      candidate: SprintNoOwnerCandidate
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
              'State why this sprint needs a named owner and missing accountability is risky without inventing missing facts.',
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

  return async function runSprintNoOwnerScenario(
    state: FleetGraphRuntimeInput
  ): Promise<FleetGraphScenarioResult> {
    const activeFindings = await listActiveFindingsTask(state.workspaceId)
    const weeks = await listWeeksTask()
    const candidate = selectSprintNoOwnerCandidate(
      excludePreservedDemoWeeks(weeks, activeFindings),
      deps.now()
    )
    const candidateKey = candidate
      ? buildSprintNoOwnerFindingKey(state.workspaceId, candidate.week.id)
      : null

    const staleFindings = activeFindings.filter((finding) => (
      finding.findingType === 'sprint_no_owner'
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

    const trace = await traceSprintNoOwnerTask({
      candidate,
      routeSurface: state.routeSurface ?? 'workspace-sweep',
      workspaceId: state.workspaceId,
    })
    const draft = buildSprintNoOwnerFindingDraft(
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
      scenario: 'sprint_no_owner',
      score: 1,
      summary: draft.summary,
      title: draft.title,
      tracePublicUrl: trace.tracePublicUrl,
      traceRunId: trace.traceRunId,
    }
  }
}
