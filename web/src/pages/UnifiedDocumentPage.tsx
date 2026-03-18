import { useCallback, useMemo, useEffect, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UnifiedEditor } from '@/components/UnifiedEditor';
import type { UnifiedDocument, SidebarData } from '@/components/UnifiedEditor';
import { useAuth } from '@/hooks/useAuth';
import { useAssignableMembersQuery } from '@/hooks/useTeamMembersQuery';
import { useProgramsQuery } from '@/hooks/useProgramsQuery';
import { useProjectsQuery } from '@/hooks/useProjectsQuery';
import { useDocumentConversion } from '@/hooks/useDocumentConversion';
import { apiGet, apiPatch, apiDelete, apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { issueKeys } from '@/hooks/useIssuesQuery';
import { projectKeys, useProjectWeeksQuery } from '@/hooks/useProjectsQuery';
import { TabBar } from '@/components/ui/TabBar';
import { useCurrentDocument } from '@/contexts/CurrentDocumentContext';
import { FleetGraphFab } from '@/components/FleetGraphFab';
import { useDocumentContextQuery } from '@/hooks/useDocumentContextQuery';
import type { BelongsTo } from '@ship/shared';
import {
  getTabsForDocument,
  documentTypeHasTabs,
  resolveTabLabels,
  type DocumentResponse,
  type TabCounts,
} from '@/lib/document-tabs';

type CurrentDocumentType =
  | 'wiki'
  | 'issue'
  | 'project'
  | 'program'
  | 'sprint'
  | 'person'
  | 'weekly_plan'
  | 'weekly_retro'
  | 'standup';

interface DocumentOwner {
  id: string;
  name: string;
  email: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNullableStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getNumberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? value
    : undefined;
}

function isCurrentDocumentType(value: string): value is CurrentDocumentType {
  return value === 'wiki'
    || value === 'issue'
    || value === 'project'
    || value === 'program'
    || value === 'sprint'
    || value === 'person'
    || value === 'weekly_plan'
    || value === 'weekly_retro'
    || value === 'standup';
}

function isConvertibleDocumentType(value: string): value is 'issue' | 'project' {
  return value === 'issue' || value === 'project';
}

function isIssueSource(value: unknown): value is 'internal' | 'external' | 'action_items' {
  return value === 'internal' || value === 'external' || value === 'action_items';
}

function isSprintStatus(value: unknown): value is 'planning' | 'active' | 'completed' {
  return value === 'planning' || value === 'active' || value === 'completed';
}

function isVisibility(value: unknown): value is 'private' | 'workspace' {
  return value === 'private' || value === 'workspace';
}

function isBelongsToType(value: unknown): value is BelongsTo['type'] {
  return value === 'program' || value === 'project' || value === 'sprint' || value === 'parent';
}

function getBelongsToRelations(value: unknown): BelongsTo[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const relations: BelongsTo[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return undefined;
    }

    const id = getStringValue(entry.id);
    const type = entry.type;
    if (!id || !isBelongsToType(type)) {
      return undefined;
    }

    relations.push({
      id,
      type,
      title: getStringValue(entry.title),
      color: getStringValue(entry.color),
    });
  }

  return relations;
}

function getDocumentOwner(value: unknown): DocumentOwner | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getStringValue(value.id);
  const name = getStringValue(value.name);
  const email = getStringValue(value.email);

  if (!id || !name || !email) {
    return null;
  }

  return { id, name, email };
}

/**
 * UnifiedDocumentPage - Renders any document type via /documents/:id route
 *
 * This page fetches a document by ID regardless of type and renders it
 * using the UnifiedEditor component with the appropriate sidebar data.
 * Document types with tabs (projects, programs) get a tabbed interface.
 */
