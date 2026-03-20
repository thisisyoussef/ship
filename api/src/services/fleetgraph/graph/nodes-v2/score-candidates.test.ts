import { describe, expect, it } from 'vitest'

import {
  routeFromScoreCandidates,
  scoreCandidates,
} from './score-candidates.js'

describe('scoreCandidates', () => {
  it('routes scoring anomalies to a scoring-specific fallback when normalized context is missing', () => {
    const update = scoreCandidates({
      candidateFindings: [
        {
          fingerprint: 'week-1:week_start_drift',
          findingType: 'week_start_drift',
          rawData: { hoursSinceStart: 96 },
          severity: 'warning',
          targetEntityId: 'week-1',
          targetEntityType: 'sprint',
        },
      ],
      mode: 'on_demand',
      normalizedContext: null,
      partialData: false,
      scoreCache: {},
      suppressedFingerprints: [],
      userQuestion: null,
    } as never)

    expect(update.branch).toBe('fallback')
    expect(update.fallbackReason).toBe(
      'FleetGraph could not score candidates because normalized context was unavailable.'
    )
    expect(update.fallbackStage).toBe('scoring')
    expect(routeFromScoreCandidates(update as never)).toBe('fallback_scoring')
  })
})
