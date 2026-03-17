import {
  createLLMAdapter,
  resolveLLMConfig,
  type LLMAdapter,
} from '../llm/index.js'
import type { FleetGraphState } from '../graph/types.js'
import { createFleetGraphRuntime } from '../graph/index.js'
import {
  createFleetGraphFindingStore,
  type FleetGraphFindingStore,
} from '../findings/index.js'
import {
  createLangSmithClient,
  createTracedLLMAdapter,
  resolveFleetGraphTracingSettings,
  runFleetGraphTrace,
  type FleetGraphTracingSettings,
  type LangSmithClientLike,
} from '../tracing/index.js'
import {
  buildWeekStartFindingDraft,
  buildWeekStartFindingKey,
  selectWeekStartDriftCandidate,
} from './week-start-drift.js'
import {
  createFleetGraphShipApiClient,
  resolveFleetGraphShipApiConfig,
  type FleetGraphShipApiEnv,
} from './ship-client.js'
import type { FleetGraphShipApiClient } from './types.js'

interface FleetGraphRuntimeLike {
  getState(threadId: string): Promise<unknown>
  invoke(input: unknown): Promise<FleetGraphState>
}

interface FleetGraphProactiveRuntimeDeps {
  baseRuntime?: FleetGraphRuntimeLike
  findings?: FleetGraphFindingStore
  llmAdapter?: LLMAdapter
  now?: () => Date
  shipClient?: FleetGraphShipApiClient
  tracingClient?: LangSmithClientLike
  tracingSettings?: FleetGraphTracingSettings
}

function buildSummaryPrompt(input: {
  issueCount: number
  ownerName?: string
  startDate: string
  status: string
  weekName: string
}) {
  return JSON.stringify(input)
}

export function createFleetGraphProactiveRuntime(
  deps: FleetGraphProactiveRuntimeDeps = {},
  env: FleetGraphShipApiEnv & NodeJS.ProcessEnv = process.env
): FleetGraphRuntimeLike {
  const baseRuntime = deps.baseRuntime ?? createFleetGraphRuntime()
  const findings = deps.findings ?? createFleetGraphFindingStore()
  const shipClient = deps.shipClient
    ?? createFleetGraphShipApiClient(resolveFleetGraphShipApiConfig(env))
  const tracingSettings = deps.tracingSettings
    ?? resolveFleetGraphTracingSettings(env)
  const tracingClient = deps.tracingClient
    ?? createLangSmithClient(tracingSettings)
  const llmAdapter = deps.llmAdapter
    ?? createTracedLLMAdapter(
      createLLMAdapter(resolveLLMConfig(env)),
      {
        client: tracingClient,
        settings: tracingSettings,
      }
    )
  const now = deps.now ?? (() => new Date())

  return {
    getState(threadId: string) {
      return baseRuntime.getState(threadId)
    },

    async invoke(input: unknown) {
      const stateInput = input as {
        documentId?: string
        mode: 'on_demand' | 'proactive'
        routeSurface?: string
        threadId: string
        trigger: 'document-context' | 'event' | 'scheduled-sweep'
        workspaceId: string
      }

      if (stateInput.mode !== 'proactive') {
        return baseRuntime.invoke(input)
      }

      const weeks = await shipClient.listWeeks()
      const candidate = selectWeekStartDriftCandidate(weeks, now())
      const candidateKey = candidate
        ? buildWeekStartFindingKey(stateInput.workspaceId, candidate.week.id)
        : null

      const activeFindings = await findings.listActiveFindings({
        workspaceId: stateInput.workspaceId,
      })
      for (const finding of activeFindings) {
        if (finding.findingType === 'week_start_drift' && finding.findingKey !== candidateKey) {
          await findings.resolveFinding(finding.findingKey, now())
        }
      }

      const state = await baseRuntime.invoke({
        ...stateInput,
        candidateCount: candidate ? 1 : 0,
        documentId: candidate?.week.id ?? stateInput.documentId,
      })

      if (!candidate || state.branch !== 'reasoned') {
        return state
      }

      const traceResult = await runFleetGraphTrace(
        {
          adapter: llmAdapter,
          context: {
            branch: state.branch,
            documentId: candidate.week.id,
            mode: state.mode,
            outcome: state.outcome,
            routeSurface: state.routeSurface,
            trigger: state.trigger,
            workspaceId: state.workspaceId,
          },
          request: {
            input: buildSummaryPrompt({
              issueCount: candidate.week.issue_count,
              ownerName: candidate.week.owner?.name,
              startDate: candidate.startDate.toISOString().slice(0, 10),
              status: candidate.week.status,
              weekName: candidate.week.name,
            }),
            instructions: [
              'You are FleetGraph, a PM-facing project intelligence agent.',
              'Write one concise advisory sentence under 180 characters.',
              'State why the week needs attention without inventing missing facts.',
            ].join(' '),
          },
          settings: tracingSettings,
        },
        {
          client: tracingClient,
        }
      )

      const draft = buildWeekStartFindingDraft(
        candidate,
        stateInput.workspaceId,
        traceResult.result.text
      )

      await findings.upsertFinding({
        cooldownUntil: now(),
        dedupeKey: `week-start-drift:${stateInput.workspaceId}:${candidate.week.id}`,
        documentId: candidate.week.id,
        documentType: 'sprint',
        evidence: draft.evidence,
        findingKey: draft.findingKey,
        findingType: 'week_start_drift',
        metadata: draft.metadata,
        recommendedAction: draft.recommendedAction,
        summary: draft.summary,
        threadId: state.threadId,
        title: draft.title,
        tracePublicUrl: traceResult.trace.publicUrl,
        traceRunId: traceResult.trace.runId,
        workspaceId: stateInput.workspaceId,
      }, now())

      return state
    },
  }
}
