const buttonClassName =
  'rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
const sectionLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.16em] text-muted'

interface FleetGraphEntryCardProps {
  helperText: string
  isActionDisabled?: boolean
  onCheckCurrentContext?: () => void
}

export function FleetGraphEntryCard({
  helperText,
  isActionDisabled = false,
  onCheckCurrentContext,
}: FleetGraphEntryCardProps) {
  return (
    <section className="rounded-xl border border-border bg-background px-4 py-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-1.5">
          <p className={sectionLabelClassName}>FleetGraph entry</p>
          <h2 className="text-sm font-semibold text-foreground">Help for this page</h2>
          <p className="text-sm text-muted">{helperText}</p>
        </div>

        <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
          <div className="space-y-1">
            <p className={sectionLabelClassName}>Quick actions</p>
            <p className="text-sm text-muted">
              Ask FleetGraph to review this page, then use the FAB&apos;s guided-actions panel
              when you want the next suggested step.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className={buttonClassName}
              disabled={isActionDisabled}
              onClick={onCheckCurrentContext}
              type="button"
            >
              Check this page
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
