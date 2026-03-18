/**
 * Approve Week Plan Action Definition
 *
 * Dialog: confirm (no inputs required)
 * Execution: single_request to POST /api/weeks/:id/approve-plan
 */

import {
  registerAction,
  type FleetGraphActionDefinition,
  type FleetGraphActionDraft,
  type FleetGraphDialogSpec,
  type FleetGraphDialogSubmission,
  type FleetGraphSelectOption,
} from '../registry.js'

const definition: FleetGraphActionDefinition = {
  actionType: 'approve_week_plan',
  targetType: 'sprint',
  dialogKind: 'confirm',
  executionAdapter: 'single_request',

  label: 'Review week approval',
  reviewTitle: 'Confirm before approving this week plan',
  reviewSummary: 'FleetGraph is ready to approve this week plan. Nothing changes in Ship until you confirm.',
  confirmLabel: 'Approve week plan',

  endpointPattern: /^\/api\/weeks\/[^/]+\/approve-plan$/,

  buildDialogSpec(
    draft: FleetGraphActionDraft,
    _options: Record<string, FleetGraphSelectOption[]>
  ): FleetGraphDialogSpec {
    return {
      kind: 'confirm',
      fields: [],
      title: this.reviewTitle,
      summary: this.reviewSummary,
      confirmLabel: this.confirmLabel,
      cancelLabel: 'Cancel',
      evidence: draft.evidence,
    }
  },

  validateSubmission(
    _submission: FleetGraphDialogSubmission,
    _dialogSpec: FleetGraphDialogSpec
  ) {
    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, _submission: FleetGraphDialogSubmission) {
    return {
      adapter: 'single_request' as const,
      endpoints: [
        {
          method: 'POST' as const,
          path: `/api/weeks/${draft.targetId}/approve-plan`,
        },
      ],
      sequential: false,
    }
  },
}

export function registerApproveWeekPlanAction(): void {
  registerAction(definition)
}

export { definition as approveWeekPlanDefinition }
