/**
 * Post Standup Action Definition
 *
 * Dialog: textarea (standup content) - optional since the standup template has sections
 * Execution: single_request to POST /api/standups with today's date
 *
 * When a missing standup is detected for a user, this action creates/opens
 * a standup document for today. The POST /api/standups endpoint is idempotent
 * and will return the existing standup if one already exists for today.
 */

import {
  registerAction,
  type FleetGraphActionDefinition,
  type FleetGraphActionDraft,
  type FleetGraphDialogSpec,
  type FleetGraphDialogSubmission,
  type FleetGraphSelectOption,
} from '../registry.js'

function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10) // YYYY-MM-DD
}

const definition: FleetGraphActionDefinition = {
  actionType: 'post_standup',
  targetType: 'person',
  dialogKind: 'confirm', // Simple confirmation since standup has a template
  executionAdapter: 'single_request',

  label: 'Open standup',
  reviewTitle: 'Create today\'s standup',
  reviewSummary: 'Creates a standup document for today. You can fill in your updates after it\'s created.',
  confirmLabel: 'Create standup',

  endpointPattern: /^\/api\/standups$/,

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
      cancelLabel: 'Not now',
      evidence: draft.evidence,
    }
  },

  validateSubmission(
    _submission: FleetGraphDialogSubmission,
    _dialogSpec: FleetGraphDialogSpec
  ) {
    // No validation needed for confirmation dialog
    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, _submission: FleetGraphDialogSubmission) {
    return {
      adapter: 'single_request' as const,
      endpoints: [
        {
          method: 'POST' as const,
          path: '/api/standups',
          body: {
            date: getTodayDateString(),
          },
        },
      ],
      sequential: false,
    }
  },
}

export function registerPostStandupAction(): void {
  registerAction(definition)
}

export { definition as postStandupDefinition }
