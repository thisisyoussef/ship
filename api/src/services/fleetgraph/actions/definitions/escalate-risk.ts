/**
 * Escalate Risk Action Definition
 *
 * Dialog: single_select (escalate, rescope, accept_risk)
 * Execution: single_request to POST /api/documents/:projectId/comments
 *
 * When a deadline risk is detected for a project, this action allows the user
 * to document their risk response decision as a comment on the project.
 */

import {
  registerAction,
  type FleetGraphActionDefinition,
  type FleetGraphActionDraft,
  type FleetGraphDialogSpec,
  type FleetGraphDialogSubmission,
  type FleetGraphSelectOption,
} from '../registry.js'

const RISK_RESPONSES = [
  {
    value: 'escalate',
    label: 'Escalate to leadership',
    template: 'Risk escalated: This project has deadline risk that requires leadership attention. Target date is approaching with significant open work remaining.',
  },
  {
    value: 'rescope',
    label: 'Rescope deliverables',
    template: 'Rescoping decision: Adjusting project scope to meet the target date. Some items will be deprioritized or moved to a follow-up phase.',
  },
  {
    value: 'accept_risk',
    label: 'Accept the risk',
    template: 'Risk accepted: Acknowledging deadline risk but proceeding with current plan. Team will work to accelerate delivery.',
  },
] as const

const definition: FleetGraphActionDefinition = {
  actionType: 'escalate_risk',
  targetType: 'project',
  dialogKind: 'single_select',
  executionAdapter: 'single_request',

  label: 'Respond to risk',
  reviewTitle: 'Deadline risk response',
  reviewSummary: 'This project has deadline risk. Choose how to respond and document your decision.',
  confirmLabel: 'Post decision',

  endpointPattern: /^\/api\/documents\/[^/]+\/comments$/,

  buildDialogSpec(
    draft: FleetGraphActionDraft,
    _options: Record<string, FleetGraphSelectOption[]>
  ): FleetGraphDialogSpec {
    return {
      kind: 'single_select',
      fields: [
        {
          type: 'single_select',
          name: 'response',
          label: 'Risk response',
          options: RISK_RESPONSES.map((r) => ({
            value: r.value,
            label: r.label,
          })),
          required: true,
        },
        {
          type: 'textarea',
          name: 'notes',
          label: 'Additional notes (optional)',
          placeholder: 'Add context or next steps...',
          required: false,
          minLength: 0,
          rows: 3,
        },
      ],
      title: this.reviewTitle,
      summary: this.reviewSummary,
      confirmLabel: this.confirmLabel,
      cancelLabel: 'Cancel',
      evidence: draft.evidence,
    }
  },

  validateSubmission(
    submission: FleetGraphDialogSubmission,
    _dialogSpec: FleetGraphDialogSpec
  ) {
    const response = submission.values.response
    if (typeof response !== 'string' || !RISK_RESPONSES.some((r) => r.value === response)) {
      return { valid: false as const, error: 'Please select a risk response' }
    }

    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, submission: FleetGraphDialogSubmission) {
    const response = submission.values.response as string
    const notes = (submission.values.notes as string | undefined)?.trim() ?? ''

    const template = RISK_RESPONSES.find((r) => r.value === response)?.template ?? ''
    const content = notes ? `${template}\n\n${notes}` : template

    return {
      adapter: 'single_request' as const,
      endpoints: [
        {
          method: 'POST' as const,
          path: `/api/documents/${draft.targetId}/comments`,
          body: {
            content,
          },
        },
      ],
      sequential: false,
    }
  },
}

export function registerEscalateRiskAction(): void {
  registerAction(definition)
}

export { definition as escalateRiskDefinition }
