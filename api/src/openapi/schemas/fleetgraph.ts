import { z, registry } from '../registry.js'

import {
  FleetGraphDeploymentReadinessResponseSchema,
} from '../../services/fleetgraph/deployment/index.js'
import {
  FleetGraphEntryRequestSchema,
} from '../../services/fleetgraph/entry/index.js'
import {
  FleetGraphActionDraftSchema,
  FleetGraphDialogSpecSchema,
  FleetGraphDialogSubmissionSchema,
  FleetGraphHttpMethodSchema,
} from '../../services/fleetgraph/actions/registry.js'
import {
  FleetGraphFindingLifecycleResponseSchema,
  FleetGraphFindingListResponseSchema,
  FleetGraphProactiveFindingSchema,
  FleetGraphSnoozeRequestSchema,
} from '../../services/fleetgraph/findings/index.js'
import {
  FleetGraphV2ResumeInputSchema,
  FleetGraphV2RuntimeInputSchema,
} from '../../services/fleetgraph/graph/types-v2.js'

const nonEmptyString = z.string().min(1)

const FleetGraphEntityLinkSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  type: nonEmptyString,
}).strict()

const FleetGraphChatAnswerSchema = z.object({
  entityLinks: z.array(FleetGraphEntityLinkSchema),
  relatedContextSummary: z.string().optional(),
  suggestedNextSteps: z.array(nonEmptyString),
  text: z.string(),
}).strict()

const FleetGraphInsightCardActionSchema = z.object({
  action: z.enum(['apply', 'dismiss', 'snooze', 'view_evidence']),
  label: nonEmptyString,
  requiresApproval: z.boolean().optional(),
}).strict()

const FleetGraphInsightCardSchema = z.object({
  actionButtons: z.array(FleetGraphInsightCardActionSchema),
  body: z.string(),
  findingFingerprint: nonEmptyString,
  id: nonEmptyString,
  severityBadge: z.enum(['critical', 'info', 'warning']),
  targetPerson: z.object({
    id: nonEmptyString,
    name: nonEmptyString,
  }).strict().optional(),
  title: nonEmptyString,
}).strict()

const FleetGraphResponsePayloadSchema = z.discriminatedUnion('type', [
  z.object({
    answer: FleetGraphChatAnswerSchema,
    type: z.literal('chat_answer'),
  }).strict(),
  z.object({
    disclaimer: z.string(),
    partialAnswer: FleetGraphChatAnswerSchema.optional(),
    type: z.literal('degraded'),
  }).strict(),
  z.object({
    type: z.literal('empty'),
  }).strict(),
  z.object({
    cards: z.array(FleetGraphInsightCardSchema),
    type: z.literal('insight_cards'),
  }).strict(),
])

const FleetGraphReasonedFindingSchema = z.object({
  affectedPerson: z.object({
    id: nonEmptyString,
    name: nonEmptyString,
  }).strict().optional(),
  deadline: z.string().optional(),
  evidence: z.array(nonEmptyString),
  explanation: z.string(),
  findingType: nonEmptyString,
  fingerprint: nonEmptyString,
  severity: z.enum(['critical', 'info', 'warning']),
  targetEntity: z.object({
    id: nonEmptyString,
    name: nonEmptyString,
    type: nonEmptyString,
  }).strict(),
  title: nonEmptyString,
}).strict()

const FleetGraphPendingApprovalSchema = z.object({
  actionDraft: FleetGraphActionDraftSchema.nullish(),
  dialogSpec: FleetGraphDialogSpecSchema.nullish(),
  id: nonEmptyString.optional(),
  summary: z.string().optional(),
  title: z.string().optional(),
  validationError: z.string().optional(),
}).strict()

const FleetGraphThreadResponseSchema = z.object({
  actionDrafts: z.array(FleetGraphActionDraftSchema),
  branch: z.enum(['action_required', 'advisory', 'fallback', 'quiet']),
  contextSummary: z.string().nullable().optional(),
  fallbackStage: z.enum(['input', 'fetch', 'scoring']).nullable().optional(),
  path: z.array(nonEmptyString),
  pendingApproval: FleetGraphPendingApprovalSchema.nullish(),
  reasonedFindings: z.array(FleetGraphReasonedFindingSchema),
  responsePayload: FleetGraphResponsePayloadSchema,
  threadId: nonEmptyString,
  turnCount: z.number().int().nonnegative().optional(),
}).strict()

