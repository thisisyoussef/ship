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

  label: 'Review week start',
  reviewTitle: 'Start this week in Ship?',
  reviewSummary: 'This week has passed its planned start, but Ship still lists it as Planning. Starting it now will unlock issue tracking and standups for the team.',
  confirmLabel: 'Start week',

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
