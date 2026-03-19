import * as Dialog from '@radix-ui/react-dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  confirmDisabled?: boolean;
  variant?: 'default' | 'destructive' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  cancelDisabled = false,
  confirmDisabled = false,
  variant = 'default',
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const confirmButtonClass = variant === 'destructive'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
    : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600'
      : 'bg-accent hover:bg-accent/90 focus:ring-accent';

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className="fixed left-1/2 top-1/2 z-[101] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/80 bg-background p-6 shadow-2xl focus:outline-none"
          onEscapeKeyDown={onCancel}
        >
          <Dialog.Title className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </Dialog.Title>

          {description && (
            <Dialog.Description className="mt-3 text-sm leading-6 text-muted">
              {description}
            </Dialog.Description>
          )}

          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              disabled={cancelDisabled}
              onClick={onCancel}
              type="button"
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/40 focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              disabled={confirmDisabled}
              onClick={onConfirm}
              type="button"
              className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
