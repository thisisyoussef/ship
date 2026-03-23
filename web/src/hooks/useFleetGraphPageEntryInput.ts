import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { DocumentContext } from '@/hooks/useDocumentContextQuery'
import { apiGet } from '@/lib/api'
import type {
  FleetGraphEntryDocument,
  FleetGraphEntryInput,
} from '@/lib/fleetgraph-entry'

interface UseFleetGraphPageEntryInputArgs {
  activeTab?: string
  context?: DocumentContext
  contextError?: string
  document: FleetGraphEntryDocument | null
  loading?: boolean
  nestedPath?: string
  userId?: string | null
}

export function useFleetGraphPageEntryInput({
  activeTab,
  context,
  contextError,
  document,
  loading = false,
  nestedPath,
  userId,
}: UseFleetGraphPageEntryInputArgs) {
  const needsWeekReviewState = document?.documentType === 'sprint' && activeTab === 'review'

  const reviewStateQuery = useQuery({
    queryKey: ['fleetgraphEntryReviewState', document?.id],
    queryFn: async () => {
      if (!document?.id) {
        throw new Error('FleetGraph needs a document id for review-state lookup.')
      }

      const response = await apiGet(`/api/weeks/${document.id}/review`)
      if (!response.ok) {
        throw new Error('FleetGraph could not load the current week review state.')
      }
      const data = await response.json() as {
        content?: Record<string, unknown>
        is_draft: boolean
        plan_validated?: boolean | null
        title?: string | null
      }
      return {
        content: data.content,
        isDraft: data.is_draft,
        planValidated: data.plan_validated ?? null,
        title: data.title ?? null,
      }
    },
    enabled: needsWeekReviewState && Boolean(document?.workspaceId),
    staleTime: 15_000,
  })

  const effectiveDocument = useMemo(() => {
    if (!document) {
      return null
    }

    return {
      ...document,
      reviewState: needsWeekReviewState
        ? (reviewStateQuery.data ?? null)
        : document.reviewState,
    }
  }, [document, needsWeekReviewState, reviewStateQuery.data])

  const entry = useMemo<FleetGraphEntryInput | null>(() => {
    if (!context || !effectiveDocument || !userId) {
      return null
    }

    return {
      activeTab,
      context,
      document: effectiveDocument,
      nestedPath,
      userId,
    }
  }, [activeTab, context, effectiveDocument, nestedPath, userId])

  const helperText =
    reviewStateQuery.error instanceof Error
      ? reviewStateQuery.error.message
      : contextError
        ?? (loading
          ? 'Loading the current Ship context for FleetGraph.'
          : reviewStateQuery.isLoading
            ? 'Loading the current week review state for FleetGraph.'
            : document?.workspaceId
              ? 'FleetGraph can review the page you are on and suggest the next step.'
              : 'This page is missing workspace details, so FleetGraph is unavailable here.')

  return {
    entry,
    helperText,
    isActionDisabled:
      loading || reviewStateQuery.isLoading || !entry || !document?.workspaceId,
  }
}
