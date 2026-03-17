import { describe, expect, it } from 'vitest'

import { createShipContextEnvelope } from './context.js'

describe('createShipContextEnvelope', () => {
  it('preserves route surface information in the context envelope', () => {
    const envelope = createShipContextEnvelope({
      context: {
        ancestors: [
          {
            depth: 1,
            document_type: 'issue',
            id: 'issue-parent',
            ticket_number: 41,
            title: 'Parent issue',
          },
        ],
        belongs_to: [
          {
            color: '#2563eb',
            document_type: 'program',
            id: 'program-1',
            title: 'Program Alpha',
            type: 'program',
          },
          {
            color: '#16a34a',
            document_type: 'project',
            id: 'project-1',
            title: 'Project Beta',
            type: 'project',
          },
          {
            document_type: 'sprint',
            id: 'sprint-1',
            title: 'Week 12',
            type: 'sprint',
          },
        ],
        breadcrumbs: [
          { id: 'program-1', title: 'Program Alpha', type: 'program' },
          { id: 'project-1', title: 'Project Beta', type: 'project' },
          { id: 'issue-1', ticket_number: 42, title: 'Current issue', type: 'issue' },
        ],
        children: [
          {
            child_count: 0,
            document_type: 'issue',
            id: 'issue-child',
            ticket_number: 43,
            title: 'Child issue',
          },
        ],
        current: {
          document_type: 'issue',
          id: 'issue-1',
          program_id: 'program-1',
          program_name: 'Program Alpha',
          ticket_number: 42,
          title: 'Current issue',
        },
      },
      route: {
        activeTab: 'activity',
        nestedPath: ['documents', 'issue-1', 'activity'],
        surface: 'document-page',
      },
      trigger: {
        documentId: 'issue-1',
        documentType: 'issue',
        mode: 'on_demand',
        threadId: 'thread-issue-1',
        trigger: 'document-context',
        workspaceId: 'workspace-123',
      },
    })

    expect(envelope.route).toEqual({
      activeTab: 'activity',
      nestedPath: ['documents', 'issue-1', 'activity'],
      surface: 'document-page',
    })
    expect(envelope.trigger).toMatchObject({
      documentId: 'issue-1',
      mode: 'on_demand',
      trigger: 'document-context',
      workspaceId: 'workspace-123',
    })
    expect(envelope.current.relationships).toEqual({
      parentId: undefined,
      programId: 'program-1',
      projectId: 'project-1',
      sprintId: 'sprint-1',
    })
    expect(envelope.ancestors[0]).toEqual({
      childCount: undefined,
      depth: 1,
      documentType: 'issue',
      id: 'issue-parent',
      ticketNumber: 41,
      title: 'Parent issue',
    })
    expect(envelope.breadcrumbs).toEqual([
      {
        documentType: 'program',
        id: 'program-1',
        ticketNumber: undefined,
        title: 'Program Alpha',
      },
      {
        documentType: 'project',
        id: 'project-1',
        ticketNumber: undefined,
        title: 'Project Beta',
      },
      {
        documentType: 'issue',
        id: 'issue-1',
        ticketNumber: 42,
        title: 'Current issue',
      },
    ])
  })

  it('accepts nullable current program metadata from live document context payloads', () => {
    const envelope = createShipContextEnvelope({
      context: {
        ancestors: [],
        belongs_to: [],
        breadcrumbs: [
          { id: 'wiki-1', title: 'Untitled', type: 'wiki' },
        ],
        children: [],
        current: {
          document_type: 'wiki',
          id: 'wiki-1',
          program_color: null,
          program_id: null,
          program_name: null,
          title: 'Untitled',
        },
      },
      route: {
        nestedPath: [],
        surface: 'document-page',
      },
      trigger: {
        mode: 'on_demand',
        threadId: 'thread-wiki-1',
        trigger: 'document-context',
        workspaceId: 'workspace-123',
      },
    })

    expect(envelope.current.id).toBe('wiki-1')
    expect(envelope.current.relationships.programId).toBeUndefined()
    expect(envelope.current.title).toBe('Untitled')
  })
})
