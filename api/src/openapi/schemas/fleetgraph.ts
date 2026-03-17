import { z, registry } from '../registry.js'

import {
  FleetGraphDeploymentReadinessResponseSchema,
} from '../../services/fleetgraph/deployment/index.js'
import {
  FleetGraphActionEndpointSchema,
  FleetGraphApprovalEnvelopeSchema,
  FleetGraphEntryRequestSchema,
  FleetGraphEntryResponseSchema,
  FleetGraphEntryRunSchema,
  FleetGraphRequestedActionSchema,
} from '../../services/fleetgraph/entry/index.js'
import {
  FleetGraphFindingLifecycleResponseSchema,
  FleetGraphFindingListResponseSchema,
  FleetGraphSnoozeRequestSchema,
} from '../../services/fleetgraph/findings/index.js'

registry.register('FleetGraphRequestedAction', FleetGraphRequestedActionSchema.openapi('FleetGraphRequestedAction'))
registry.register('FleetGraphActionEndpoint', FleetGraphActionEndpointSchema.openapi('FleetGraphActionEndpoint'))
registry.register('FleetGraphApprovalEnvelope', FleetGraphApprovalEnvelopeSchema.openapi('FleetGraphApprovalEnvelope'))
registry.register('FleetGraphEntryRun', FleetGraphEntryRunSchema.openapi('FleetGraphEntryRun'))
registry.register('FleetGraphEntryRequest', FleetGraphEntryRequestSchema.openapi('FleetGraphEntryRequest'))
registry.register('FleetGraphEntryResponse', FleetGraphEntryResponseSchema.openapi('FleetGraphEntryResponse'))
registry.register('FleetGraphDeploymentReadinessResponse', FleetGraphDeploymentReadinessResponseSchema.openapi('FleetGraphDeploymentReadinessResponse'))
registry.register('FleetGraphFindingListResponse', FleetGraphFindingListResponseSchema.openapi('FleetGraphFindingListResponse'))
registry.register('FleetGraphFindingLifecycleResponse', FleetGraphFindingLifecycleResponseSchema.openapi('FleetGraphFindingLifecycleResponse'))
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
