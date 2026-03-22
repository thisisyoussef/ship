import { useState, type FormEvent } from 'react'

export interface FleetGraphConversationFinding {
  actionTier: 'A' | 'B' | 'C'
  evidence: string[]
  findingType: string
  proposedAction?: {
    endpoint: {
      method: string
      path: string
    }
    label: string
    targetId: string
    targetType: string
  }
  severity: 'info' | 'warning' | 'critical'
  summary: string
  title: string
}

export interface FleetGraphConversationEntry {
  content: string
  findings?: FleetGraphConversationFinding[]
  role: 'assistant' | 'user'
  timestamp: string
}

function FindingBadge({ severity }: { severity: FleetGraphConversationFinding['severity'] }) {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
  }

  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs ${colors[severity]}`}>
      {severity}
    </span>
  )
}

export function FleetGraphFindingCard({
  finding,
}: {
  finding: FleetGraphConversationFinding
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border bg-background px-3 py-3">
      <div className="flex items-center gap-2">
        <FindingBadge severity={finding.severity} />
        <span className="text-sm font-medium text-foreground">{finding.title}</span>
      </div>
      <p className="text-sm text-muted">{finding.summary}</p>
      {finding.proposedAction ? (
        <div className="pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Suggested next step
          </p>
          <p className="mt-1 text-sm font-medium text-indigo-700">
            {finding.proposedAction.label}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ConversationMessage({ entry }: { entry: FleetGraphConversationEntry }) {
  const isUser = entry.role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-background text-foreground border border-border'
        }`}
      >
        {entry.content}
      </div>
      {entry.findings && entry.findings.length > 0 ? (
        <div className="mt-2 w-full space-y-2">
          {entry.findings.map((finding) => (
            <FleetGraphFindingCard key={`${finding.findingType}:${finding.title}`} finding={finding} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FleetGraphConversationFeed({
  conversation,
}: {
  conversation: FleetGraphConversationEntry[]
}) {
  return (
    <div className="space-y-3">
      {conversation.map((entry) => (
        <ConversationMessage
          key={`${entry.role}:${entry.timestamp}:${entry.content}`}
          entry={entry}
        />
      ))}
    </div>
  )
}

export function FleetGraphFollowUpComposer({
  disabled = false,
  isResponding = false,
  onSend,
}: {
  disabled?: boolean
  isResponding?: boolean
  onSend: (message: string) => void
}) {
  const [input, setInput] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || disabled || isResponding) {
      return
    }

    onSend(message)
    setInput('')
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-black caret-black placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={disabled || isResponding}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a follow-up..."
          type="text"
          value={input}
        />
        <button
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!input.trim() || disabled || isResponding}
          type="submit"
        >
          Send
        </button>
      </div>
      {isResponding ? (
        <p className="text-sm text-muted">FleetGraph is thinking about your follow-up.</p>
      ) : null}
    </form>
  )
}
