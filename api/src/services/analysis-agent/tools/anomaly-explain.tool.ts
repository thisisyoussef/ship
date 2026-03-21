import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'
import { fetchShipApi } from './fetch-ship-api.js'

export const anomalyExplainTool: AnalysisTool = {
  name: 'anomaly_explain_get',
  description:
    'Analyze data patterns to find anomalies — stale issues, sudden scope changes, blocked work, missing standups. Use when the user asks \'why\' something happened.',
  parameters: z.object({
    entity_id: z.string(),
    entity_type: z.string(),
  }),

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, entity_type } = args as {
        entity_id: string
        entity_type: string
      }

      if (entity_type === 'sprint') {
        const [issues, scopeChanges, standups] = await Promise.all([
          fetchShipApi(`/api/weeks/${entity_id}/issues`, ctx).catch(() => []),
          fetchShipApi(`/api/weeks/${entity_id}/scope-changes`, ctx).catch(() => []),
          fetchShipApi(`/api/weeks/${entity_id}/standups`, ctx).catch(() => []),
        ])

        const anomalies = detectSprintAnomalies(
          issues as Record<string, unknown>[],
          scopeChanges as Record<string, unknown>[],
          standups as Record<string, unknown>[],
        )

        return {
          success: true,
          data: { entity_type, entity_id, anomalies, raw: { issues, scopeChanges, standups } },
        }
      }

      if (entity_type === 'project') {
        const [issues, weeks] = await Promise.all([
          fetchShipApi(`/api/projects/${entity_id}/issues`, ctx).catch(() => []),
          fetchShipApi(`/api/projects/${entity_id}/weeks`, ctx).catch(() => []),
        ])

        const anomalies = detectProjectAnomalies(
          issues as Record<string, unknown>[],
          weeks as Record<string, unknown>[],
        )

        return {
          success: true,
          data: { entity_type, entity_id, anomalies, raw: { issues, weeks } },
        }
      }

      // Fallback: just fetch the document
      const document = await fetchShipApi(`/api/documents/${entity_id}`, ctx)
      return {
        success: true,
        data: { entity_type, entity_id, anomalies: [], raw: { document } },
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}

// ── Anomaly detection helpers ─────────────────────────────────────

interface AnomalyRecord {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  entity_ids?: string[]
}

function detectSprintAnomalies(
  issues: Record<string, unknown>[],
  scopeChanges: Record<string, unknown>[],
  standups: Record<string, unknown>[],
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = []

  // Stale issues: open issues not updated recently
  const now = Date.now()
  const staleThresholdMs = 3 * 24 * 60 * 60 * 1000 // 3 days
  const staleIssues = issues.filter((i) => {
    const updated = i.updated_at ? new Date(i.updated_at as string).getTime() : 0
    const status = String(i.status ?? '').toLowerCase()
    return status !== 'done' && status !== 'closed' && (now - updated) > staleThresholdMs
  })
  if (staleIssues.length > 0) {
    anomalies.push({
      type: 'stale_issues',
      severity: staleIssues.length > 3 ? 'high' : 'medium',
      description: `${staleIssues.length} open issue(s) not updated in 3+ days`,
      entity_ids: staleIssues.map((i) => String(i.id)),
    })
  }

  // Scope changes
  if (Array.isArray(scopeChanges) && scopeChanges.length > 5) {
    anomalies.push({
      type: 'excessive_scope_changes',
      severity: 'high',
      description: `${scopeChanges.length} scope changes detected — possible scope creep`,
    })
  }

  // Missing standups
  if (Array.isArray(standups) && standups.length === 0) {
    anomalies.push({
      type: 'missing_standups',
      severity: 'medium',
      description: 'No standups found for this sprint',
    })
  }

  return anomalies
}

function detectProjectAnomalies(
  issues: Record<string, unknown>[],
  weeks: Record<string, unknown>[],
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = []

  // Empty sprints
  if (Array.isArray(weeks)) {
    const emptyWeeks = weeks.filter((w) => {
      const count = typeof w.issue_count === 'number' ? w.issue_count : -1
      return count === 0
    })
    if (emptyWeeks.length > 0) {
      anomalies.push({
        type: 'empty_sprints',
        severity: 'medium',
        description: `${emptyWeeks.length} sprint(s) with zero issues`,
        entity_ids: emptyWeeks.map((w) => String(w.id)),
      })
    }
  }

  // Blocked issues
  const blockedIssues = issues.filter((i) => {
    const status = String(i.status ?? '').toLowerCase()
    return status === 'blocked'
  })
  if (blockedIssues.length > 0) {
    anomalies.push({
      type: 'blocked_issues',
      severity: blockedIssues.length > 2 ? 'high' : 'medium',
      description: `${blockedIssues.length} blocked issue(s)`,
      entity_ids: blockedIssues.map((i) => String(i.id)),
    })
  }

  return anomalies
}
