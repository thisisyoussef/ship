import { describe, expect, it } from 'vitest'

import { normalizeShipDocument } from './documents.js'

describe('normalizeShipDocument', () => {
  it('normalizes document associations and legacy project fields', () => {
    const issue = normalizeShipDocument({
      assignee_id: 'person-primary',
      belongs_to: [
        { id: 'program-1', type: 'program' },
        { id: 'project-canonical', type: 'project' },
        { id: 'sprint-1', type: 'sprint' },
        { id: 'parent-1', type: 'parent' },
      ],
      document_type: 'issue',
      id: 'issue-1',
      properties: {
        project_id: 'project-legacy',
      },
      ticket_number: 42,
      title: 'Normalization candidate',
      workspace_id: 'workspace-123',
    })

    const sprint = normalizeShipDocument({
      document_type: 'sprint',
      id: 'sprint-1',
      properties: {
        assignee_ids: ['person-primary', 'person-secondary'],
        owner_id: 'person-primary',
        project_id: 'project-legacy',
      },
      title: 'Week 12',
      workspace_id: 'workspace-123',
    })

    expect(issue.relationships).toEqual({
      parentId: 'parent-1',
      programId: 'program-1',
      projectId: 'project-canonical',
      sprintId: 'sprint-1',
    })
    expect(issue.legacy.projectId).toBe('project-legacy')
    expect(issue.assignments.assigneeIds).toEqual(['person-primary'])

    expect(sprint.relationships.projectId).toBe('project-legacy')
    expect(sprint.legacy.assigneeIds).toEqual([
      'person-primary',
      'person-secondary',
    ])
    expect(sprint.assignments).toEqual({
      accountableId: undefined,
      assigneeId: undefined,
      assigneeIds: ['person-primary', 'person-secondary'],
      ownerId: 'person-primary',
    })
  })

  it('falls back to sprint assignee_ids when owner_id is absent', () => {
    const sprint = normalizeShipDocument({
      document_type: 'sprint',
      id: 'sprint-2',
      properties: {
        assignee_ids: ['person-fallback', 'person-secondary'],
      },
      title: 'Week 13',
      workspace_id: 'workspace-123',
    })

    expect(sprint.assignments).toEqual({
      accountableId: undefined,
      assigneeId: undefined,
      assigneeIds: ['person-fallback', 'person-secondary'],
      ownerId: 'person-fallback',
    })
  })
})
