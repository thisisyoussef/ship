/**
 * @deprecated Use useUnifiedDocuments from '@/hooks/useUnifiedDocuments' instead.
 *
 * This context is maintained for backward compatibility but should not be used
 * for new code. The unified document model treats all document types consistently
 * through a single hook.
 *
 * Migration:
 *   Before: const { documents } = useDocuments()
 *   After:  const { byType: { wiki: documents } } = useUnifiedDocuments({ type: 'wiki' })
 */
import { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  useCreateDocument,
  useDeleteDocument,
  useDocumentsQuery,
  useUpdateDocument,
  WikiDocument,
} from '@/hooks/useDocumentsQuery';

export type { WikiDocument };

interface DocumentsContextValue {
  documents: WikiDocument[];
  loading: boolean;
  createDocument: (parentId?: string) => Promise<WikiDocument | null>;
  updateDocument: (id: string, updates: Partial<WikiDocument>) => Promise<WikiDocument | null>;
  deleteDocument: (id: string) => Promise<boolean>;
  refreshDocuments: () => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const wikiQuery = useDocumentsQuery('wiki');
  const sprintQuery = useDocumentsQuery('sprint');
  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();

  const documents = useMemo(() => {
    return [...(wikiQuery.data || []), ...(sprintQuery.data || [])];
  }, [sprintQuery.data, wikiQuery.data]);

  const loading = wikiQuery.isLoading || sprintQuery.isLoading;

  const createDocument = async (parentId?: string): Promise<WikiDocument | null> => {
    try {
      return await createMutation.mutateAsync({ parent_id: parentId });
    } catch {
      return null;
    }
  };

  const updateDocument = async (id: string, updates: Partial<WikiDocument>): Promise<WikiDocument | null> => {
    try {
      return await updateMutation.mutateAsync({ id, updates });
    } catch {
      return null;
    }
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const refreshDocuments = async (): Promise<void> => {
    await Promise.all([wikiQuery.refetch(), sprintQuery.refetch()]);
  };

  return (
    <DocumentsContext.Provider value={{
      documents,
      loading,
      createDocument,
      updateDocument,
      deleteDocument,
      refreshDocuments,
    }}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error('useDocuments must be used within DocumentsProvider');
  }
  return context;
}
