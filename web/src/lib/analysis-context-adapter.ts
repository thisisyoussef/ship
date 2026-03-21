export interface AnalysisContext {
  surface: 'analysis'
  entity_type: string
  entity_id: string
  entity_title?: string
  selected_ids?: string[]
  filters?: Record<string, string[]>
  date_range?: { start: string; end: string }
  visible_metrics?: string[]
  comparison_ids?: string[]
}

export function buildAnalysisContext(
  documentId: string,
  documentType: string,
  documentTitle: string
): AnalysisContext {
  return {
    surface: 'analysis',
    entity_type: documentType,
    entity_id: documentId,
    entity_title: documentTitle,
    selected_ids: [documentId],
  }
}
