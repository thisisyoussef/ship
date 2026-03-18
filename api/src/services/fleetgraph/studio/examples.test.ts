import { describe, expect, it } from 'vitest'

import { getFleetGraphStudioExamples } from './examples.js'

describe('getFleetGraphStudioExamples', () => {
  it('returns the three canonical Studio starter inputs', () => {
    const examples = getFleetGraphStudioExamples()

    expect(examples.map((example) => example.id)).toEqual([
      'proactive-week-start',
      'on-demand-document',
      'review-thread',
    ])
    expect(examples.every((example) => example.input.threadId.length > 0)).toBe(true)
  })
})
