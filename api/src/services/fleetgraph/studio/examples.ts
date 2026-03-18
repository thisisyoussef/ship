import type { FleetGraphRuntimeInput } from '../graph/types.js'

export interface FleetGraphStudioExample {
  id: 'on-demand-document' | 'proactive-week-start' | 'review-thread'
  input: FleetGraphRuntimeInput
  notes: string[]
}

export function getFleetGraphStudioExamples(): FleetGraphStudioExample[] {
  return [
    {
      id: 'proactive-week-start',
      input: {
        approvalRequired: false,
        candidateCount: 0,
        contextKind: 'proactive',
        hasError: false,
        mode: 'proactive',
        threadId: 'studio-proactive-week-start',
        trigger: 'scheduled-sweep',
        workspaceId: 'workspace-demo',
      },
      notes: [
        'Uses the proactive advisory path.',
        'Replace workspaceId if you want to run against a real local workspace.',
      ],
    },
    {
      id: 'on-demand-document',
      input: {
        approvalRequired: false,
        candidateCount: 0,
        contextKind: 'entry',
        documentId: 'document-demo',
        documentTitle: 'FleetGraph Demo Project',
        documentType: 'project',
        hasError: false,
        mode: 'on_demand',
        threadId: 'studio-on-demand-document',
        trigger: 'document-context',
        workspaceId: 'workspace-demo',
      },
      notes: [
        'Uses the embedded on-demand document path.',
        'Replace documentId/documentTitle/workspaceId for a real local thread.',
      ],
    },
    {
      id: 'review-thread',
      input: {
        approvalRequired: false,
        candidateCount: 0,
        contextKind: 'finding_review',
        findingId: 'finding-demo',
        hasError: false,
        mode: 'on_demand',
        threadId: 'studio-review-thread',
        trigger: 'human-review',
        workspaceId: 'workspace-demo',
      },
      notes: [
        'Uses the interrupt/resume review path.',
        'Replace findingId and threadId with a real value from the FleetGraph debug dock.',
      ],
    },
  ]
}
