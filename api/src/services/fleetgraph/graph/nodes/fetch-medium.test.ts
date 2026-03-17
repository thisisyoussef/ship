import { describe, expect, it, vi } from 'vitest';
import { createFetchMediumNode } from './fetch-medium.js';

const mockShipClient = {
  fetchChildren: vi.fn(),
  fetchDocument: vi.fn(),
  fetchMembers: vi.fn(),
  listSprintIssues: vi.fn(),
  listWeeks: vi.fn(),
};

describe('fetchMediumNode', () => {
  it('fetches document and children in parallel', async () => {
    mockShipClient.fetchDocument.mockResolvedValue({ id: 'sprint-1', title: 'Week 1', status: 'planning' });
    mockShipClient.fetchChildren.mockResolvedValue([
      { id: 'issue-1', title: 'Fix bug', status: 'active', assignee_id: 'user-1' },
    ]);

    const node = createFetchMediumNode({ shipClient: mockShipClient });
    const result = await node({
      context: { documentId: 'sprint-1', documentType: 'sprint', actorId: 'user-1', documentTitle: 'Week 1', surface: 'document-page', workspaceId: 'ws-1' },
      fetchedData: {},
      mode: 'on_demand',
    } as never);

    expect(result.fetchedData).toMatchObject({
      'sprint-1': { document: { id: 'sprint-1' }, children: [{ id: 'issue-1' }] },
    });
    expect(mockShipClient.fetchDocument).toHaveBeenCalledWith('sprint-1', 'sprint');
    expect(mockShipClient.fetchChildren).toHaveBeenCalledWith('sprint-1', 'sprint');
  });

  it('skips fetch if document already in fetchedData (cache hit)', async () => {
    const node = createFetchMediumNode({ shipClient: mockShipClient });
    mockShipClient.fetchDocument.mockClear();

    const result = await node({
      context: { documentId: 'sprint-1', documentType: 'sprint', actorId: 'u', documentTitle: 'W', surface: 's', workspaceId: 'ws' },
      fetchedData: { 'sprint-1': { document: { id: 'sprint-1' }, children: [] } },
      mode: 'on_demand',
    } as never);

    expect(mockShipClient.fetchDocument).not.toHaveBeenCalled();
    expect(result.fetchedData?.['sprint-1']).toBeDefined();
  });

  it('returns empty fetchedData on proactive mode', async () => {
    const node = createFetchMediumNode({ shipClient: mockShipClient });
    const result = await node({
      context: { documentId: 'sprint-1', documentType: 'sprint', actorId: 'u', documentTitle: 'W', surface: 's', workspaceId: 'ws' },
      fetchedData: {},
      mode: 'proactive',
    } as never);

    expect(result.fetchedData).toEqual({});
  });
});
