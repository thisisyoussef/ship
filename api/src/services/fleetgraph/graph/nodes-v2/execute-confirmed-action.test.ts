import { describe, expect, it } from 'vitest'

import { normalizeActionResult } from './execute-confirmed-action.js'

describe('executeConfirmedAction', () => {
  it('surfaces the backend error message for failed start-week actions', async () => {
    const result = normalizeActionResult('start_week', {
      endpoint: 'POST /api/weeks/week-1/start',
      errorMessage: 'HTTP 400',
      executedAt: '2026-03-19T10:00:00.000Z',
      path: '/api/weeks/week-1/start',
      responseBody: { error: 'Cannot start week: week is already active' },
      statusCode: 400,
      success: false,
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('Cannot start week: week is already active')
  })

  it('treats a 200 response as failed when the week still comes back as planning', async () => {
    const result = normalizeActionResult('start_week', {
      endpoint: 'POST /api/weeks/week-1/start',
      executedAt: '2026-03-19T10:00:00.000Z',
      path: '/api/weeks/week-1/start',
      responseBody: { status: 'planning' },
      statusCode: 200,
      success: true,
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe(
      'Ship responded, but this week is still marked Planning. Nothing changed in Ship.'
    )
  })
})
