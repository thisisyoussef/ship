import { Link, useLocation } from 'react-router-dom'

import { cn } from '@/lib/cn'

interface FleetGraphSidebarProps {
  activeFindingCount: number
}

export function FleetGraphSidebar({
  activeFindingCount,
}: FleetGraphSidebarProps) {
  const location = useLocation()
  const isActive = location.pathname.startsWith('/fleetgraph')

  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      <Link
        className={cn(
          'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-muted hover:bg-border/30 hover:text-foreground'
        )}
        to="/fleetgraph"
      >
        <span>Global findings</span>
        {activeFindingCount > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {activeFindingCount > 9 ? '9+' : activeFindingCount}
          </span>
        ) : null}
      </Link>
      <p className="px-2 text-xs leading-5 text-muted">
        Workspace-wide proactive queue with the same review, apply, dismiss, and
        snooze actions FleetGraph uses on document pages.
      </p>
    </div>
  )
}
