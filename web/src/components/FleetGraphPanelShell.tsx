import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface FleetGraphPanelShellProps {
  activeFindingCount: number;
  children: ReactNode;
  isLoading?: boolean;
  resetKey?: string;
}

const VIEWPORT_GUTTER_PX = 24;

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <path
        d="M10 17a2 2 0 0 0 4 0"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <path
        d="M19 4v2M20 5h-2M5 18v3M6.5 19.5h-3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  );
}

export function FleetGraphPanelShell({
  activeFindingCount,
  children,
  isLoading = false,
  resetKey,
}: FleetGraphPanelShellProps) {
  const [expanded, setExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const contentId = useId();
  const hasAlerts = activeFindingCount > 0;

  useEffect(() => {
    setExpanded(false);
  }, [resetKey]);

  useEffect(() => {
    if (!expanded) {
      setMaxHeight(null);
      return;
    }

    function updateMaxHeight() {
      const element = scrollRegionRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const nextMaxHeight = Math.max(
        Math.floor(window.innerHeight - rect.top - VIEWPORT_GUTTER_PX),
        0
      );
      setMaxHeight(nextMaxHeight);
    }

    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    window.addEventListener('scroll', updateMaxHeight, true);

    return () => {
      window.removeEventListener('resize', updateMaxHeight);
      window.removeEventListener('scroll', updateMaxHeight, true);
    };
  }, [expanded]);

  const buttonLabel = expanded ? 'Collapse FleetGraph panel' : 'Open FleetGraph panel';
  const statusLabel = isLoading
    ? 'Checking page context'
    : hasAlerts
      ? `${activeFindingCount} proactive ${activeFindingCount === 1 ? 'alert' : 'alerts'}`
      : 'On-demand guidance ready';

  return (
    <section className="border-b border-border bg-background">
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        aria-label={buttonLabel}
        className={[
          'group flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors',
          hasAlerts
            ? 'bg-amber-50 hover:bg-amber-100/80'
            : 'bg-sky-50/70 hover:bg-sky-100/80',
        ].join(' ')}
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={[
              'relative mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-2xl border shadow-sm',
              hasAlerts
                ? 'border-amber-200 bg-amber-100 text-amber-800'
                : 'border-sky-200 bg-sky-100 text-sky-700',
            ].join(' ')}
          >
            {hasAlerts ? (
              <>
                <span
                  aria-label={`${activeFindingCount} proactive alerts`}
                  className="absolute inset-0 rounded-2xl"
                />
                <BellIcon />
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                  {activeFindingCount}
                </span>
              </>
            ) : (
              <SparkIcon />
            )}
          </span>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                FleetGraph
              </span>
              <span
                className={[
                  'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                  hasAlerts
                    ? 'border-amber-200 bg-amber-100/80 text-amber-900'
                    : 'border-sky-200 bg-sky-100/80 text-sky-800',
                ].join(' ')}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-950">
              Page guidance and proactive alerts
            </p>
            <p className="text-sm text-muted">
              Open FleetGraph to review the current page, preview the next guided step, and check nearby proactive signals without losing the rest of the document view.
            </p>
          </div>
        </div>

        <span className="flex flex-none items-center gap-2 pt-1 text-muted">
          <span className="hidden text-xs font-medium sm:inline">
            {expanded ? 'Collapse' : 'Expand'}
          </span>
          <ChevronIcon expanded={expanded} />
        </span>
      </button>

      {expanded ? (
        <div
          className="overflow-y-auto border-t border-border/70 bg-background/95 px-4 pb-4 pt-3"
          data-testid="fleetgraph-panel-scroll-region"
          id={contentId}
          ref={scrollRegionRef}
          style={maxHeight !== null ? { maxHeight: `${maxHeight}px` } : undefined}
        >
          <div className="space-y-3 pr-1">
            {children}
          </div>
        </div>
      ) : null}
    </section>
  );
}
