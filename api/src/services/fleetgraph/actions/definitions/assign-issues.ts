/**
 * Assign Issues Action Definition
 *
 * Dialog: composite (multi_select for issues + single_select for assignee)
 * Execution: multi_request to PATCH /api/issues/:id for each selected issue
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
  actionType: 'assign_issues',
  targetType: 'sprint',
  dialogKind: 'composite',
  executionAdapter: 'multi_request',

  label: 'Assign issues',
  reviewTitle: 'Assign unassigned issues',
  reviewSummary: 'FleetGraph detected unassigned issues in this week. Select issues and an assignee.',
  confirmLabel: 'Assign selected issues',

  endpointPattern: /^\/api\/issues\/[^/]+$/,

  async hydrateOptions(context: { targetId: string; workspaceId: string }) {
    // This will be implemented to fetch sprint issues and team people from Ship REST
    // For now, return empty - the caller should inject options
    return {
      issue_ids: [],
      person_id: [],
    }
  },

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
          label: 'Select issues to assign',
          placeholder: 'Choose issues...',
          required: true,
          minItems: 1,
          options: options.issue_ids ?? [],
        },
        {
          type: 'single_select',
          name: 'person_id',
          label: 'Assign to',
          placeholder: 'Choose a team member...',
          required: true,
          options: options.person_id ?? [],
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
    // Validate issue_ids
    const issueIds = submission.values.issue_ids
    if (!Array.isArray(issueIds) || issueIds.length === 0) {
      return { valid: false as const, error: 'Please select at least one issue' }
    }

    // Validate each issue ID is in the options
    const issueField = dialogSpec.fields.find(f => f.name === 'issue_ids')
    if (issueField?.type === 'multi_select') {
      const validIssueIds = new Set(issueField.options.map(o => o.value))
      for (const id of issueIds) {
        if (!validIssueIds.has(id)) {
          return { valid: false as const, error: 'Invalid issue selection' }
        }
      }
    }

    // Validate person_id
    const personId = submission.values.person_id
    if (typeof personId !== 'string' || personId.trim().length === 0) {
      return { valid: false as const, error: 'Please select an assignee' }
    }

    // Verify the selected person exists in the dialog spec
    const personField = dialogSpec.fields.find(f => f.name === 'person_id')
    if (personField?.type === 'single_select') {
      const validOption = personField.options.find(o => o.value === personId)
      if (!validOption) {
        return { valid: false as const, error: 'Invalid person selection' }
      }
    }

    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, submission: FleetGraphDialogSubmission) {
    const issueIds = submission.values.issue_ids as string[]
    const personId = submission.values.person_id as string

    // Create a PATCH request for each issue
    const endpoints = issueIds.map(issueId => ({
      method: 'PATCH' as const,
      path: `/api/issues/${issueId}`,
      body: {
        assignee_id: personId,
      },
    }))

    return {
      adapter: 'multi_request' as const,
      endpoints,
      // Fan-out can be parallel since each issue is independent
      sequential: false,
    }
  },
}

export function registerAssignIssuesAction(): void {
  registerAction(definition)
}

export { definition as assignIssuesDefinition }