const FleetGraphEntryResponseSchema = FleetGraphThreadResponseSchema.extend({
  entry: z.object({
    current: z.object({
      documentType: nonEmptyString,
      id: nonEmptyString,
      title: z.string(),
    }).strict(),
    route: z.object({
      activeTab: nonEmptyString.optional(),
      nestedPath: z.array(nonEmptyString),
      surface: nonEmptyString,
    }).strict(),
    threadId: nonEmptyString,
  }).strict(),
}).strict()

const FleetGraphActionResultSchema = z.object({
  endpoint: nonEmptyString,
  errorMessage: z.string().optional(),
  executedAt: z.string(),
  method: FleetGraphHttpMethodSchema.optional(),
  path: nonEmptyString.optional(),
  responseBody: z.unknown().optional(),
  statusCode: z.number().int(),
  success: z.boolean(),
}).strict()

const FleetGraphThreadActionReviewResponseSchema = z.object({
  actionDraft: FleetGraphActionDraftSchema,
  dialogSpec: FleetGraphDialogSpecSchema,
  threadId: nonEmptyString,
  validationError: z.string().optional(),
}).strict()

const FleetGraphThreadActionApplyRequestSchema = z.object({
  dialogSubmission: z.object({
    values: FleetGraphDialogSubmissionSchema.shape.values,
  }).strict().optional(),
  values: FleetGraphDialogSubmissionSchema.shape.values.optional(),
}).strict()

const FleetGraphThreadActionApplyResponseSchema = z.object({
  actionDraft: FleetGraphActionDraftSchema,
  actionResult: FleetGraphActionResultSchema,
  approvalDecision: z.enum(['approved', 'dismissed', 'snoozed']).nullable().optional(),
  responsePayload: FleetGraphResponsePayloadSchema.nullish(),
  threadId: nonEmptyString,
}).strict()

const FleetGraphAnalyzeRequestSchema = z.object({
  documentId: nonEmptyString,
  documentType: nonEmptyString,
}).strict()

const FleetGraphTurnRequestSchema = z.object({
  message: nonEmptyString,
}).strict()

const FleetGraphFindingReviewSchema = z.object({
  cancelLabel: z.string().min(1),
  confirmLabel: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  summary: z.string().min(1),
  threadId: z.string().min(1),
  title: z.string().min(1),
}).strict()

const FleetGraphFindingReviewResponseSchema = z.object({
  finding: FleetGraphProactiveFindingSchema,
  review: FleetGraphFindingReviewSchema,
}).strict()

const FleetGraphInterruptSummarySchema = z.object({
  id: z.string().min(1).optional(),
  taskName: z.string().min(1),
  value: z.unknown().optional(),
}).strict()

const FleetGraphDebugCheckpointSchema = z.object({
  branch: z.string().min(1).optional(),
  createdAt: z.string().optional(),
  fallbackStage: z.enum(['input', 'fetch', 'scoring']).optional(),
  next: z.array(z.string().min(1)),
  outcome: z.string().min(1).optional(),
  path: z.array(z.string().min(1)),
  taskCount: z.number().int().nonnegative(),
  threadId: z.string().min(1).optional(),
}).strict()

const FleetGraphDebugThreadsResponseSchema = z.object({
  threads: z.array(z.object({
    checkpoints: z.array(FleetGraphDebugCheckpointSchema),
    pendingInterrupts: z.array(FleetGraphInterruptSummarySchema),
    threadId: z.string().min(1),
  }).strict()),
}).strict()

const FleetGraphV2StateResponseSchema = z.object({
  tasks: z.array(z.unknown()),
  threadId: nonEmptyString,
  values: z.unknown(),
}).strict()

