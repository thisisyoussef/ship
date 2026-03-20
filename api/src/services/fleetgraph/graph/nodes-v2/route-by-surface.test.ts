import { describe, expect, it } from 'vitest'

import {
  routeBySurface,
  routeFromSurface,
} from './route-by-surface.js'

describe('routeBySurface', () => {
  it('fans out wiki documents across associated week and project clusters', () => {
    const update = routeBySurface({
      documentType: 'wiki',
      rawPrimaryDocument: {
        belongs_to: [
          { id: 'week-1', type: 'sprint' },
          { id: 'project-1', type: 'project' },
        ],
        documentType: 'wiki',
        id: 'wiki-1',
        title: 'Program pulse',
      },
    } as never)

    expect(update.surfaceTargets).toEqual([
      'fetch_week_cluster',
      'fetch_project_cluster',
    ])
    expect(update.surfaceWeekId).toBe('week-1')
    expect(update.surfaceProjectId).toBe('project-1')
    expect(routeFromSurface(update as never)).toEqual([
      'fetch_week_cluster',
      'fetch_project_cluster',
    ])
  })

  it('adds the week cluster when an issue question explicitly asks about sprint impact', () => {
    const update = routeBySurface({
      documentType: 'issue',
      rawPrimaryDocument: {
        belongs_to: [
          { id: 'week-1', type: 'sprint' },
          { id: 'project-1', type: 'project' },
        ],
        documentType: 'issue',
        id: 'issue-1',
        title: 'Launch blocker',
      },
      userQuestion: 'How is this issue affecting the sprint plan?',
    } as never)

    expect(update.surfaceTargets).toEqual([
      'fetch_issue_cluster',
      'fetch_week_cluster',
    ])
    expect(update.surfaceIssueId).toBe('issue-1')
    expect(update.surfaceWeekId).toBe('week-1')
  })

  it('falls back as input-context failure when it cannot resolve any supported surface', () => {
    const update = routeBySurface({
      documentType: 'wiki',
      rawPrimaryDocument: {
        belongs_to: [],
        documentType: 'wiki',
        id: 'wiki-1',
        title: 'Loose notes',
      },
    } as never)

    expect(update.branch).toBe('fallback')
    expect(update.fallbackReason).toBe(
      'FleetGraph could not determine which Ship surface to analyze from this document.'
    )
    expect(update.fallbackStage).toBe('input')
    expect(routeFromSurface(update as never)).toBe('fallback_input')
  })
})
