import { describe, expect, it, vi } from 'vitest'

import type { FleetGraphState } from '../graph/types.js'
import { createFleetGraphProactiveRuntime } from './runtime.js'

function makeState(
  overrides: Partial<FleetGraphState> = {}
): FleetGraphState {
  return {
    approvalRequired: false,
    branch: 'quiet',
    candidateCount: 0,
    checkpointNamespace: 'fleetgraph',
    contextKind: 'proactive',
    hasError: false,
    mode: 'proactive',
    outcome: 'quiet',
    path: [
      'resolve_trigger_context',
      'select_scenarios',
      'quiet_exit',
    ],
    routeSurface: 'workspace-sweep',
    scenarioResults: [],
    threadId: 'fleetgraph:workspace-1:scheduled-sweep',
    trigger: 'scheduled-sweep',
    workspaceId: 'workspace-1',
    ...overrides,
  }
}

describe('FleetGraph proactive runtime', () => {
  it('adds proactive context before delegating workspace sweeps', async () => {
    const baseRuntime = {
      getState: vi.fn(),
      invoke: vi.fn(async () => makeState()),
    }
    const runtime = createFleetGraphProactiveRuntime({
      baseRuntime,
    })

    const result = await runtime.invoke({
      mode: 'proactive',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-1',
    })

    expect(baseRuntime.invoke).toHaveBeenCalledWith({
      contextKind: 'proactive',
      mode: 'proactive',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-1',
    })
    expect(result.contextKind).toBe('proactive')
  })

  it('passes on-demand runs through unchanged', async () => {
    const baseRuntime = {
      getState: vi.fn(),
      invoke: vi.fn(async () => makeState({
        contextKind: 'entry',
        mode: 'on_demand',
        routeSurface: 'document-page',
        trigger: 'document-context',
      })),
    }
    const runtime = createFleetGraphProactiveRuntime({
      baseRuntime,
    })
    const input = {
      contextKind: 'entry' as const,
      documentId: 'doc-1',
      documentTitle: 'Launch planner',
      mode: 'on_demand' as const,
      threadId: 'fleetgraph:workspace-1:doc-1',
      trigger: 'document-context' as const,
      workspaceId: 'workspace-1',
    }

    const result = await runtime.invoke(input)

    expect(baseRuntime.invoke).toHaveBeenCalledWith(input)
    expect(result.contextKind).toBe('entry')
    expect(result.mode).toBe('on_demand')
  })
})
