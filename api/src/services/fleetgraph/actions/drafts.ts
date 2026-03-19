import type { FleetGraphRequestedAction } from '../contracts/actions.js'
import type { ProposedAction } from '../graph/types-v2.js'
import {
  buildActionId,
  getActionDefinition,
  type FleetGraphActionDraft,
  type FleetGraphActionType,
  type FleetGraphDialogSpec,
  type FleetGraphDialogSubmission,
  type FleetGraphTargetType,
} from './registry.js'

function normalizeTargetType(targetType: string): FleetGraphTargetType | null {
  switch (targetType) {
    case 'document':
    case 'issue':
    case 'person':
    case 'project':
    case 'sprint':
      return targetType
    case 'week':
      return 'sprint'
    default:
      return null
  }
}

function toLegacyTargetType(targetType: FleetGraphTargetType) {
  return targetType === 'issue' ? 'document' : targetType
}

function inferActionTypeFromPath(
  path: string,
  method: string
): FleetGraphActionType | null {
  const candidates: FleetGraphActionType[] = [
    'start_week',
    'approve_week_plan',
    'approve_project_plan',
    'assign_owner',
    'assign_issues',
    'post_comment',
    'post_standup',
    'escalate_risk',
    'rebalance_load',
  ]

  for (const actionType of candidates) {
    const definition = getActionDefinition(actionType)
    if (definition?.endpointPattern.test(path)) {
      return actionType
    }
  }

  if (method === 'POST' && path.startsWith('/api/standups')) {
    return 'post_standup'
  }

  return null
}

export function buildEmptyDialogSubmission(
  actionId: string
): FleetGraphDialogSubmission {
  return {
    actionId,
    values: {},
  }
}

export function actionDraftFromRequestedAction(
  action: FleetGraphRequestedAction
): FleetGraphActionDraft | undefined {
  const targetType = normalizeTargetType(action.targetType)
  if (!targetType) {
    return undefined
  }

  return {
    actionId: buildActionId(action.type, action.targetId),
    actionType: action.type,
    contextHints: {
      endpoint: action.endpoint,
      legacySummary: action.summary,
      legacyTitle: action.title,
    },
    evidence: action.evidence,
    rationale: action.rationale,
    targetId: action.targetId,
    targetType,
  }
}

export function actionDraftFromProposedAction(
  action: ProposedAction,
  evidence: string[]
): FleetGraphActionDraft | undefined {
  const targetType = normalizeTargetType(action.targetEntity.type)
  const actionType = action.actionType
    ?? inferActionTypeFromPath(action.endpoint.path, action.endpoint.method)

  if (!targetType || !actionType) {
    return undefined
  }

  return {
    actionId: buildActionId(actionType, action.targetEntity.id),
    actionType,
    contextHints: {
      endpoint: action.endpoint,
      findingFingerprint: action.findingFingerprint,
      targetName: action.targetEntity.name,
    },
    evidence,
    rationale: action.safetyRationale,
    targetId: action.targetEntity.id,
    targetType,
  }
}

export function requestedActionFromActionDraft(
  draft: FleetGraphActionDraft,
  dialogSpec?: FleetGraphDialogSpec
): FleetGraphRequestedAction | undefined {
  const definition = getActionDefinition(draft.actionType)
  if (!definition) {
    return undefined
  }

  const spec = dialogSpec ?? definition.buildDialogSpec(draft, {})
  const submission = buildEmptyDialogSubmission(draft.actionId)
  const validation = definition.validateSubmission(submission, spec)
  if (!validation.valid) {
    return undefined
  }

  const endpoint = definition.buildExecutionPlan(draft, submission).endpoints[0]
  if (!endpoint) {
    return undefined
  }

  return {
    endpoint: {
      method: endpoint.method,
      path: endpoint.path,
    },
    evidence: draft.evidence,
    rationale: draft.rationale,
    summary: spec.summary,
    targetId: draft.targetId,
    targetType: toLegacyTargetType(draft.targetType),
    title: spec.title,
    type: draft.actionType,
  }
}
