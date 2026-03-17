import type { DocumentContext } from '@/hooks/useDocumentContextQuery';

export interface FleetGraphFindingActionEndpoint {
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
}

export interface FleetGraphFindingAction {
  endpoint: FleetGraphFindingActionEndpoint;
  evidence: string[];
  rationale: string;
  summary: string;
  targetId: string;
  targetType: 'document' | 'project' | 'sprint';
  title: string;
  type: 'approve_project_plan' | 'approve_week_plan' | 'post_comment' | 'start_week';
}

export interface FleetGraphFinding {
  cooldownUntil?: string;
  dedupeKey: string;
  documentId: string;
  documentType: string;
  evidence: string[];
  findingKey: string;
  findingType: 'week_start_drift';
  id: string;
  metadata: Record<string, unknown>;
  recommendedAction?: FleetGraphFindingAction;
  snoozedUntil?: string;
  status: 'active' | 'dismissed' | 'resolved' | 'snoozed';
  summary: string;
  threadId: string;
  title: string;
  tracePublicUrl?: string;
  traceRunId?: string;
  updatedAt: string;
  workspaceId: string;
}

export interface FleetGraphFindingListResponse {
  findings: FleetGraphFinding[];
}

export interface FleetGraphFindingLifecycleResponse {
  finding: FleetGraphFinding;
}

export function buildFleetGraphFindingDocumentIds(
  currentDocumentId: string,
  context?: DocumentContext
) {
  const ids = new Set<string>([currentDocumentId]);

  context?.belongs_to.forEach((item) => {
    ids.add(item.id);
  });

  return Array.from(ids);
}
