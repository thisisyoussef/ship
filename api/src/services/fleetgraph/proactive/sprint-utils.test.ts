import { describe, expect, it } from 'vitest'

import { calculateWeekStartDate } from './sprint-utils.js'

describe('calculateWeekStartDate', () => {
  it('sprint 1 starts on the base date', () => {
    const result = calculateWeekStartDate('2024-01-01', 1)
    expect(result.toISOString().slice(0, 10)).toBe('2024-01-01')
  })

  it('sprint 2 starts 7 days after the base date', () => {
    const result = calculateWeekStartDate('2024-01-01', 2)
    expect(result.toISOString().slice(0, 10)).toBe('2024-01-08')
  })

  it('sprint 3 starts 14 days after the base date', () => {
    const result = calculateWeekStartDate('2024-01-01', 3)
    expect(result.toISOString().slice(0, 10)).toBe('2024-01-15')
  })
})
