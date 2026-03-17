import { describe, expect, it, vi } from 'vitest';
import { createFetchDeepNode } from './fetch-deep.js';

const mockShipClient = {
  fetchChildren: vi.fn(),
  fetchDocument: vi.fn(),
  fetchMembers: vi.fn(),
  listSprintIssues: vi.fn(),
  listWeeks: vi.fn(),
};

describe('fetchDeepNode', () => {
  it('fetches members when hint type is assignee_workload', async () => {
    mockShipClient.fetchMembers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', activeIssueCount: 8 },
    ]);

    const node = createFetchDeepNode({ shipClient: mockShipClient });
    const result = await node({
      context: { workspaceId: 'ws-1', documentId: 'd', documentType: 'sprint', actorId: 'u', documentTitle: 't', surface: 's' },
      deeperContextHint: { type: 'assignee_workload', ids: ['user-1'] },
      fetchedData: {},
      needsDeeperContext: true,
    } as never);

    expect(result.fetchedData?.['deep:assignee_workload']).toEqual([
      { id: 'user-1', name: 'Alice', activeIssueCount: 8 },
    ]);
    expect(mockShipClient.fetchMembers).toHaveBeenCalledWith(['user-1'], 'ws-1');
  });

  it('fetches linked documents when hint type is linked_documents', async () => {
    mockShipClient.fetchDocument.mockResolvedValue({ id: 'proj-1', title: 'Q2 Project' });

    const node = createFetchDeepNode({ shipClient: mockShipClient });
    const result = await node({
      context: { workspaceId: 'ws-1', documentId: 'd', documentType: 'sprint', actorId: 'u', documentTitle: 't', surface: 's' },
      deeperContextHint: { type: 'linked_documents', ids: ['proj-1'] },
      fetchedData: {},
      needsDeeperContext: true,
    } as never);

    expect(result.fetchedData?.['deep:linked_documents']).toBeDefined();
    expect(Array.isArray(result.fetchedData?.['deep:linked_documents'])).toBe(true);
  });

  it('is a no-op when needsDeeperContext is false', async () => {
    const node = createFetchDeepNode({ shipClient: mockShipClient });
    mockShipClient.fetchDocument.mockClear();

    const result = await node({
      context: { workspaceId: 'ws-1', documentId: 'd', documentType: 'sprint', actorId: 'u', documentTitle: 't', surface: 's' },
      deeperContextHint: undefined,
      fetchedData: {},
      needsDeeperContext: false,
    } as never);

    expect(mockShipClient.fetchDocument).not.toHaveBeenCalled();
    expect(result.fetchedData).toEqual({});
  });
});
