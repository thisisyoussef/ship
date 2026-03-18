# FleetGraph T305 Cross-System Finding Priority

## Date
- 2026-03-17

## Story
- `T305` Unify proactive and on-demand finding surfaces to prevent conflicting suggestions

## Problem Statement

FleetGraph has two independent suggestion systems:

1. **Proactive FAB Panel** - Background worker detects patterns (e.g., week_start_drift), persists findings to `fleetgraph_proactive_findings` table
2. **On-Demand Modal** - User-triggered LLM analysis generates ephemeral findings

When viewing a document, both systems may surface different "next step" suggestions without any prioritization or deduplication. Example observed:

- FAB suggests: "Start week" (week_start_drift scenario)
- Modal suggests: "Add content to the sprint document" (empty content detection)

Both are valid findings, but showing conflicting primary actions creates user confusion.

## Design Intent (Why Two Systems Exist)

From `fleetgraph-t103-week-start-drift.md`:

> **Required operating modes**
> - Proactive: the graph runs without a user present and pushes findings
> - On-demand: the graph runs from an embedded chat surface and starts from current context
>
> **Both modes must use the same graph architecture. The trigger changes, not the graph.**

The dual-system design is intentional:
- **Proactive** = operational oversight ("what needs attention workspace-wide?")
- **On-demand** = contextual exploration ("why is this document in this state?")

## Proposed Solution

### Option A: Cross-System Awareness (Recommended)

Add a coordination layer so both surfaces know about each other's findings:

1. **On-demand analysis receives proactive findings as context**
   - When `/api/fleetgraph/analyze` runs, include any active proactive findings for that document
   - LLM can then either:
     - Reinforce the proactive finding ("I see we already detected week start drift...")
     - Surface additional findings with relative priority

2. **Findings presenter unifies display priority**
   - Create a priority ranking: `critical > high > medium > low`
   - When both systems have findings, sort by severity
   - Show unified "X issues found" count

3. **Deduplication by root cause**
   - If proactive and on-demand findings address the same issue, collapse them
   - Show the richer explanation (usually on-demand) with proactive badge

### Option B: Modal Defers to Proactive

Simpler but less powerful:
- If proactive findings exist for a document, on-demand modal shows them first
- User must explicitly request "deeper analysis" to get fresh LLM reasoning
- Reduces API calls but loses the exploratory UX

### Option C: Display-Level Fix Only

Minimal change:
- Keep both systems independent
- FAB panel shows proactive findings
- Modal shows on-demand findings
- Add visual separator: "Proactive Signals" vs "Document Analysis"
- No prioritization, just clearer labeling

## Implementation (Option A)

### Backend Changes

**`api/src/routes/fleetgraph.ts`** - `/analyze` endpoint:
```typescript
// Before calling on_demand_analysis scenario, fetch proactive findings
const proactiveFindings = await findingsStore.getByDocumentId(documentId);

// Pass to graph state
const result = await runtime.invoke({
  // ... existing params
  proactiveFindings: proactiveFindings.map(f => ({
    type: f.finding_type,
    severity: f.severity,
    summary: f.summary,
    suggestedAction: f.suggested_action_label,
  })),
});
```

**`api/src/services/fleetgraph/graph/nodes/reason.ts`**:
```typescript
// Include proactive context in LLM prompt
const proactiveContext = state.proactiveFindings?.length
  ? `\n\nProactive signals already detected:\n${state.proactiveFindings.map(f =>
      `- ${f.type}: ${f.summary} (suggested: ${f.suggestedAction})`
    ).join('\n')}`
  : '';
```

### Frontend Changes

**`web/src/lib/fleetgraph-findings-presenter.ts`**:
```typescript
export function prioritizeFindings(
  proactive: ProactiveFinding[],
  onDemand: AnalysisFinding[]
): UnifiedFinding[] {
  const all = [
    ...proactive.map(f => ({ ...f, source: 'proactive' as const })),
    ...onDemand.map(f => ({ ...f, source: 'on_demand' as const })),
  ];

  // Sort by severity, then by source (proactive first for tie-breaker)
  return all.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return a.source === 'proactive' ? -1 : 1;
  });
}
```

**`web/src/components/FleetGraphFab.tsx`**:
- Fetch both proactive findings and on-demand analysis
- Use `prioritizeFindings()` to merge
- Show unified badge count

## Validation

- `pnpm test` - unit tests pass
- `pnpm type-check` - no type errors
- Manual test: open a week with both drift and empty content, verify unified display
- E2E: add test case for cross-system finding display

## Priority

**Post-MVP** - Current behavior is architecturally correct, just confusing UX. Not a blocker for demo.

## MVP Demo Workaround

For the demo video, use one of these approaches:
1. Frame as feature: "FleetGraph monitors from multiple angles"
2. Demo with aligned state: use a week with content so both suggest "Start week"
3. Dismiss proactive finding before recording to show only modal

## Notes

- This is purely a UX improvement; no architectural changes to the dual-system design
- Both systems continue to operate independently; this adds a presentation layer
- Consider adding a "source" badge to findings so users understand where suggestions came from