registry.register('FleetGraphActionDraft', FleetGraphActionDraftSchema.openapi('FleetGraphActionDraft'))
registry.register('FleetGraphDialogSpec', FleetGraphDialogSpecSchema.openapi('FleetGraphDialogSpec'))
registry.register('FleetGraphResponsePayload', FleetGraphResponsePayloadSchema.openapi('FleetGraphResponsePayload'))
registry.register('FleetGraphReasonedFinding', FleetGraphReasonedFindingSchema.openapi('FleetGraphReasonedFinding'))
registry.register('FleetGraphPendingApproval', FleetGraphPendingApprovalSchema.openapi('FleetGraphPendingApproval'))
registry.register('FleetGraphThreadResponse', FleetGraphThreadResponseSchema.openapi('FleetGraphThreadResponse'))
registry.register('FleetGraphEntryRequest', FleetGraphEntryRequestSchema.openapi('FleetGraphEntryRequest'))
registry.register('FleetGraphEntryResponse', FleetGraphEntryResponseSchema.openapi('FleetGraphEntryResponse'))
registry.register('FleetGraphAnalyzeRequest', FleetGraphAnalyzeRequestSchema.openapi('FleetGraphAnalyzeRequest'))
registry.register('FleetGraphTurnRequest', FleetGraphTurnRequestSchema.openapi('FleetGraphTurnRequest'))
registry.register('FleetGraphThreadActionReviewResponse', FleetGraphThreadActionReviewResponseSchema.openapi('FleetGraphThreadActionReviewResponse'))
registry.register('FleetGraphThreadActionApplyRequest', FleetGraphThreadActionApplyRequestSchema.openapi('FleetGraphThreadActionApplyRequest'))
registry.register('FleetGraphThreadActionApplyResponse', FleetGraphThreadActionApplyResponseSchema.openapi('FleetGraphThreadActionApplyResponse'))
registry.register('FleetGraphDeploymentReadinessResponse', FleetGraphDeploymentReadinessResponseSchema.openapi('FleetGraphDeploymentReadinessResponse'))
registry.register('FleetGraphFindingListResponse', FleetGraphFindingListResponseSchema.openapi('FleetGraphFindingListResponse'))
registry.register('FleetGraphFindingLifecycleResponse', FleetGraphFindingLifecycleResponseSchema.openapi('FleetGraphFindingLifecycleResponse'))
registry.register('FleetGraphFindingReview', FleetGraphFindingReviewSchema.openapi('FleetGraphFindingReview'))
registry.register('FleetGraphFindingReviewResponse', FleetGraphFindingReviewResponseSchema.openapi('FleetGraphFindingReviewResponse'))
registry.register('FleetGraphDebugThreadsResponse', FleetGraphDebugThreadsResponseSchema.openapi('FleetGraphDebugThreadsResponse'))
registry.register('FleetGraphSnoozeRequest', FleetGraphSnoozeRequestSchema.openapi('FleetGraphSnoozeRequest'))
registry.register('FleetGraphV2RuntimeInput', FleetGraphV2RuntimeInputSchema.openapi('FleetGraphV2RuntimeInput'))
registry.register('FleetGraphV2ResumeInput', FleetGraphV2ResumeInputSchema.openapi('FleetGraphV2ResumeInput'))
registry.register('FleetGraphV2StateResponse', FleetGraphV2StateResponseSchema.openapi('FleetGraphV2StateResponse'))

