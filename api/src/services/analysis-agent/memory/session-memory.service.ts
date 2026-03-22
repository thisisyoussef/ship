import type { AnalysisContext, ToolCallRecord } from '../types.js'

// ── Types ────────────────────────────────────────────────────────

interface Turn {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallRecord[]
  timestamp: string
}

export interface SessionState {
  sessionId: string
  userId: string
  workspaceId: string
  turns: Turn[]
  summary: string | null
  context: AnalysisContext
  createdAt: string
  lastActiveAt: string
}

export interface SessionMemoryService {
  getOrCreate(sessionId: string, context: AnalysisContext, userId: string, workspaceId: string): SessionState
  addTurn(sessionId: string, turn: { role: 'user' | 'assistant'; content: string; toolCalls?: ToolCallRecord[] }): void
  getRecentTurns(sessionId: string, limit?: number): Turn[]
  getSummary(sessionId: string): string | null
  updateContext(sessionId: string, context: AnalysisContext): void
  touch(sessionId: string): void
}

// ── Constants ────────────────────────────────────────────────────

const MAX_TURNS = 10
const COMPACT_DROP_COUNT = 4
const TTL_MS = 30 * 60 * 1000 // 30 minutes

// ── Implementation ───────────────────────────────────────────────

export function createSessionMemoryService(): SessionMemoryService {
  const store = new Map<string, SessionState>()

  function cleanupExpired(): void {
    const now = Date.now()
    for (const [id, session] of store) {
      if (now - new Date(session.lastActiveAt).getTime() > TTL_MS) {
        store.delete(id)
      }
    }
  }

  function compactTurns(session: SessionState): void {
    if (session.turns.length <= MAX_TURNS) return

    const dropped = session.turns.slice(0, COMPACT_DROP_COUNT)
    session.turns = session.turns.slice(COMPACT_DROP_COUNT)

    const summaryParts = dropped.map((t) => {
      if (t.role === 'user') return `user asked about ${t.content.slice(0, 80)}`
      const toolNames = t.toolCalls?.map((tc) => tc.name).join(', ')
      const suffix = toolNames ? ` based on tools ${toolNames}` : ''
      return `assistant explained ${t.content.slice(0, 80)}${suffix}`
    })

    const newSummary = `Earlier: ${summaryParts.join('; ')}`
    session.summary = session.summary
      ? `${session.summary}\n${newSummary}`
      : newSummary
  }

  return {
    getOrCreate(sessionId: string, context: AnalysisContext, userId: string, workspaceId: string): SessionState {
      cleanupExpired()

      const existing = store.get(sessionId)
      if (existing) {
        // If the userId doesn't match, create a fresh session to prevent cross-user access
        if (existing.userId !== userId) {
          store.delete(sessionId)
          const freshId = `_reset_${sessionId}`
          const freshSession: SessionState = {
            sessionId: freshId,
            userId,
            workspaceId,
            turns: [],
            summary: null,
            context,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          }
          store.set(freshId, freshSession)
          return freshSession
        }
        existing.lastActiveAt = new Date().toISOString()
        existing.context = context
        return existing
      }

      const session: SessionState = {
        sessionId,
        userId,
        workspaceId,
        turns: [],
        summary: null,
        context,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }
      store.set(sessionId, session)
      return session
    },

    addTurn(sessionId: string, turn: { role: 'user' | 'assistant'; content: string; toolCalls?: ToolCallRecord[] }): void {
      const session = store.get(sessionId)
      if (!session) return

      session.turns.push({
        ...turn,
        timestamp: new Date().toISOString(),
      })
      compactTurns(session)
      session.lastActiveAt = new Date().toISOString()
    },

    getRecentTurns(sessionId: string, limit = MAX_TURNS): Turn[] {
      const session = store.get(sessionId)
      if (!session) return []
      return session.turns.slice(-limit)
    },

    getSummary(sessionId: string): string | null {
      return store.get(sessionId)?.summary ?? null
    },

    updateContext(sessionId: string, context: AnalysisContext): void {
      const session = store.get(sessionId)
      if (session) {
        session.context = context
      }
    },

    touch(sessionId: string): void {
      const session = store.get(sessionId)
      if (session) {
        session.lastActiveAt = new Date().toISOString()
      }
    },
  }
}
