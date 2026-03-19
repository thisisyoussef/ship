import type {
  FleetGraphFindingActionExecutionRecord,
  FleetGraphFindingActionStore,
} from './types.js'
import type { FleetGraphFindingStore } from '../findings/types.js'
import type { FleetGraphActionDraft, FleetGraphActionType } from './registry.js'
import type { FleetGraphStateV2 } from '../graph/state-v2.js'
import type { ReasonedFinding } from '../graph/types-v2.js'
import { requestedActionFromActionDraft } from './drafts.js'

const SUPPORTED_FINDING_TYPES = new Set([
  'approval_gap',
  'blocker_aging',
  'deadline_risk',
  'empty_active_week',
  'missing_standup',
  'sprint_no_owner',
  'unassigned_sprint_issues',
  'week_start_drift',
  'workload_imbalance',
] as const)

function buildFindingKey(reasonedFinding: ReasonedFinding) {
  return reasonedFinding.fingerprint
}

function normalizeDocumentType(targetType: string) {
  return targetType === 'week' ? 'sprint' : targetType
}

function findDraftForFinding(
  actionDrafts: FleetGraphActionDraft[],
  finding: ReasonedFinding
) {
  return actionDrafts.find((draft) =>
    draft.contextHints?.findingFingerprint === finding.fingerprint
  )
}

export interface FleetGraphV2PersistenceDeps {
  actionStore: FleetGraphFindingActionStore
  findingStore: FleetGraphFindingStore
}

export function createFleetGraphV2FindingStoreAdapter(
  deps: FleetGraphV2PersistenceDeps
) {
  return {
    async beginActionExecution(params: {
      actionType: FleetGraphActionType
      endpoint: {
        method: FleetGraphFindingActionExecutionRecord['endpoint']['method']
        path: string
      }
      findingKey?: string
      workspaceId: string
    }) {
      if (!params.findingKey) {
        return { shouldExecute: true }
      }

      const finding = await deps.findingStore.getFindingByKey(params.findingKey)
      if (!finding || finding.workspaceId !== params.workspaceId) {
        return { shouldExecute: true }
      }

      return deps.actionStore.beginExecution({
        actionType: params.actionType,
        endpoint: {
          method: params.endpoint.method,
          path: params.endpoint.path,
        },
        findingId: finding.id,
        workspaceId: finding.workspaceId,
      })
    },

    async recordActionOutcome(
      state: FleetGraphStateV2,
      snoozedUntil?: Date
    ) {
      const pendingApproval = state.pendingApproval
      if (!pendingApproval || state.mode !== 'proactive') {
        return
      }

      const findingKey = buildFindingKey(pendingApproval.reasonedFinding)
      const finding = await deps.findingStore.getFindingByKey(findingKey)
      if (!finding) {
        return
      }

      switch (state.approvalDecision) {
        case 'approved':
          if (state.actionResult?.success) {
            await deps.findingStore.resolveFinding(findingKey)
          }

          if (state.actionResult) {
            const method = (
              state.actionResult.method ?? 'POST'
            ) as FleetGraphFindingActionExecutionRecord['endpoint']['method']
            await deps.actionStore.finishExecution({
              actionType: pendingApproval.actionDraft.actionType,
              endpoint: {
                method,
                path: state.actionResult.path ?? state.actionResult.endpoint,
              },
              findingId: finding.id,
              message: state.actionResult.success
                ? `FleetGraph applied ${pendingApproval.actionDraft.actionType}.`
                : (state.actionResult.errorMessage ?? 'FleetGraph action failed.'),
              resultStatusCode: state.actionResult.statusCode,
              status: state.actionResult.success ? 'applied' : 'failed',
              workspaceId: finding.workspaceId,
            })
          }
          break
        case 'dismissed':
          await deps.findingStore.dismissFinding(finding.id, finding.workspaceId)
          break
        case 'snoozed':
          await deps.findingStore.snoozeFinding(
            finding.id,
            finding.workspaceId,
            snoozedUntil ?? new Date(Date.now() + 4 * 60 * 60 * 1000)
          )
          break
      }
    },

    async recordRunState(state: FleetGraphStateV2) {
      if (state.mode !== 'proactive') {
        return
      }

      for (const finding of state.reasonedFindings ?? []) {
        if (!SUPPORTED_FINDING_TYPES.has(finding.findingType)) {
          continue
        }

        const actionDraft = findDraftForFinding(state.actionDrafts, finding)
        await deps.findingStore.upsertFinding({
          dedupeKey: finding.fingerprint,
          documentId: state.documentId ?? finding.targetEntity.id,
          documentType: normalizeDocumentType(
            state.documentType ?? finding.targetEntity.type
          ),
          evidence: finding.evidence,
          findingKey: buildFindingKey(finding),
          findingType: finding.findingType,
          metadata: {
            severity: finding.severity,
            targetEntity: finding.targetEntity,
          },
          recommendedAction: actionDraft
            ? requestedActionFromActionDraft(actionDraft)
            : undefined,
          threadId: state.threadId,
          title: finding.title,
          summary: finding.explanation,
          traceRunId: state.runId,
          workspaceId: state.workspaceId,
        })
      }
    },
  }
}
