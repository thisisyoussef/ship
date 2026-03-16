import { describe, expect, it } from 'vitest';

import { createFleetGraphRuntime } from './runtime.js';

describe('createFleetGraphRuntime', () => {
  it('rejects missing required fields from the shared state schema', async () => {
    const runtime = createFleetGraphRuntime();

    await expect(
      runtime.invoke({
        mode: 'proactive',
        threadId: 'thread-missing-workspace',
        trigger: 'scheduled-sweep',
      })
    ).rejects.toThrow(/workspaceId/i);
  });

  it('routes quiet and problem runs through distinct paths and checkpoints', async () => {
    const runtime = createFleetGraphRuntime();

    const quiet = await runtime.invoke({
      mode: 'proactive',
      threadId: 'thread-quiet',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    });
    const problem = await runtime.invoke({
      candidateCount: 2,
      mode: 'proactive',
      threadId: 'thread-problem',
      trigger: 'event',
      workspaceId: 'workspace-123',
    });

    expect(quiet).toMatchObject({
      branch: 'quiet',
      checkpointNamespace: 'fleetgraph',
      outcome: 'quiet',
      path: [
        'resolve_trigger_context',
        'determine_branch',
        'quiet_exit',
      ],
      routeSurface: 'workspace-sweep',
    });
    expect(problem).toMatchObject({
      branch: 'reasoned',
      checkpointNamespace: 'fleetgraph',
      outcome: 'advisory',
      path: [
        'resolve_trigger_context',
        'determine_branch',
        'reason_and_deliver',
      ],
      routeSurface: 'workspace-sweep',
    });

    const quietCheckpoint = await runtime.getState('thread-quiet');
    const problemCheckpoint = await runtime.getState('thread-problem');

    expect(quietCheckpoint).toMatchObject({
      values: expect.objectContaining({
        branch: 'quiet',
        threadId: 'thread-quiet',
      }),
    });
    expect(problemCheckpoint).toMatchObject({
      values: expect.objectContaining({
        branch: 'reasoned',
        threadId: 'thread-problem',
      }),
    });
  });

  it('routes on-demand runs through the reasoned path by default', async () => {
    const runtime = createFleetGraphRuntime();

    const response = await runtime.invoke({
      documentId: 'doc-123',
      mode: 'on_demand',
      threadId: 'thread-doc',
      trigger: 'document-context',
      workspaceId: 'workspace-123',
    });

    expect(response).toMatchObject({
      branch: 'reasoned',
      outcome: 'advisory',
      path: [
        'resolve_trigger_context',
        'determine_branch',
        'reason_and_deliver',
      ],
      routeSurface: 'document-page',
    });
  });
});
