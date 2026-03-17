import { useId, useState, type ReactNode } from 'react';

interface FleetGraphDebugDisclosureProps {
  children: ReactNode;
  title?: string;
}

export function FleetGraphDebugDisclosure({
  children,
  title = 'Debug details',
}: FleetGraphDebugDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-md border border-dashed border-border bg-background/70 px-3 py-2">
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? 'Hide debug details' : title}
      </button>

      {isOpen ? (
        <div className="mt-2 space-y-2 text-xs text-muted" id={panelId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
