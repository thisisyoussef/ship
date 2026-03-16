import type { FleetGraphEnqueueInput } from './types.js'

function keyPart(value: string | undefined, fallback: string) {
  return value && value.trim() ? value.trim() : fallback
}

export function buildFleetGraphThreadId(input: {
  documentId?: string
  trigger: FleetGraphEnqueueInput['trigger']
  workspaceId: string
}) {
  if (input.trigger === 'scheduled-sweep') {
    return `fleetgraph:${input.workspaceId}:scheduled-sweep`
  }

  if (input.documentId) {
    return `fleetgraph:${input.workspaceId}:document:${input.documentId}`
  }

  return `fleetgraph:${input.workspaceId}:${input.trigger}`
}

export function buildFleetGraphDedupeKey(input: {
  documentId?: string
  mode: FleetGraphEnqueueInput['mode']
  routeSurface?: string
  trigger: FleetGraphEnqueueInput['trigger']
  workspaceId: string
}) {
  return [
    'fleetgraph',
    input.workspaceId,
    input.mode,
    input.trigger,
    keyPart(input.documentId, 'workspace'),
    keyPart(input.routeSurface, 'unspecified'),
  ].join(':')
}
