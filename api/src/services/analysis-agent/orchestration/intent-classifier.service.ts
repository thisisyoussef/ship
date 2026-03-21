import type { AnalysisContext } from '../types.js'

// ── Types ────────────────────────────────────────────────────────

export type AnalysisIntent = 'tool_use' | 'clarify' | 'out_of_scope'

// ── Patterns ─────────────────────────────────────────────────────

const GREETING_ONLY = /^\s*(hi|hello|hey|howdy|sup|what'?s up|yo)\s*[!?.]*\s*$/i

const OUT_OF_SCOPE_PATTERNS = [
  /\b(weather|forecast|temperature)\b/i,
  /\b(joke|funny|laugh)\b/i,
  /\b(recipe|cook|bake)\b/i,
  /\b(movie|film|tv show|song|music)\b/i,
  /\b(sports|game score|football|basketball|soccer)\b/i,
  /\b(who is the president|capital of)\b/i,
]

const ENTITY_KEYWORDS: Record<string, RegExp> = {
  sprint: /\b(sprint|iteration|cycle)\b/i,
  project: /\b(project|initiative)\b/i,
  issue: /\b(issue|ticket|bug|task|story)\b/i,
  program: /\b(program|portfolio)\b/i,
  wiki: /\b(wiki|doc|page|document)\b/i,
}

const SELF_REFERENCE_PATTERNS = [
  /\b(this|current|the)\s+(sprint|project|issue|program|wiki|page|document|entity)\b/i,
  /\b(it|its|it'?s)\b/i,
]

const ANALYTICAL_KEYWORDS =
  /\b(why|compare|trend|risk|blocker|stale|anomaly|issue|status|progress|deadline|behind|ahead|velocity|burndown|overdue|blocked|open|closed|done|remaining|assignee|owner|priority|summary|overview|health|metric|count|total|average|how many|what|which|who|when|where)\b/i

const COMMAND_KEYWORDS =
  /^\s*(show|get|fetch|list|find|display|tell|give|explain|describe|analyze|check|look|summarize)\b/i

// ── Classifier ───────────────────────────────────────────────────

export function classifyIntent(message: string, context: AnalysisContext): AnalysisIntent {
  const trimmed = message.trim()

  // Rule 1: empty
  if (!trimmed) return 'out_of_scope'

  // Rule 2: greetings only
  if (GREETING_ONLY.test(trimmed)) return 'out_of_scope'

  // Rule 3: clearly unrelated topics
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(trimmed)) return 'out_of_scope'
  }

  // Rule 4: references current entity type
  const entityPattern = ENTITY_KEYWORDS[context.entity_type]
  if (entityPattern && entityPattern.test(trimmed)) return 'tool_use'

  // Rule 4b: self-reference ("this sprint", "it", etc.)
  for (const pattern of SELF_REFERENCE_PATTERNS) {
    if (pattern.test(trimmed)) return 'tool_use'
  }

  // Rule 5: analytical keywords
  if (ANALYTICAL_KEYWORDS.test(trimmed)) return 'tool_use'

  // Rule 6: command keywords
  if (COMMAND_KEYWORDS.test(trimmed)) return 'tool_use'

  // Rule 7: default — bias toward action
  return 'tool_use'
}
