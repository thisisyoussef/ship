/**
 * Start Week Action Definition
 *
 * Dialog: confirm (no inputs required)
 * Execution: single_request to POST /api/weeks/:id/start
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
  actionType: 'start_week',
  targetType: 'sprint',
  dialogKind: 'confirm',
  executionAdapter: 'single_request',

  label: 'Review and apply',
  reviewTitle: 'Confirm before starting this week',
  reviewSummary: 'FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.',
  confirmLabel: 'Start week in Ship',

  endpointPattern: /^\/api\/weeks\/[^/]+\/start$/,

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
    // Confirm dialogs require no validation
    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, _submission: FleetGraphDialogSubmission) {
    return {
      adapter: 'single_request' as const,
      endpoints: [
        {
          method: 'POST' as const,
          path: `/api/weeks/${draft.targetId}/start`,
        },
      ],
      sequential: false,
    }
  },
}

export function registerStartWeekAction(): void {
  registerAction(definition)
}

export { definition as startWeekDefinition }
