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

  label: 'Assign owner',
  reviewTitle: 'Assign an owner before continuing',
  reviewSummary: 'Choose the teammate who should own this week.',
  confirmLabel: 'Assign owner',

  endpointPattern: /^\/api\/documents\/[^/]+$/,

  async hydrateOptions(context: { targetId: string; workspaceId: string }) {
    // This will be implemented to fetch team people from Ship REST
    // For now, return empty - the caller should inject options
    return {
      ownerId: [],
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
          name: 'ownerId',
          label: 'Owner',
          placeholder: 'Choose an owner',
          required: true,
          options: options.ownerId ?? [],
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
    const ownerId = submission.values.ownerId
    if (typeof ownerId !== 'string' || ownerId.trim().length === 0) {
      return { valid: false as const, error: 'Please select an owner' }
    }

    // Verify the selected option exists in the dialog spec
    const field = dialogSpec.fields.find((entry) => entry.name === 'ownerId')
    if (field?.type === 'single_select') {
      const validOption = field.options.find((option) => option.value === ownerId)
      if (!validOption) {
        return { valid: false as const, error: 'Invalid person selection' }
      }
    }

    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, submission: FleetGraphDialogSubmission) {
    const ownerId = submission.values.ownerId as string
    return {
      adapter: 'document_patch' as const,
      endpoints: [
        {
          method: 'PATCH' as const,
          path: `/api/documents/${draft.targetId}`,
          body: {
            properties: {
              owner_id: ownerId,
            },
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
