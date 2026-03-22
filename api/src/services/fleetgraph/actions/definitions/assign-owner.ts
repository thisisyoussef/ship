/**
 * Assign Owner Action Definition
 *
 * Dialog: single_select (person picker)
 * Execution: document_patch to PATCH /api/documents/:id
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
  actionType: 'assign_owner',
  targetType: 'sprint',
  dialogKind: 'single_select',
  executionAdapter: 'document_patch',

  label: 'Assign week owner',
  reviewTitle: 'Select new owner for this week',
  reviewSummary: 'FleetGraph detected this week needs an owner. Select a team member to assign as owner.',
  confirmLabel: 'Assign owner',

  endpointPattern: /^\/api\/documents\/[^/]+$/,

  async hydrateOptions(context: { targetId: string; workspaceId: string }) {
    // This will be implemented to fetch team people from Ship REST
    // For now, return empty - the caller should inject options
    return {
      person_id: [],
    }
  },

  buildDialogSpec(
    draft: FleetGraphActionDraft,
    options: Record<string, FleetGraphSelectOption[]>
  ): FleetGraphDialogSpec {
    return {
      kind: 'single_select',
      fields: [
        {
          type: 'single_select',
          name: 'person_id',
          label: 'Select owner',
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
    const personId = submission.values.person_id
    if (typeof personId !== 'string' || personId.trim().length === 0) {
      return { valid: false as const, error: 'Please select an owner' }
    }

    // Verify the selected option exists in the dialog spec
    const field = dialogSpec.fields.find(f => f.name === 'person_id')
    if (field?.type === 'single_select') {
      const validOption = field.options.find(o => o.value === personId)
      if (!validOption) {
        return { valid: false as const, error: 'Invalid person selection' }
      }
    }

    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, submission: FleetGraphDialogSubmission) {
    const personId = submission.values.person_id as string
    return {
      adapter: 'document_patch' as const,
      endpoints: [
        {
          method: 'PATCH' as const,
          path: `/api/documents/${draft.targetId}`,
          body: {
            // owner_id must be at top level — the documents PATCH handler
            // extracts it as a top-level field (line 723 of documents.ts)
            // and merges it into properties automatically
            owner_id: personId,
          },
        },
      ],
      sequential: false,
    }
  },
}

export function registerAssignOwnerAction(): void {
  registerAction(definition)
}

export { definition as assignOwnerDefinition }
