import { z } from 'zod';

export const FLEETGRAPH_BRANCHES = [
  'quiet',
  'reasoned',
  'approval_required',
  'fallback',
] as const;

export const FLEETGRAPH_MODES = [
  'proactive',
  'on_demand',
] as const;

export const FLEETGRAPH_OUTCOMES = [
  'quiet',
  'advisory',
  'approval_required',
  'fallback',
] as const;

export const FLEETGRAPH_TRIGGERS = [
  'document-context',
  'event',
  'scheduled-sweep',
] as const;

export type FleetGraphBranch =
  (typeof FLEETGRAPH_BRANCHES)[number];

export type FleetGraphMode =
  (typeof FLEETGRAPH_MODES)[number];

export type FleetGraphOutcome =
  (typeof FLEETGRAPH_OUTCOMES)[number];

export type FleetGraphTrigger =
  (typeof FLEETGRAPH_TRIGGERS)[number];

export const FleetGraphRuntimeInputSchema = z.object({
  approvalRequired: z.boolean().default(false),
  candidateCount: z.number().int().nonnegative().default(0),
  documentId: z.string().min(1).optional(),
  hasError: z.boolean().default(false),
  mode: z.enum(FLEETGRAPH_MODES),
  routeSurface: z.string().min(1).optional(),
  threadId: z.string().min(1),
  trigger: z.enum(FLEETGRAPH_TRIGGERS),
  workspaceId: z.string().min(1),
});

export const FleetGraphStateSchema = FleetGraphRuntimeInputSchema.extend({
  branch: z.enum(FLEETGRAPH_BRANCHES),
  checkpointNamespace: z.literal('fleetgraph'),
  outcome: z.enum(FLEETGRAPH_OUTCOMES),
  path: z.array(z.string().min(1)).min(3),
  routeSurface: z.string().min(1),
});

export type FleetGraphRuntimeInput =
  z.infer<typeof FleetGraphRuntimeInputSchema>;

export type FleetGraphState =
  z.infer<typeof FleetGraphStateSchema>;

export function parseFleetGraphRuntimeInput(
  input: unknown
): FleetGraphRuntimeInput {
  return FleetGraphRuntimeInputSchema.parse(input);
}

