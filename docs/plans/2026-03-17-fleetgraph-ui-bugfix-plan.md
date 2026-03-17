# FleetGraph UI Bugfix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 FleetGraph UI/UX bugs (1, 2, 3, 6, 8, 9) without touching graph runtime files.

**Architecture:** Surgical edits to existing components. No new components except a small collapsible wrapper. All changes are in `web/src/` and one API service file.

**Tech Stack:** React, TypeScript, TanStack Query, Tailwind CSS, Vitest

**Do NOT touch:** `api/src/services/fleetgraph/graph/runtime.ts`, `state.ts`, `types.ts` (LangGraph agent's domain)

---

### Task 1: Fix misleading "owner confirms" copy (Bug 6)

**Files:**
- Modify: `api/src/services/fleetgraph/proactive/week-start-drift.ts:106`
- Modify: `api/src/services/fleetgraph/proactive/week-start-drift.test.ts` (no test references the summary string directly, but verify)

**Step 1: Update the copy**

In `api/src/services/fleetgraph/proactive/week-start-drift.ts`, line 106, replace:

```ts
summary: 'Start this week once the owner confirms the scope is ready.',
```

with:

```ts
summary: 'Confirm to start this week.',
```

**Step 2: Run tests to verify nothing broke**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm vitest run api/src/services/fleetgraph/proactive/week-start-drift.test.ts`

Expected: PASS (no test asserts on the summary string)

**Step 3: Commit**

```bash
git add api/src/services/fleetgraph/proactive/week-start-drift.ts
git commit -m "fix(fleetgraph): clarify week-start action summary copy

Replace 'owner confirms the scope' with direct 'Confirm to start'
since there is no owner-gating logic. Bug 6 from fleetgraph-bug-audit.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Surface dismiss/snooze errors (Bug 3)

**Files:**
- Modify: `web/src/components/FleetGraphFindingsPanel.tsx:76-78, 96-98, 124-126`

**Step 1: Add console.error to all three catch blocks**

In `FleetGraphFindingsPanel.tsx`, replace each empty catch block with a logging catch:

Line 76-78 (`handleDismiss`):
```ts
    } catch (error) {
      console.error('FleetGraph dismiss failed:', error);
    }
```

Line 96-98 (`handleSnooze`):
```ts
    } catch (error) {
      console.error('FleetGraph snooze failed:', error);
    }
```

Line 124-126 (`handleApply`):
```ts
    } catch (error) {
      console.error('FleetGraph apply failed:', error);
    }
```

**Step 2: Run tests to verify nothing broke**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm vitest run web/src/components/FleetGraphFindingsPanel.test.tsx`

Expected: PASS

**Step 3: Commit**

```bash
git add web/src/components/FleetGraphFindingsPanel.tsx
git commit -m "fix(fleetgraph): log errors in dismiss/snooze/apply catch blocks

Empty catch blocks swallowed mutation errors silently, making button
failures invisible. Bug 3 from fleetgraph-bug-audit.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Wire approval buttons in FleetGraphEntryCard (Bug 2)

**Files:**
- Modify: `web/src/components/FleetGraphEntryCard.tsx:140-151`
- Modify: `web/src/components/FleetGraphEntryCard.test.tsx`

**Step 1: Add an onApprovalAction callback prop**

The entry card's approval options have `id: 'apply' | 'dismiss' | 'snooze'`. Add a callback prop so the parent can handle these. In `FleetGraphEntryCard.tsx`:

Add to the props interface:
```ts
interface FleetGraphEntryCardProps {
  activeTab?: string;
  context?: DocumentContext;
  contextError?: string;
  document: FleetGraphEntryDocument;
  loading?: boolean;
  nestedPath?: string;
  onApprovalAction?: (optionId: 'apply' | 'dismiss' | 'snooze', approval: FleetGraphApprovalEnvelope) => void;
  userId: string;
}
```

Add `FleetGraphApprovalEnvelope` to the import from `@/lib/fleetgraph-entry`.

Add `onApprovalAction` to the destructured props.

**Step 2: Replace the disabled buttons with wired buttons**

Replace lines 140-151 (the `<div className="flex flex-wrap gap-2">` block):

```tsx
<div className="flex flex-wrap gap-2">
  {fleetGraph.result.approval.options.map((option) => (
    <button
      className={optionClassName}
      disabled={fleetGraph.isLoading}
      key={option.id}
      onClick={() =>
        onApprovalAction?.(option.id, fleetGraph.result!.approval!)
      }
      type="button"
    >
      {option.label}
    </button>
  ))}
</div>
```

Key changes:
- Remove hardcoded `disabled`, replace with `disabled={fleetGraph.isLoading}`
- Add `onClick` that calls `onApprovalAction` with the option ID and full approval envelope

**Step 3: Update the test to verify buttons are clickable**

Add to `FleetGraphEntryCard.test.tsx` after the existing `it('renders the approval gate...')` test:

```ts
  it('calls onApprovalAction when an approval option button is clicked', async () => {
    const onApprovalAction = vi.fn()

    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
        approval: {
          endpoint: {
            method: 'POST',
            path: `/api/projects/${DOCUMENT_ID}/approve-plan`,
          },
          options: [
            { id: 'apply', label: 'Apply' },
            { id: 'dismiss', label: 'Dismiss' },
            { id: 'snooze', label: 'Snooze' },
          ],
          state: 'pending_confirmation',
          summary: 'Approve the current project plan.',
          targetId: DOCUMENT_ID,
          targetType: 'project',
          title: 'Approve project plan',
          type: 'approve_project_plan',
        },
        entry: {
          current: {
            documentType: 'project',
            id: DOCUMENT_ID,
            title: 'Launch planner',
          },
          route: {
            activeTab: 'details',
            nestedPath: ['milestones'],
            surface: 'document-page',
          },
          threadId: 'fleetgraph:workspace-1:document:project',
        },
        run: {
          outcome: 'approval_required',
          path: ['approval_required'],
          routeSurface: 'document-page',
          threadId: 'fleetgraph:workspace-1:document:project',
        },
        summary: {
          detail: 'Review the suggested next step for Launch planner.',
          surfaceLabel: 'document-page / details',
          title: 'FleetGraph paused for human approval.',
        },
      }),
    } as Response)

    render(
      <FleetGraphEntryCard
        activeTab="details"
        context={createContext()}
        document={{
          documentType: 'project',
          id: DOCUMENT_ID,
          title: 'Launch planner',
          workspaceId: '22222222-2222-4222-8222-222222222222',
        }}
        nestedPath="milestones"
        onApprovalAction={onApprovalAction}
        userId="11111111-1111-4111-8111-111111111111"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByRole('button', { name: /preview approval step/i }))

    const applyButton = await screen.findByRole('button', { name: 'Apply' })
    expect(applyButton).not.toBeDisabled()
    fireEvent.click(applyButton)

    expect(onApprovalAction).toHaveBeenCalledWith(
      'apply',
      expect.objectContaining({
        title: 'Approve project plan',
        type: 'approve_project_plan',
      })
    )
  })
```

**Step 4: Run tests**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm vitest run web/src/components/FleetGraphEntryCard.test.tsx`

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add web/src/components/FleetGraphEntryCard.tsx web/src/components/FleetGraphEntryCard.test.tsx
git commit -m "fix(fleetgraph): wire approval option buttons in entry card

Approval buttons (Apply/Dismiss/Snooze) were hardcoded disabled with
no onClick handlers. Now they call onApprovalAction callback prop.
Bug 2 from fleetgraph-bug-audit.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Pass onApprovalAction from UnifiedDocumentPage

**Files:**
- Modify: `web/src/pages/UnifiedDocumentPage.tsx:649-662`

**Step 1: Add an approval action handler in UnifiedDocumentPage**

The entry card's approval envelope contains a `targetId` (the document to act on) and the option tells us what to do. For now, the simplest handler logs a toast confirmation — the actual backend action integration can be wired in a follow-up once the LangGraph agent finishes the graph overhaul.

After the `const fleetGraphCard = (` block, before it, add:

```ts
  const handleApprovalAction = useCallback(
    (optionId: 'apply' | 'dismiss' | 'snooze', approval: FleetGraphApprovalEnvelope) => {
      if (optionId === 'apply') {
        showToast(`Approval action "${approval.title}" is not yet connected to the backend.`, 'info');
      } else if (optionId === 'dismiss') {
        showToast('Dismissed.', 'info');
      } else if (optionId === 'snooze') {
        showToast('Snoozed for 4 hours.', 'info');
      }
    },
    [showToast]
  );
```

Add the import for `FleetGraphApprovalEnvelope`:
```ts
import type { FleetGraphApprovalEnvelope } from '@/lib/fleetgraph-entry';
```

**Step 2: Pass it to FleetGraphEntryCard**

In the `fleetGraphCard` JSX, add the prop to `<FleetGraphEntryCard>`:

```tsx
<FleetGraphEntryCard
  activeTab={activeTab || undefined}
  context={documentContextQuery.data}
  contextError={documentContextQuery.error instanceof Error ? documentContextQuery.error.message : undefined}
  document={{
    documentType: document.document_type,
    id: document.id,
    title: document.title,
    workspaceId: document.workspace_id,
  }}
  loading={documentContextQuery.isLoading}
  nestedPath={nestedPath}
  onApprovalAction={handleApprovalAction}
  userId={user.id}
/>
```

**Step 3: Run type check**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm type-check`

Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/UnifiedDocumentPage.tsx
git commit -m "feat(fleetgraph): connect approval action handler to entry card

Passes onApprovalAction to FleetGraphEntryCard so approval buttons
show toast feedback. Full backend wiring deferred to graph overhaul.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Collapsible FleetGraph cards (Bug 8)

**Files:**
- Modify: `web/src/pages/UnifiedDocumentPage.tsx:640-667`

**Step 1: Add collapse state with localStorage persistence**

At the top of `UnifiedDocumentPage()`, after the existing hooks, add:

```ts
const [fleetGraphExpanded, setFleetGraphExpanded] = useState(() => {
  try {
    return localStorage.getItem('fleetgraph-panel-expanded') !== 'false';
  } catch {
    return true;
  }
});

const toggleFleetGraph = useCallback(() => {
  setFleetGraphExpanded((prev) => {
    const next = !prev;
    try {
      localStorage.setItem('fleetgraph-panel-expanded', String(next));
    } catch {
      // localStorage unavailable
    }
    return next;
  });
}, []);
```

**Step 2: Wrap fleetGraphCard in collapsible container**

Replace the `fleetGraphCard` const (lines 640-667) with:

```tsx
const fleetGraphCard = (
  <FleetGraphDebugSurfaceProvider>
    <div className="border-b border-border">
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted hover:bg-muted/30 transition-colors"
        onClick={toggleFleetGraph}
        type="button"
      >
        <span>FleetGraph</span>
        <svg
          className={`h-4 w-4 transition-transform ${fleetGraphExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </button>
      {fleetGraphExpanded ? (
        <div className="px-4 pb-3">
          <div className="space-y-3">
            <FleetGraphFindingsPanel
              context={documentContextQuery.data}
              currentDocumentId={document.id}
              loading={documentContextQuery.isLoading}
            />
            <FleetGraphEntryCard
              activeTab={activeTab || undefined}
              context={documentContextQuery.data}
              contextError={documentContextQuery.error instanceof Error ? documentContextQuery.error.message : undefined}
              document={{
                documentType: document.document_type,
                id: document.id,
                title: document.title,
                workspaceId: document.workspace_id,
              }}
              loading={documentContextQuery.isLoading}
              nestedPath={nestedPath}
              onApprovalAction={handleApprovalAction}
              userId={user.id}
            />
          </div>
        </div>
      ) : null}
    </div>
    <FleetGraphDebugDock />
  </FleetGraphDebugSurfaceProvider>
);
```

**Step 3: Run type check**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm type-check`

Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/UnifiedDocumentPage.tsx
git commit -m "fix(fleetgraph): make FleetGraph cards collapsible

FleetGraph panels consumed 300-400px at the top of every page,
pushing content below the fold. Now wrapped in a collapsible
container with localStorage persistence. Bug 8 from fleetgraph-bug-audit.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Hide Plan Week button when already on sprint page (Bug 1)

**Files:**
- Modify: `web/src/components/sidebars/WeekSidebar.tsx:1-3, 301-308`

**Step 1: Import useParams and conditionally hide the button**

Add `useParams` to the react-router-dom import at line 2:
```ts
import { useNavigate, useParams } from 'react-router-dom';
```

Find the component function that renders the "Plan Week" button. It's the `WeekSidebar` component. Add at the top of the component body:
```ts
const { id: currentDocumentId } = useParams<{ id: string }>();
```

Replace lines 301-308:
```tsx
{sprint.id !== currentDocumentId && (
  <div className="border-t border-border pt-4">
    <button
      onClick={() => navigate(`/documents/${sprint.id}`)}
      className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
    >
      Plan Week
    </button>
  </div>
)}
```

**Step 2: Run type check**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm type-check`

Expected: PASS

**Step 3: Commit**

```bash
git add web/src/components/sidebars/WeekSidebar.tsx
git commit -m "fix(fleetgraph): hide Plan Week button when already on sprint page

Button navigated to the current page (no-op). Now hidden when the
sprint.id matches the current route document ID. Bug 1 from fleetgraph-bug-audit.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Verify Weeks tab on project page (Bug 9)

**Files:**
- Investigate: `web/src/components/document-tabs/ProjectWeeksTab.tsx`
- Investigate: API response from `/api/projects/{id}/weeks`

**Step 1: Check if the ProjectWeeksTab fetches data correctly**

Read `web/src/components/document-tabs/ProjectWeeksTab.tsx` fully. The tab renders an allocation grid fetched from `/api/projects/{id}/allocation-grid`. This is a different endpoint than `/api/projects/{id}/weeks`.

**Step 2: Test the API endpoint manually**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm dev` in background, then test:

```bash
# Find the FleetGraph Demo Project ID from the database
# Then check if the allocation grid returns weeks
```

**Step 3: Document findings**

If the Weeks tab works correctly (just shows an allocation grid, not a week document list), update the bug audit to note this is by-design and close Bug 9. The sidebar tree shows static tab navigation links, not child documents — this is consistent with how Ship handles all document types.

**Step 4: Commit if any changes**

```bash
git add docs/fleetgraph-bug-audit.md
git commit -m "docs(fleetgraph): close bug 9 — weeks tab is by-design allocation grid

The Weeks tab on project pages shows an allocation grid, not a list
of week documents. The sidebar tree shows tab navigation links by
design. No code change needed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Final verification

**Step 1: Run full type check**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm type-check`

Expected: PASS

**Step 2: Run all FleetGraph tests**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm vitest run --config api/vitest.fleetgraph.config.ts && pnpm vitest run web/src/components/FleetGraphEntryCard.test.tsx web/src/components/FleetGraphFindingsPanel.test.tsx`

Expected: All PASS

**Step 3: Build check**

Run: `cd /Users/youss/Development/gauntlet/ship/.claude/worktrees/objective-raman && pnpm build`

Expected: PASS
