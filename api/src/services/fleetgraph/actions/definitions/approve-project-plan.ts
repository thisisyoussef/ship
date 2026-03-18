/**
 * Approve Project Plan Action Definition
 *
 * Dialog: confirm (no inputs required)
 * Execution: single_request to POST /api/projects/:id/approve-plan
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
  actionType: 'approve_project_plan',
  targetType: 'project',
  dialogKind: 'confirm',
  executionAdapter: 'single_request',

  label: 'Review project approval',
  reviewTitle: 'Confirm before approving this project plan',
  reviewSummary: 'FleetGraph is ready to approve this project plan. Nothing changes in Ship until you confirm.',
  confirmLabel: 'Approve project plan',

  endpointPattern: /^\/api\/projects\/[^/]+\/approve-plan$/,

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
          path: `/api/projects/${draft.targetId}/approve-plan`,
        },
      ],
      sequential: false,
    }
  },
}

export function registerApproveProjectPlanAction(): void {
  registerAction(definition)
}

export { definition as approveProjectPlanDefinition }
