import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { FleetGraphFindingsPanel } from '@/components/FleetGraphFindingsPanel'
import { useAssignableMembersQuery } from '@/hooks/useTeamMembersQuery'

export function FleetGraphQueuePage() {
  const navigate = useNavigate()
  const { data: teamMembersData = [] } = useAssignableMembersQuery()
  const ownerOptions = useMemo(
    () => teamMembersData.map((member) => ({
      description: member.email || undefined,
      label: member.name,
      value: member.user_id,
    })),
    [teamMembersData]
  )

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-background"
      data-testid="fleetgraph-queue-page"
    >
      <div className="border-b border-border px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          FleetGraph
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          Workspace findings queue
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          FleetGraph sweeps the active workspace for proactive findings so you can
          review, apply, dismiss, and snooze them from one place.
        </p>
      </div>

      <div className="px-4 py-4 md:px-6">
        <FleetGraphFindingsPanel
          documentIds={null}
          emptyStateMessage="No active proactive FleetGraph findings are open across this workspace right now."
          helperText="FleetGraph is sweeping the active workspace for proactive findings so you can triage them from one queue."
          onOpenDocument={(finding) => navigate(`/documents/${finding.documentId}`)}
          ownerOptions={ownerOptions}
          title="Global findings queue"
        />
      </div>
    </div>
  )
}

export default FleetGraphQueuePage