registry.registerPath({
  method: 'get',
  path: '/fleetgraph/ready',
  tags: ['FleetGraph'],
  summary: 'Inspect deployed FleetGraph readiness with service auth',
  description: 'Returns FleetGraph API, worker, and V2 rollout readiness for the deployed environment. Requires the X-FleetGraph-Service-Token header.',
  responses: {
    200: {
      description: 'FleetGraph deployment surfaces are ready',
      content: {
        'application/json': {
          schema: FleetGraphDeploymentReadinessResponseSchema,
        },
      },
    },
    403: {
      description: 'FleetGraph service authorization failed',
    },
    503: {
      description: 'FleetGraph deployment contract is incomplete',
      content: {
        'application/json': {
          schema: FleetGraphDeploymentReadinessResponseSchema,
        },
      },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/entry',
  tags: ['FleetGraph'],
  summary: 'Create a same-origin FleetGraph entry from the current Ship page context',
  description: 'Validates the embedded document-page context, derives a FleetGraph thread, and returns the native V2 FleetGraph response contract for the current page.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphEntryRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'FleetGraph entry created from the embedded Ship context',
      content: {
        'application/json': {
          schema: FleetGraphEntryResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid FleetGraph entry payload',
    },
    403: {
      description: 'Workspace mismatch for FleetGraph entry',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/analyze',
  tags: ['FleetGraph'],
  summary: 'Analyze the current Ship document through the native V2 runtime',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphAnalyzeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Native FleetGraph thread response for the analyzed document',
      content: {
        'application/json': {
          schema: FleetGraphThreadResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid FleetGraph analyze payload',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/thread/{threadId}/turn',
  tags: ['FleetGraph'],
  summary: 'Continue a FleetGraph thread with a follow-up user message',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphTurnRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated native FleetGraph thread response after the follow-up turn',
      content: {
        'application/json': {
          schema: FleetGraphThreadResponseSchema,
        },
      },
    },
    400: {
      description: 'Message is required',
    },
    404: {
      description: 'No active FleetGraph session found for this thread',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'get',
  path: '/fleetgraph/findings',
  tags: ['FleetGraph'],
  summary: 'List active FleetGraph proactive findings for the current Ship context',
  description: 'Returns active proactive findings for the authenticated workspace, optionally filtered to the current document and related Ship context ids.',
  responses: {
    200: {
      description: 'Active FleetGraph proactive findings',
      content: {
        'application/json': {
          schema: FleetGraphFindingListResponseSchema,
        },
      },
    },
    401: {
      description: 'Authentication required',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'get',
  path: '/fleetgraph/debug/threads',
  tags: ['FleetGraph'],
  summary: 'Inspect FleetGraph checkpoint history and pending interrupts for one or more threads',
  responses: {
    200: {
      description: 'Checkpoint history and interrupt summaries for requested FleetGraph threads',
      content: {
        'application/json': {
          schema: FleetGraphDebugThreadsResponseSchema,
        },
      },
    },
    401: {
      description: 'Authentication required',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/findings/{id}/review',
  tags: ['FleetGraph'],
  summary: 'Prepare a server-backed human review step for a FleetGraph finding action',
  responses: {
    200: {
      description: 'The FleetGraph finding plus its review payload',
      content: {
        'application/json': {
          schema: FleetGraphFindingReviewResponseSchema,
        },
      },
    },
    400: {
      description: 'Finding does not expose a valid action',
    },
    404: {
      description: 'FleetGraph finding not found',
    },
    409: {
      description: 'Finding is no longer active',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/findings/{id}/apply',
  tags: ['FleetGraph'],
  summary: 'Apply a FleetGraph finding recommendation through the Ship REST route',
  responses: {
    200: {
      description: 'Updated FleetGraph finding after the action ran',
      content: {
        'application/json': {
          schema: FleetGraphFindingLifecycleResponseSchema,
        },
      },
    },
    400: {
      description: 'Finding does not expose a valid action',
    },
    404: {
      description: 'FleetGraph finding not found',
    },
    409: {
      description: 'Finding is no longer active',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/thread/{threadId}/actions/{actionId}/review',
  tags: ['FleetGraph'],
  summary: 'Prepare a native V2 review payload for an on-demand FleetGraph action',
  responses: {
    200: {
      description: 'Review payload for a FleetGraph thread action',
      content: {
        'application/json': {
          schema: FleetGraphThreadActionReviewResponseSchema,
        },
      },
    },
    403: {
      description: 'Workspace mismatch for FleetGraph thread action',
    },
    404: {
      description: 'FleetGraph action not found on the thread',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/thread/{threadId}/actions/{actionId}/apply',
  tags: ['FleetGraph'],
  summary: 'Apply a native V2 FleetGraph thread action through the server-backed review flow',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphThreadActionApplyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Applied FleetGraph thread action outcome',
      content: {
        'application/json': {
          schema: FleetGraphThreadActionApplyResponseSchema,
        },
      },
    },
    403: {
      description: 'Workspace mismatch for FleetGraph thread action',
    },
    404: {
      description: 'FleetGraph action not found on the thread',
    },
    409: {
      description: 'FleetGraph review was dismissed or is no longer applicable',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/findings/{id}/dismiss',
  tags: ['FleetGraph'],
  summary: 'Dismiss a proactive FleetGraph finding',
  responses: {
    200: {
      description: 'Updated FleetGraph finding after dismissal',
      content: {
        'application/json': {
          schema: FleetGraphFindingLifecycleResponseSchema,
        },
      },
    },
    404: {
      description: 'FleetGraph finding not found',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/findings/{id}/snooze',
  tags: ['FleetGraph'],
  summary: 'Snooze a proactive FleetGraph finding',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphSnoozeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated FleetGraph finding after snooze',
      content: {
        'application/json': {
          schema: FleetGraphFindingLifecycleResponseSchema,
        },
      },
    },
    404: {
      description: 'FleetGraph finding not found',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/v2/invoke',
  tags: ['FleetGraph'],
  summary: 'Low-level native V2 invoke surface for debug and test workflows',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphV2RuntimeInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Native FleetGraph thread response for the requested V2 invoke input',
      content: {
        'application/json': {
          schema: FleetGraphThreadResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid V2 invoke payload',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'post',
  path: '/fleetgraph/v2/resume/{threadId}',
  tags: ['FleetGraph'],
  summary: 'Resume a native V2 FleetGraph approval thread with structured input',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphV2ResumeInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Native FleetGraph thread response after resume',
      content: {
        'application/json': {
          schema: FleetGraphThreadResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid V2 resume payload',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})

registry.registerPath({
  method: 'get',
  path: '/fleetgraph/v2/state/{threadId}',
  tags: ['FleetGraph'],
  summary: 'Inspect the raw checkpointed state for a FleetGraph V2 thread',
  responses: {
    200: {
      description: 'Checkpointed task list and state values for the requested thread',
      content: {
        'application/json': {
          schema: FleetGraphV2StateResponseSchema,
        },
      },
    },
    404: {
      description: 'FleetGraph V2 thread not found',
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
})
