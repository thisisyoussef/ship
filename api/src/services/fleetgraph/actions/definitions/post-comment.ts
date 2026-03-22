/**
 * Post Comment Action Definition
 *
 * Dialog: textarea (comment content)
 * Execution: single_request to POST /api/documents/:id/comments
 */

import crypto from 'crypto'

import {
  registerAction,
  type FleetGraphActionDefinition,
  type FleetGraphActionDraft,
  type FleetGraphDialogSpec,
  type FleetGraphDialogSubmission,
  type FleetGraphSelectOption,
} from '../registry.js'

const definition: FleetGraphActionDefinition = {
  actionType: 'post_comment',
  targetType: 'document',
  dialogKind: 'textarea',
  executionAdapter: 'single_request',

  label: 'Post comment',
  reviewTitle: 'Add a comment',
  reviewSummary: 'Add a comment to this document. The comment will be visible to all team members.',
  confirmLabel: 'Post comment',

  endpointPattern: /^\/api\/documents\/[^/]+\/comments$/,

  buildDialogSpec(
    draft: FleetGraphActionDraft,
    _options: Record<string, FleetGraphSelectOption[]>
  ): FleetGraphDialogSpec {
    return {
      kind: 'textarea',
      fields: [
        {
          type: 'textarea',
          name: 'content',
          label: 'Comment',
          placeholder: 'Write your comment...',
          required: true,
          minLength: 1,
          maxLength: 10000,
          rows: 4,
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
    const content = submission.values.content
    if (typeof content !== 'string' || content.trim().length === 0) {
      return { valid: false as const, error: 'Comment cannot be empty' }
    }

    if (content.length > 10000) {
      return { valid: false as const, error: 'Comment is too long (max 10,000 characters)' }
    }

    return { valid: true as const }
  },

  buildExecutionPlan(draft: FleetGraphActionDraft, submission: FleetGraphDialogSubmission) {
    const content = (submission.values.content as string).trim()

    return {
      adapter: 'single_request' as const,
      endpoints: [
        {
          method: 'POST' as const,
          path: `/api/documents/${draft.targetId}/comments`,
          body: {
            comment_id: crypto.randomUUID(),
            content,
          },
        },
      ],
      sequential: false,
    }
  },
}

export function registerPostCommentAction(): void {
  registerAction(definition)
}

export { definition as postCommentDefinition }
