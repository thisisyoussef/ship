import { z, registry } from '../registry.js'

import {
  FleetGraphDeploymentReadinessResponseSchema,
} from '../../services/fleetgraph/deployment/index.js'
import {
  FleetGraphEntryApplyRequestSchema,
  FleetGraphEntryApplyResponseSchema,
  FleetGraphApprovalEnvelopeSchema,
  FleetGraphEntryRequestSchema,
  FleetGraphEntryResponseSchema,
  FleetGraphEntryRunSchema,
} from '../../services/fleetgraph/entry/index.js'
import {
  FleetGraphActionEndpointSchema,
  FleetGraphRequestedActionSchema,
} from '../../services/fleetgraph/contracts/actions.js'
import {
  FleetGraphFindingLifecycleResponseSchema,
  FleetGraphFindingListResponseSchema,
  FleetGraphProactiveFindingSchema,
  FleetGraphSnoozeRequestSchema,
} from '../../services/fleetgraph/findings/index.js'

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

registry.register('FleetGraphRequestedAction', FleetGraphRequestedActionSchema.openapi('FleetGraphRequestedAction'))
registry.register('FleetGraphActionEndpoint', FleetGraphActionEndpointSchema.openapi('FleetGraphActionEndpoint'))
registry.register('FleetGraphApprovalEnvelope', FleetGraphApprovalEnvelopeSchema.openapi('FleetGraphApprovalEnvelope'))
registry.register('FleetGraphEntryApplyRequest', FleetGraphEntryApplyRequestSchema.openapi('FleetGraphEntryApplyRequest'))
registry.register('FleetGraphEntryApplyResponse', FleetGraphEntryApplyResponseSchema.openapi('FleetGraphEntryApplyResponse'))
registry.register('FleetGraphEntryRun', FleetGraphEntryRunSchema.openapi('FleetGraphEntryRun'))
registry.register('FleetGraphEntryRequest', FleetGraphEntryRequestSchema.openapi('FleetGraphEntryRequest'))
registry.register('FleetGraphEntryResponse', FleetGraphEntryResponseSchema.openapi('FleetGraphEntryResponse'))
registry.register('FleetGraphDeploymentReadinessResponse', FleetGraphDeploymentReadinessResponseSchema.openapi('FleetGraphDeploymentReadinessResponse'))
registry.register('FleetGraphFindingListResponse', FleetGraphFindingListResponseSchema.openapi('FleetGraphFindingListResponse'))
registry.register('FleetGraphFindingLifecycleResponse', FleetGraphFindingLifecycleResponseSchema.openapi('FleetGraphFindingLifecycleResponse'))
registry.register('FleetGraphFindingReview', FleetGraphFindingReviewSchema.openapi('FleetGraphFindingReview'))
registry.register('FleetGraphFindingReviewResponse', FleetGraphFindingReviewResponseSchema.openapi('FleetGraphFindingReviewResponse'))
registry.register('FleetGraphDebugThreadsResponse', FleetGraphDebugThreadsResponseSchema.openapi('FleetGraphDebugThreadsResponse'))
registry.register('FleetGraphSnoozeRequest', FleetGraphSnoozeRequestSchema.openapi('FleetGraphSnoozeRequest'))

registry.registerPath({
  method: 'get',
  path: '/fleetgraph/ready',
  tags: ['FleetGraph'],
  summary: 'Inspect deployed FleetGraph readiness with service auth',
  description: 'Returns FleetGraph API and worker readiness status for the deployed environment. Requires the X-FleetGraph-Service-Token header.',
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
  description: 'Validates the embedded document-page context, derives a FleetGraph thread, and returns either a contextual advisory entry or a human-review envelope for consequential actions.',
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
  path: '/fleetgraph/entry/apply',
  tags: ['FleetGraph'],
  summary: 'Apply a pending FleetGraph entry approval through the runtime review path',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FleetGraphEntryApplyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'FleetGraph resumed the pending entry approval and executed the selected action',
      content: {
        'application/json': {
          schema: FleetGraphEntryApplyResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid FleetGraph entry apply payload',
    },
    403: {
      description: 'Workspace mismatch for FleetGraph entry apply',
    },
    404: {
      description: 'No active FleetGraph approval was found for this thread',
    },
    409: {
      description: 'The FleetGraph approval is no longer waiting for confirmation',
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
  summary: 'Prepare a server-backed human review step for a FleetGraph start-week recommendation',
  responses: {
    200: {
      description: 'The FleetGraph finding plus its resumable review payload',
      content: {
        'application/json': {
          schema: FleetGraphFindingReviewResponseSchema,
        },
      },
    },
    400: {
      description: 'Finding does not expose a valid start-week action',
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
  summary: 'Apply a FleetGraph start-week recommendation through the Ship REST route',
  responses: {
    200: {
      description: 'Updated FleetGraph finding after the start-week action ran',
      content: {
        'application/json': {
          schema: FleetGraphFindingLifecycleResponseSchema,
        },
      },
    },
    400: {
      description: 'Finding does not expose a valid start-week action',
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
