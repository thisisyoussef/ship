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
  finding: FleetGraphFinding
): FleetGraphDebugFindingSnapshot {
  return {
    actionEndpoint: finding.recommendedAction?.endpoint,
    findingKey: finding.findingKey,
    id: finding.id,
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
  return {
    approvalEndpoint: result.approval?.endpoint,
    routeLabel: buildFleetGraphRouteLabel(activeTab, nestedPath),
    surfaceLabel: result.summary.surfaceLabel,
    threadId: result.entry.threadId,
    title: result.summary.title,
  };
}
