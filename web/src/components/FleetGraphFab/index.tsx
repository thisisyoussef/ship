/**
 * FleetGraphFab - Enhanced Floating Action Button with Tabs
 *
 * Single entry point for FleetGraph intelligence:
 * - Findings tab: Proactive findings from the graph
 * - Analyze tab: Chat-based document analysis
 */

import { useState } from 'react'

import type { DocumentContext } from '@/hooks/useDocumentContextQuery'
import { useFleetGraphFindings } from '@/hooks/useFleetGraphFindings'
import { buildFleetGraphFindingDocumentIds } from '@/lib/fleetgraph-findings'

import { AnalysisSection } from './AnalysisSection'
import { FindingsSection } from './FindingsSection'

interface FleetGraphFabProps {
  context?: DocumentContext
  documentId: string
  documentTitle: string
  documentType: string
}

type TabId = 'findings' | 'analyze'

export function FleetGraphFab({
  context,
  documentId,
  documentTitle,
  documentType,
}: FleetGraphFabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('findings')

  // Get finding count for badge
  const documentIds = buildFleetGraphFindingDocumentIds(documentId, context)
  const findings = useFleetGraphFindings(documentIds)
  const findingCount = findings.findings.length

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'findings', label: 'Findings', count: findingCount },
    { id: 'analyze', label: 'Analyze' },
  ]

  return (
    <>
      {/* FAB Button */}
      <button
        aria-label="FleetGraph Intelligence"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        )}
        {/* Badge */}
        {!isOpen && findingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {findingCount > 9 ? '9+' : findingCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-[4.5rem] sm:bottom-20 z-50 max-h-[75vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden right-2 left-2 sm:left-auto sm:right-6 sm:w-[420px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <span className="text-sm font-semibold text-gray-900">FleetGraph</span>
              <span className="text-xs text-gray-500 ml-auto truncate max-w-[180px]">
                {documentType}: {documentTitle}
              </span>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.count > 9 ? '9+' : tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content — both tabs always mounted to preserve state across switches */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0" style={{ maxHeight: 'calc(75vh - 120px)' }}>
            <div style={{ display: activeTab === 'findings' ? 'block' : 'none' }}>
              <FindingsSection
                context={context}
                currentDocumentId={documentId}
                loading={findings.isLoading}
                onOpenAnalyze={() => setActiveTab('analyze')}
              />
            </div>
            <div style={{ display: activeTab === 'analyze' ? 'block' : 'none' }}>
              <AnalysisSection
                documentId={documentId}
                documentTitle={documentTitle}
                documentType={documentType}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
