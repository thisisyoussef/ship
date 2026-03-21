/**
 * FleetGraph Chat Session Store
 *
 * In-memory session store with lazy TTL cleanup.
 * Sessions are keyed by threadId and expire after SESSION_TTL_MS of inactivity.
 */

import type { ChatSession } from './types.js'
import { DEFAULT_TOKEN_LIMIT, SESSION_TTL_MS } from './types.js'

// ──────────────────────────────────────────────────────────────────────────────
// Interface
// ──────────────────────────────────────────────────────────────────────────────

export interface ChatSessionStore {
  create(config: {
    threadId: string
    workspaceId: string
    actorId: string
    documentId: string
    documentType: string
  }): ChatSession

  get(threadId: string): ChatSession | undefined

  update(threadId: string, updates: Partial<ChatSession>): ChatSession | undefined

  delete(threadId: string): boolean

  /** Touch session to reset TTL. */
  touch(threadId: string): void

  /** Remove expired sessions. Returns count removed. */
  cleanup(): number

  /** Number of active sessions (for monitoring). */
  size(): number
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────────────────────────────────────

export function createChatSessionStore(): ChatSessionStore {
  const sessions = new Map<string, ChatSession>()
  let lastCleanup = Date.now()

  /** Lazily clean up expired sessions at most once per minute. */
  function lazyCleanup(): void {
    const now = Date.now()
    if (now - lastCleanup < 60_000) return
    lastCleanup = now
    cleanup()
  }

  function cleanup(): number {
    const now = Date.now()
    let removed = 0
    sessions.forEach((session, threadId) => {
      if (now - new Date(session.lastActiveAt).getTime() > SESSION_TTL_MS) {
        sessions.delete(threadId)
        removed++
      }
    })
    return removed
  }

  function create(config: {
    threadId: string
    workspaceId: string
    actorId: string
    documentId: string
    documentType: string
  }): ChatSession {
    const now = new Date().toISOString()
    const session: ChatSession = {
      threadId: config.threadId,
      workspaceId: config.workspaceId,
      actorId: config.actorId,
      documentId: config.documentId,
      documentType: config.documentType,
      messages: [],
      tokenBudget: { used: 0, limit: DEFAULT_TOKEN_LIMIT },
      toolCallCount: 0,
      pendingApproval: null,
      completedActions: [],
      createdAt: now,
      lastActiveAt: now,
    }
    sessions.set(config.threadId, session)
    return session
  }

  function get(threadId: string): ChatSession | undefined {
    lazyCleanup()
    return sessions.get(threadId)
  }

  function update(
    threadId: string,
    updates: Partial<ChatSession>
  ): ChatSession | undefined {
    const session = sessions.get(threadId)
    if (!session) return undefined
    Object.assign(session, updates)
    return session
  }

  function del(threadId: string): boolean {
    return sessions.delete(threadId)
  }

  function touch(threadId: string): void {
    const session = sessions.get(threadId)
    if (session) {
      session.lastActiveAt = new Date().toISOString()
    }
  }

  function size(): number {
    return sessions.size
  }

  return {
    create,
    get,
    update,
    delete: del,
    touch,
    cleanup,
    size,
  }
}
