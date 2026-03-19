import type { FleetGraphEntryResponse } from '@/lib/fleetgraph-entry';
import type { FleetGraphFinding } from '@/lib/fleetgraph-findings';

interface FleetGraphDebugEndpoint {
  method: string;
  path: string;
}

export interface FleetGraphDebugFindingSnapshot {
  actionEndpoint?: FleetGraphDebugEndpoint;
  findingKey: string;
  id: string;
  reviewThreadId?: string;
  status: FleetGraphFinding['status'];
  threadId: string;
  title: string;
  tracePublicUrl?: string;
  updatedAt: string;
}

export interface FleetGraphDebugEntrySnapshot {
  approvalEndpoint?: FleetGraphDebugEndpoint;
  routeLabel: string;
  surfaceLabel: string;
  threadId: string;
  title: string;
}

export interface FleetGraphDebugCheckpoint {
  branch?: string;
  createdAt?: string;
  next?: string[];
  outcome?: string;
  path: string[];
  taskCount: number;
  threadId?: string;
}

export interface FleetGraphDebugInterrupt {
  id?: string;
  taskName: string;
  value?: unknown;
}

export interface FleetGraphDebugThread {
  checkpoints: FleetGraphDebugCheckpoint[];
  pendingInterrupts: FleetGraphDebugInterrupt[];
  threadId: string;
}

export interface FleetGraphDebugThreadResponse {
  threads: FleetGraphDebugThread[];
}

export function buildFleetGraphRouteLabel(activeTab?: string, nestedPath?: string) {
  const parts = ['document-page'];
  if (activeTab) {
    parts.push(activeTab);
  }
  if (nestedPath) {
    parts.push(nestedPath);
  }
  return parts.join(' / ');
}

export function buildFindingDebugSnapshot(
  finding: FleetGraphFinding,
  reviewThreadId?: string
): FleetGraphDebugFindingSnapshot {
  return {
    actionEndpoint: finding.recommendedAction?.endpoint,
    findingKey: finding.findingKey,
    id: finding.id,
    reviewThreadId,
    status: finding.status,
    threadId: finding.threadId,
    title: finding.title,
    tracePublicUrl: finding.tracePublicUrl,
    updatedAt: finding.updatedAt,
  };
}

export function buildEntryDebugSnapshot(
  result: FleetGraphEntryResponse,
  activeTab?: string,
  nestedPath?: string
): FleetGraphDebugEntrySnapshot {
  const endpoint = result.pendingApproval?.actionDraft?.contextHints?.endpoint as
    | FleetGraphDebugEndpoint
    | undefined

  return {
    approvalEndpoint: endpoint,
    routeLabel: buildFleetGraphRouteLabel(activeTab, nestedPath),
    surfaceLabel: result.entry.route.surface,
    threadId: result.entry.threadId,
    title: result.responsePayload.type === 'chat_answer'
      ? result.responsePayload.answer.text
      : result.entry.current.title,
  };
}
