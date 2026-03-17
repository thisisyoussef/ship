import { useEffect, useState, type ReactNode } from 'react';

import { useFleetGraphDebugSurface } from '@/components/FleetGraphDebugSurface';
import { formatFleetGraphTimestamp } from '@/lib/fleetgraph-findings-presenter';

function endpointLabel(endpoint?: { method: string; path: string }) {
  return endpoint ? `${endpoint.method} ${endpoint.path}` : null;
}

function DockSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-background px-3 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FleetGraphDebugDock() {
  const debug = useFleetGraphDebugSurface();
  const itemCount = debug.findings.length + (debug.entry ? 1 : 0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {isOpen ? (
        <div
          aria-label="FleetGraph debug"
          className="z-50 w-[min(calc(100vw-2rem),24rem)] rounded-2xl border border-border bg-muted/95 p-3 shadow-2xl backdrop-blur"
          role="dialog"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">FleetGraph debug</h2>
              <p className="text-xs text-muted">
                Secondary QA details for this page. The main cards stay human-first.
              </p>
            </div>
            <button
              aria-label="Close FleetGraph debug"
              className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-auto pr-1">
            {debug.entry ? (
              <DockSection title="Current entry result">
                <div className="space-y-1 text-xs text-muted">
                  <p className="font-medium text-foreground">{debug.entry.title}</p>
                  <p>{debug.entry.threadId}</p>
                  <p>Route surface: {debug.entry.routeLabel}</p>
                  <p>Result surface: {debug.entry.surfaceLabel}</p>
                  {endpointLabel(debug.entry.approvalEndpoint) ? (
                    <p>Approval endpoint: {endpointLabel(debug.entry.approvalEndpoint)}</p>
                  ) : null}
                </div>
              </DockSection>
            ) : null}

            {debug.findings.length > 0 ? (
              <DockSection title="Active findings">
                <div className="space-y-3">
                  {debug.findings.map((finding) => (
                    <div
                      className="space-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted"
                      key={finding.id}
                    >
                      <p className="font-medium text-foreground">{finding.title}</p>
                      <p>{finding.threadId}</p>
                      <p>Status: {finding.status}</p>
                      <p>Finding key: {finding.findingKey}</p>
                      <p>Updated: {formatFleetGraphTimestamp(finding.updatedAt)}</p>
                      {endpointLabel(finding.actionEndpoint) ? (
                        <p>Action endpoint: {endpointLabel(finding.actionEndpoint)}</p>
                      ) : null}
                      {finding.tracePublicUrl ? (
                        <a
                          className="inline-flex font-medium text-accent hover:underline"
                          href={finding.tracePublicUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open trace evidence
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </DockSection>
            ) : null}
          </div>
        </div>
      ) : null}

      <div>
          <button
            aria-label="Open FleetGraph debug"
            aria-expanded={isOpen}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsOpen((current) => !current);
              }
            }}
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
            FleetGraph debug
            <span className="inline-flex min-w-5 justify-center rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {itemCount}
            </span>
          </button>
      </div>
    </div>
  );
}
