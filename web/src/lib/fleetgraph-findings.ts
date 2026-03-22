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

export interface FleetGraphFindingActionExecution {
  actionType: 'start_week';
  appliedAt?: string;
  attemptCount: number;
  endpoint: FleetGraphFindingActionEndpoint;
  findingId: string;
  message: string;
  resultStatusCode?: number;
  status: 'pending' | 'applied' | 'already_applied' | 'failed';
  updatedAt: string;
}

export interface FleetGraphFindingReview {
  cancelLabel: string;
  confirmLabel: string;
  evidence: string[];
  summary: string;
  threadId: string;
  title: string;
}

export interface FleetGraphFinding {
  actionExecution?: FleetGraphFindingActionExecution;
  cooldownUntil?: string;
  dedupeKey: string;
  documentId: string;
  documentType: string;
  evidence: string[];
  findingKey: string;
  findingType: 'sprint_no_owner' | 'unassigned_sprint_issues' | 'week_start_drift';
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

export interface FleetGraphFindingReviewResponse {
  finding: FleetGraphFinding;
  review: FleetGraphFindingReview;
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
