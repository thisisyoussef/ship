/**
 * Rebalance Load Action Definition
 *
 * Dialog: composite (multi_select issues + single_select new assignee)
 * Execution: parallel_requests to PATCH /api/documents/:issueId
 *
 * When workload imbalance is detected, this action allows the PM to
 * reassign issues from the overloaded team member to another person.
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
  actionType: 'rebalance_load',
  targetType: 'person',
  dialogKind: 'composite',
  executionAdapter: 'multi_request',

  label: 'Rebalance workload',
  reviewTitle: 'Reassign issues',
  reviewSummary: 'Select issues to reassign from this overloaded team member to another person.',
  confirmLabel: 'Reassign',

  endpointPattern: /^\/api\/issues\/[^/]+$/,

  buildDialogSpec(
    draft: FleetGraphActionDraft,
    options: Record<string, FleetGraphSelectOption[]>
  ): FleetGraphDialogSpec {
    return {
      kind: 'composite',
      fields: [
        {
          type: 'multi_select',
          name: 'issue_ids',
          label: 'Issues to reassign',
          options: options.issues ?? [],
          required: true,
          minItems: 1,
        },
        {
          type: 'single_select',
          name: 'new_assignee_id',
          label: 'Reassign to',
          options: options.people ?? [],
          required: true,
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
    dialogSpec: FleetGraphDialogSpec
  ) {
    const issueIds = submission.values.issue_ids
    if (!Array.isArray(issueIds) || issueIds.length === 0) {
      return { valid: false as const, error: 'Please select at least one issue to reassign' }
    }

    const issueField = dialogSpec.fields.find(f => f.name === 'issue_ids')
    if (issueField?.type === 'multi_select') {
      const validIssueIds = new Set(issueField.options.map(o => o.value))
      for (const issueId of issueIds) {
        if (!validIssueIds.has(issueId)) {
          return { valid: false as const, error: 'Invalid issue selection' }
        }
      }
    }

    const newAssigneeId = submission.values.new_assignee_id
    if (typeof newAssigneeId !== 'string' || newAssigneeId.length === 0) {
      return { valid: false as const, error: 'Please select a new assignee' }
    }

    const assigneeField = dialogSpec.fields.find(f => f.name === 'new_assignee_id')
    if (assigneeField?.type === 'single_select') {
      const validAssignee = assigneeField.options.find(o => o.value === newAssigneeId)
      if (!validAssignee) {
        return { valid: false as const, error: 'Invalid person selection' }
      }
    }

    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, submission: FleetGraphDialogSubmission) {
    const issueIds = submission.values.issue_ids as string[]
    const newAssigneeId = submission.values.new_assignee_id as string

    return {
      adapter: 'multi_request' as const,
      endpoints: issueIds.map((issueId) => ({
        method: 'PATCH' as const,
        path: `/api/issues/${issueId}`,
        body: {
          assignee_id: newAssigneeId,
        } as Record<string, unknown>,
      })),
      sequential: false,
    }
  },
}

export function registerRebalanceLoadAction(): void {
  registerAction(definition)
}

export { definition as rebalanceLoadDefinition }
