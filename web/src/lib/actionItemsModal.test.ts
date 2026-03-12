import { describe, expect, it } from 'vitest';
import {
  isDocumentDetailPath,
  shouldAutoOpenActionItemsModal,
  shouldCloseAutoOpenedActionItemsModal,
} from './actionItemsModal';

describe('actionItemsModal helpers', () => {
  it('detects document detail routes', () => {
    expect(isDocumentDetailPath('/documents/doc-1')).toBe(true);
    expect(isDocumentDetailPath('/docs')).toBe(false);
  });

  it('does not auto-open on document detail routes', () => {
    expect(shouldAutoOpenActionItemsModal({
      disabled: false,
      alreadyShown: false,
      hasActionItems: true,
      hasItems: true,
      pathname: '/documents/doc-1',
    })).toBe(false);
  });

  it('still auto-opens on non-document routes when pending items exist', () => {
    expect(shouldAutoOpenActionItemsModal({
      disabled: false,
      alreadyShown: false,
      hasActionItems: true,
      hasItems: true,
      pathname: '/docs',
    })).toBe(true);
  });

  it('closes only auto-opened modals on document routes', () => {
    expect(shouldCloseAutoOpenedActionItemsModal({
      openReason: 'auto',
      pathname: '/documents/doc-1',
    })).toBe(true);

    expect(shouldCloseAutoOpenedActionItemsModal({
      openReason: 'manual',
      pathname: '/documents/doc-1',
    })).toBe(false);
  });
});
