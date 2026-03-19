import { describe, expect, it } from 'vitest'

import {
  resolveTriggerContext,
  routeFromTriggerContext,
} from './resolve-trigger-context.js'

describe('resolveTriggerContext', () => {
  it('clears the default fallback branch for valid on-demand inputs', () => {
    const state = resolveTriggerContext({
      actorId: 'user-1',
      branch: 'fallback',
      documentId: 'doc-1',
      documentType: 'sprint',
      threadId: 'thread-1',
      triggerSource: 'document-page',
      triggerType: 'user_chat',
      workspaceId: 'ws-1',
    } as never)

    expect(state.branch).toBe('quiet')
    expect(state.fallbackReason).toBeNull()
    expect(routeFromTriggerContext(state as never)).toBe('fetch_actor_and_roles')
  })

  it('keeps invalid on-demand inputs on the fallback path with a reason', () => {
    const state = resolveTriggerContext({
      actorId: null,
      branch: 'fallback',
      documentId: 'doc-1',
      documentType: 'sprint',
      threadId: 'thread-1',
      triggerSource: 'document-page',
      triggerType: 'user_chat',
      workspaceId: 'ws-1',
    } as never)

    expect(state.branch).toBe('fallback')
    expect(state.fallbackReason).toBe('On-demand mode requires actorId')
    expect(routeFromTriggerContext(state as never)).toBe('fallback')
  })
})
