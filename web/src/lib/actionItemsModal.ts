export type ActionItemsModalOpenReason = 'auto' | 'manual' | null;

export function isDocumentDetailPath(pathname: string): boolean {
  return pathname.startsWith('/documents/');
}

export function shouldAutoOpenActionItemsModal({
  disabled,
  alreadyShown,
  hasActionItems,
  hasItems,
  pathname,
}: {
  disabled: boolean;
  alreadyShown: boolean;
  hasActionItems: boolean;
  hasItems: boolean;
  pathname: string;
}): boolean {
  return !disabled && !alreadyShown && hasActionItems && hasItems && !isDocumentDetailPath(pathname);
}

export function shouldCloseAutoOpenedActionItemsModal({
  openReason,
  pathname,
}: {
  openReason: ActionItemsModalOpenReason;
  pathname: string;
}): boolean {
  return openReason === 'auto' && isDocumentDetailPath(pathname);
}