export function UnifiedDocumentPage() {
  const { id, '*': wildcardPath } = useParams<{ id: string; '*'?: string }>();
  const navigate = useNavigate();

  // Parse wildcard path into tab and nested path
  // Example: /documents/abc/sprints/xyz -> wildcardPath = "sprints/xyz" -> tab = "sprints", nestedPath = "xyz"
  const pathSegments = wildcardPath ? wildcardPath.split('/').filter(Boolean) : [];
  const urlTab = pathSegments[0] || undefined;
  const nestedPath = pathSegments.length > 1 ? pathSegments.slice(1).join('/') : undefined;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setCurrentDocument, clearCurrentDocument } = useCurrentDocument();
  const documentContextQuery = useDocumentContextQuery(id);

  // Fetch the document by ID
  const { data: document, isLoading, error } = useQuery<DocumentResponse>({
    queryKey: ['document', id],
    queryFn: async () => {
      const response = await apiGet(`/api/documents/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found');
        }
        throw new Error('Failed to fetch document');
      }
      return response.json();
    },
    enabled: !!id,
    retry: false,
  });

  // Sync current document context for rail highlighting
  useEffect(() => {
    if (document && id) {
      if (!isCurrentDocumentType(document.document_type)) {
        return;
      }

      const properties = isRecord(document.properties) ? document.properties : undefined;
      // Extract projectId for weekly documents
      const projectId = (document.document_type === 'weekly_plan' || document.document_type === 'weekly_retro')
        ? getStringValue(properties?.project_id) ?? null
        : null;
      setCurrentDocument(id, document.document_type, projectId);
    }
    return () => {
      clearCurrentDocument();
    };
  }, [document, id, setCurrentDocument, clearCurrentDocument]);



  // Set default active tab when document loads (status-aware for sprints)
  const tabConfig = document ? getTabsForDocument(document) : [];
  const hasTabs = document ? documentTypeHasTabs(document.document_type) : false;
  const normalizedUrlTab = useMemo(() => {
    if (urlTab === 'sprints' && tabConfig.some(t => t.id === 'weeks')) {
      return 'weeks';
    }
    return urlTab;
  }, [urlTab, tabConfig]);

  // Derive activeTab from URL - if valid tab in URL, use it; otherwise default to first tab
  const activeTab = useMemo(() => {
    if (normalizedUrlTab && tabConfig.some(t => t.id === normalizedUrlTab)) {
      return normalizedUrlTab;
    }
    return tabConfig[0]?.id || '';
  }, [normalizedUrlTab, tabConfig]);

  // Redirect to clean URL if tab is invalid (prevents broken bookmarks and typos)
  useEffect(() => {
    if (!document || !id) return;

    // If URL has a tab but it's not valid for this document type, redirect to base URL
    const isValidTab = normalizedUrlTab ? tabConfig.some(t => t.id === normalizedUrlTab) : false;
    if (urlTab && !isValidTab) {
      console.warn(`Invalid tab "${urlTab}" for document type "${document.document_type}", redirecting to base URL`);
      navigate(`/documents/${id}`, { replace: true });
    }
  }, [document, id, urlTab, normalizedUrlTab, tabConfig, navigate]);

  // Fetch team members for sidebar data
  const { data: teamMembersData = [] } = useAssignableMembersQuery();
  const teamMembers = useMemo(() => teamMembersData.map(m => ({
    id: m.id,
    user_id: m.user_id,
    name: m.name,
    email: m.email || '',
  })), [teamMembersData]);

  // Fetch programs for sidebar data
  const { data: programsData = [] } = useProgramsQuery();
  const programs = useMemo(() => programsData.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    emoji: p.emoji,
  })), [programsData]);

  // Fetch projects for issue sidebar (multi-association)
  const { data: projectsData = [] } = useProjectsQuery();
  const projects = useMemo(() => projectsData.map(p => ({
    id: p.id,
    title: p.title,
    color: p.color,
  })), [projectsData]);

  // Fetch counts for tabs (project weeks, etc.)
  const isProject = document?.document_type === 'project';
  const isProgram = document?.document_type === 'program';
  const { data: projectWeeks = [] } = useProjectWeeksQuery(isProject ? id : undefined);

  // Compute tab counts based on document type
  const tabCounts: TabCounts = useMemo(() => {
    if (isProject) {
      const issueCount = getNumberValue(document?.issue_count) ?? 0;
      return {
        issues: issueCount,
        weeks: projectWeeks.length,
      };
    }
    if (isProgram) {
      // For programs, counts will be loaded by the tab components themselves
      return {};
    }
    return {};
  }, [document, isProject, isProgram, projectWeeks.length]);

  // Handler for when associations change (invalidate document query to refetch)
  const handleAssociationChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['document', id] });
  }, [queryClient, id]);

  // Document conversion (issue <-> project)
  const { convert, isConverting } = useDocumentConversion({
    navigateAfterConvert: true,
  });

  // Conversion callbacks that use the current document
  const handleConvert = useCallback(() => {
    if (!document || !id) return;
    if (!isConvertibleDocumentType(document.document_type)) {
      return;
    }

    convert(id, document.document_type, document.title);
  }, [convert, document, id]);

  const handleUndoConversion = useCallback(async () => {
    if (!document || !id) return;

    try {
      const res = await apiPost(`/api/documents/${id}/undo-conversion`, {});

      if (res.ok) {
        // Invalidate caches to refresh the UI
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: issueKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: ['document', id] }),
        ]);
        showToast('Conversion undone successfully', 'success');
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to undo conversion', 'error');
      }
    } catch (err) {
      showToast('Failed to undo conversion', 'error');
    }
  }, [document, id, queryClient, showToast]);

  // Handle document type change via DocumentTypeSelector
  const handleTypeChange = useCallback(async (newType: string) => {
    if (!document || !id) return;

    const currentType = document.document_type;

    // Only issue <-> project conversions are supported
    const isValidConversion =
      (currentType === 'issue' && newType === 'project') ||
      (currentType === 'project' && newType === 'issue');

    if (!isValidConversion) {
      showToast(`Converting ${currentType} to ${newType} is not supported`, 'error');
      return;
    }

    try {
      const res = await apiPost(`/api/documents/${id}/convert`, { target_type: newType });

      if (res.ok) {
        const data = await res.json();

        // Invalidate caches
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: issueKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: ['document', id] }),
        ]);

        // Navigate to the new document
        navigate(`/documents/${data.id}`, { replace: true });
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to convert document', 'error');
      }
    } catch (err) {
      showToast('Failed to convert document', 'error');
    }
  }, [document, id, navigate, queryClient, showToast]);

  // Handle WebSocket notification that document was converted
  const handleDocumentConverted = useCallback((newDocId: string) => {
    navigate(`/documents/${newDocId}`, { replace: true });
  }, [navigate]);

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async ({ documentId, updates }: { documentId: string; updates: Partial<UnifiedDocument> }) => {
      const response = await apiPatch(`/api/documents/${documentId}`, updates);
      if (!response.ok) {
        throw new Error('Failed to update document');
      }
      return response.json();
    },
    onMutate: async ({ documentId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['document', documentId] });

      // Snapshot the previous value
      const previousDocument = queryClient.getQueryData<Record<string, unknown>>(['document', documentId]);

      // Optimistically update the document cache
      if (previousDocument) {
        queryClient.setQueryData(['document', documentId], { ...previousDocument, ...updates });
      }

      // Return context with the previous value for rollback
      return { previousDocument, documentId };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousDocument && context?.documentId) {
        queryClient.setQueryData(['document', context.documentId], context.previousDocument);
      }
    },
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      // Also invalidate type-specific queries for list views
      if (document?.document_type) {
        queryClient.invalidateQueries({ queryKey: [document.document_type + 's', 'list'] });
        if (document.document_type === 'wiki') {
          queryClient.invalidateQueries({ queryKey: ['documents', 'wiki'] });
        }
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiDelete(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
    },
    onSuccess: () => {
      navigate('/docs');
    },
  });

  // Handle update
  const handleUpdate = useCallback(async (updates: Partial<UnifiedDocument>) => {
    if (!id) return;
    await updateMutation.mutateAsync({ documentId: id, updates });
  }, [updateMutation, id]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation, id]);

  const isWeeklyDoc = document?.document_type === 'weekly_plan' || document?.document_type === 'weekly_retro';
  const isStandup = document?.document_type === 'standup';
  const hideBackButton = isWeeklyDoc || isStandup;

  // Resolve standup author name for title suffix
  const standupAuthorName = useMemo(() => {
    if (!isStandup) return undefined;
    const properties = document && isRecord(document.properties) ? document.properties : undefined;
    const authorId = getStringValue(properties?.author_id);
    if (!authorId) return undefined;
    return teamMembersData.find(m => m.user_id === authorId)?.name;
  }, [isStandup, document?.properties?.author_id, teamMembersData]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    // Navigate to type-specific list or docs
    if (document?.document_type === 'issue') {
      navigate('/issues');
    } else if (document?.document_type === 'project') {
      navigate('/projects');
    } else if (document?.document_type === 'sprint') {
      navigate('/sprints');
    } else if (document?.document_type === 'program') {
      navigate('/programs');
    } else {
      navigate('/docs');
    }
  }, [document, navigate]);

  // Compute back label based on document type (just the noun - Editor adds "Back to")
  // Weekly plans/retros don't show a back button
  const backLabel = useMemo(() => {
    switch (document?.document_type) {
      case 'issue': return 'issues';
      case 'project': return 'projects';
      case 'sprint': return 'weeks';
      case 'program': return 'programs';
      default: return 'docs';
    }
  }, [document?.document_type]);

  // Build sidebar data based on document type
  const sidebarData: SidebarData = useMemo(() => {
    if (!document) return {};

    switch (document.document_type) {
      case 'wiki':
        return {
          teamMembers,
        };
      case 'issue':
        return {
          teamMembers,
          programs,
          projects,
          onAssociationChange: handleAssociationChange,
          onConvert: handleConvert,
          onUndoConversion: handleUndoConversion,
          isConverting,
          isUndoing: isConverting,
        };
      case 'project':
        return {
          programs,
          people: teamMembers,
          onConvert: handleConvert,
          onUndoConversion: handleUndoConversion,
          isConverting,
          isUndoing: isConverting,
        };
      case 'sprint':
        return {};
      default:
        return {};
    }
  }, [document, teamMembers, programs, projects, handleAssociationChange, handleConvert, handleUndoConversion, isConverting]);

  // Transform API response to UnifiedDocument format
  const unifiedDocument: UnifiedDocument | null = useMemo(() => {
    if (!document) return null;

    // Extract program_id from belongs_to array (via document_associations)
    if (!isCurrentDocumentType(document.document_type)) {
      return null;
    }

    const properties = isRecord(document.properties) ? document.properties : undefined;
    const belongsTo = getBelongsToRelations(document.belongs_to);
    const programIdFromBelongsTo = belongsTo?.find(b => b.type === 'program')?.id;
    const sprintIdFromBelongsTo = belongsTo?.find(b => b.type === 'sprint')?.id;

    const createdBy = document.created_by === null ? null : getStringValue(document.created_by);
    const baseDocument = {
      id: document.id,
      title: document.title,
      document_type: document.document_type,
      created_at: document.created_at,
      updated_at: document.updated_at,
      created_by: createdBy,
      properties,
    };

    if (document.document_type === 'issue') {
      const rawSource = document.source;
      const source = isIssueSource(rawSource) ? rawSource : undefined;
      const ticketNumber = getNumberValue(document.ticket_number);

      return {
        ...baseDocument,
        document_type: 'issue',
        state: getStringValue(document.state) ?? 'backlog',
        priority: getStringValue(document.priority) ?? 'medium',
        estimate: getNumberValue(document.estimate) ?? null,
        assignee_id: getNullableStringValue(document.assignee_id),
        assignee_name: getNullableStringValue(document.assignee_name),
        program_id: programIdFromBelongsTo ?? null,
        sprint_id: sprintIdFromBelongsTo ?? null,
        source,
        converted_from_id: getNullableStringValue(document.converted_from_id),
        display_id: ticketNumber ? `#${ticketNumber}` : undefined,
        belongs_to: belongsTo,
      };
    }

    if (document.document_type === 'project') {
      return {
        ...baseDocument,
        document_type: 'project',
        impact: getNumberValue(document.impact) ?? null,
        confidence: getNumberValue(document.confidence) ?? null,
        ease: getNumberValue(document.ease) ?? null,
        color: getStringValue(document.color) ?? '#3b82f6',
        emoji: getNullableStringValue(document.emoji),
        program_id: programIdFromBelongsTo ?? null,
        owner: getDocumentOwner(document.owner),
        owner_id: getNullableStringValue(document.owner_id),
        accountable_id: getNullableStringValue(document.accountable_id),
        consulted_ids: getStringArray(document.consulted_ids),
        informed_ids: getStringArray(document.informed_ids),
        converted_from_id: getNullableStringValue(document.converted_from_id),
      };
    }

    if (document.document_type === 'sprint') {
      const status = isSprintStatus(document.status) ? document.status : 'planning';

      return {
        ...baseDocument,
        document_type: 'sprint',
        start_date: getStringValue(document.start_date) ?? '',
        end_date: getStringValue(document.end_date) ?? '',
        status,
        program_id: programIdFromBelongsTo ?? null,
        plan: getStringValue(document.plan) ?? '',
      };
    }

    if (document.document_type === 'wiki') {
      const visibility = isVisibility(document.visibility) ? document.visibility : undefined;

      return {
        ...baseDocument,
        document_type: 'wiki',
        parent_id: getNullableStringValue(document.parent_id),
        visibility,
      };
    }

    return baseDocument;
  }, [document]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error || !document) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-muted">
          {error?.message || 'Document not found'}
        </div>
        <button
          onClick={() => navigate('/docs')}
          className="text-sm text-accent hover:underline"
        >
          Go to Documents
        </button>
      </div>
    );
  }

  if (!user || !unifiedDocument) {
    return null;
  }

  // Documents with tabs get a tabbed interface
  if (hasTabs && tabConfig.length > 0) {
    const tabs = resolveTabLabels(tabConfig, document, tabCounts);
    const currentTabConfig = tabConfig.find(t => t.id === activeTab) || tabConfig[0];
    const TabComponent = currentTabConfig?.component;

    return (
      <div
        className="flex h-full min-h-0 flex-col overflow-y-auto"
        data-testid="fleetgraph-document-page-shell"
      >
        {/* Tab bar */}
        <div className="border-b border-border px-4">
          <TabBar
            tabs={tabs}
            activeTab={activeTab || tabs[0]?.id}
            onTabChange={(tab) => {
              // Navigate to new URL - first tab gets clean URL, others get tab suffix
              if (tab === tabConfig[0]?.id) {
                navigate(`/documents/${id}`);
              } else {
                navigate(`/documents/${id}/${tab}`);
              }
            }}
          />
        </div>

        {/* Content area with lazy-loaded tab component */}
        <div className="min-h-0 flex-1" data-testid="document-tab-content">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="text-muted">Loading...</div>
              </div>
            }
          >
            {TabComponent && (
              <TabComponent documentId={document.id} document={document} nestedPath={nestedPath} />
            )}
          </Suspense>
        </div>
        <FleetGraphFab
          context={documentContextQuery.data}
          documentId={document.id}
          documentTitle={document.title}
          documentType={document.document_type}
        />
      </div>
    );
  }

  // Non-tabbed documents render directly in editor
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto"
      data-testid="fleetgraph-document-page-shell"
    >
      <div className="min-h-0 flex-1" data-testid="document-editor-content">
        <UnifiedEditor
          document={unifiedDocument}
          sidebarData={sidebarData}
          onUpdate={handleUpdate}
          onTypeChange={handleTypeChange}
          onDocumentConverted={handleDocumentConverted}
          onBack={hideBackButton ? undefined : handleBack}
          backLabel={hideBackButton ? undefined : backLabel}
          onDelete={handleDelete}
          showTypeSelector={true}
          titleSuffix={standupAuthorName}
        />
      </div>
      <FleetGraphFab
        context={documentContextQuery.data}
        documentId={document.id}
        documentTitle={document.title}
        documentType={document.document_type}
      />
    </div>
  );
}
