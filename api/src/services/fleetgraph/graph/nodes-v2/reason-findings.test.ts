import { describe, expect, it } from 'vitest'

import { reasonFindings } from './reason-findings.js'
import type { FleetGraphStateV2 } from '../state-v2.js'

function makeState(overrides: Partial<FleetGraphStateV2> = {}) {
  return {
    contextSummary: null,
    conversationHistory: [],
    documentId: 'week-1',
    documentType: 'sprint',
    mode: 'proactive',
    normalizedContext: {
      nodes: [
        {
          id: 'week-1',
          title: 'FleetGraph Demo Week - Worker Generated',
          type: 'week',
        },
        {
          id: 'project-1',
          title: 'Launch planner',
          type: 'project',
        },
      ],
      resolvedPersons: {
        'person-1': {
          id: 'person-1',
          name: 'Taylor Kim',
        },
      },
    },
    roleLens: 'unknown',
    scoredFindings: [],
    userQuestion: null,
    ...overrides,
  } as unknown as FleetGraphStateV2
}

describe('reasonFindings', () => {
  it('emits human-readable evidence for week start drift findings', async () => {
    const result = await reasonFindings(makeState({
      scoredFindings: [
        {
          compositeScore: 82,
          dimensions: {
            actionability: 80,
            confidence: 85,
            impact: 70,
            urgency: 90,
          },
          findingType: 'week_start_drift',
          fingerprint: 'finding-1',
          rawData: {
            hoursSinceStart: 94.13318472222223,
            sprintStartDate: '2026-03-16T00:00:00.000Z',
            status: 'planning',
          },
          severity: 'warning',
          suppressed: false,
          targetEntityId: 'week-1',
          targetEntityType: 'week',
        },
      ],
    }))

    expect(result.reasonedFindings?.[0]?.evidence).toEqual([
      'Week name: FleetGraph Demo Week - Worker Generated',
      'Time since planned start: 3 days, 22 hours',
      'Scheduled start: Mon, Mar 16, 2026',
      'Current Ship status: Planning',
    ])
    expect(result.reasonedFindings?.[0]?.evidence).not.toContain(
      'hoursSinceStart: 94.13318472222223'
    )
  })

  it('emits human-readable evidence for non-week findings too', async () => {
    const result = await reasonFindings(makeState({
      documentId: 'project-1',
      documentType: 'project',
      scoredFindings: [
        {
          compositeScore: 71,
          dimensions: {
            actionability: 60,
            confidence: 70,
            impact: 75,
            urgency: 78,
          },
          findingType: 'deadline_risk',
          fingerprint: 'finding-2',
          rawData: {
            daysUntil: 2,
            hasStaleHighPriority: true,
            openIssueCount: 7,
            targetDate: '2026-03-21T00:00:00.000Z',
          },
          severity: 'warning',
          suppressed: false,
          targetEntityId: 'project-1',
          targetEntityType: 'project',
        },
      ],
    }))

    expect(result.reasonedFindings?.[0]?.evidence).toEqual([
      'Project: Launch planner',
      'Target date: Sat, Mar 21, 2026',
      'Schedule buffer: 2 days',
      'Open issues remaining: 7',
      'At least one high-priority issue has gone stale.',
    ])
    expect(result.reasonedFindings?.[0]?.evidence).not.toContain('targetDate: 2026-03-21T00:00:00.000Z')
  })
})
