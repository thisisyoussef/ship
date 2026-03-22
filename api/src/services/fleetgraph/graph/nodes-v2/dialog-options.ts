import type {
  FleetGraphActionDraft,
  FleetGraphSelectOption,
} from '../../actions/registry.js'
import type { FleetGraphStateV2 } from '../state-v2.js'
import type { ShipIssue, ShipPerson } from '../types-v2.js'

const CLOSED_ISSUE_STATES = new Set(['cancelled', 'closed', 'done'])

function readHintedDialogOptions(
  draft: FleetGraphActionDraft
): Record<string, FleetGraphSelectOption[]> {
  const rawOptions = draft.contextHints?.dialogOptions
  if (!rawOptions || typeof rawOptions !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(rawOptions).filter((entry): entry is [string, FleetGraphSelectOption[]] => {
      const [, value] = entry
      return Array.isArray(value)
    })
  )
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Map<string, T>()
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.set(item.id, item)
    }
  }
  return Array.from(seen.values())
}

function readPeople(state: FleetGraphStateV2) {
  return dedupeById([
    ...state.rawPeople,
    ...(state.rawIssueCluster?.relatedPeople ?? []),
    ...(state.rawWeekCluster?.relatedPeople ?? []),
    ...(state.rawProjectCluster?.relatedPeople ?? []),
    ...(state.rawProgramCluster?.relatedPeople ?? []),
  ])
}

function readIssues(state: FleetGraphStateV2) {
  const issues = new Map<string, ShipIssue>()
  const addIssue = (issue: ShipIssue | undefined) => {
    if (issue && !issues.has(issue.id)) {
      issues.set(issue.id, issue)
    }
  }

  addIssue(state.rawIssueCluster?.issue)
  for (const issue of state.rawIssueCluster?.children ?? []) {
    addIssue(issue)
  }
  for (const issue of state.rawWeekCluster?.issues ?? []) {
    addIssue(issue)
  }
  for (const issue of state.rawProjectCluster?.issues ?? []) {
    addIssue(issue)
  }

  return Array.from(issues.values())
}

function isOpenIssue(issue: ShipIssue) {
  return !CLOSED_ISSUE_STATES.has(issue.state.toLowerCase())
}

function issueLabel(issue: ShipIssue) {
  return issue.title.trim().length > 0 ? issue.title : issue.id
}

function personLabel(person: ShipPerson) {
  return person.name.trim().length > 0
    ? person.name
    : person.email?.trim().length
      ? person.email
      : person.id
}

function toIssueOptions(issues: ShipIssue[]) {
  return issues.map((issue) => ({
    label: issueLabel(issue),
    value: issue.id,
  }))
}

function toPersonOptions(people: ShipPerson[]) {
  return people.map((person) => ({
    label: personLabel(person),
    value: person.id,
  }))
}

function deriveStateDialogOptions(
  state: FleetGraphStateV2,
  draft: FleetGraphActionDraft
): Record<string, FleetGraphSelectOption[]> {
  const people = readPeople(state)
  const issues = readIssues(state).filter(isOpenIssue)

  switch (draft.actionType) {
    case 'assign_owner':
      return {
        person_id: toPersonOptions(people),
      }
    case 'assign_issues':
      return {
        issue_ids: toIssueOptions(
          issues.filter((issue) => issue.sprintId === draft.targetId && !issue.assigneeId)
        ),
        person_id: toPersonOptions(people),
      }
    case 'rebalance_load':
      return {
        issues: toIssueOptions(
          issues.filter((issue) => issue.assigneeId === draft.targetId)
        ),
        people: toPersonOptions(
          people.filter((person) => person.id !== draft.targetId)
        ),
      }
    default:
      return {}
  }
}

export function resolveDialogOptions(
  state: FleetGraphStateV2,
  draft: FleetGraphActionDraft
): Record<string, FleetGraphSelectOption[]> {
  const hinted = readHintedDialogOptions(draft)
  const derived = deriveStateDialogOptions(state, draft)
  const keys = new Set([...Object.keys(derived), ...Object.keys(hinted)])

  return Array.from(keys).reduce<Record<string, FleetGraphSelectOption[]>>((options, key) => {
    const hintedOptions = hinted[key]
    options[key] = hintedOptions && hintedOptions.length > 0
      ? hintedOptions
      : (derived[key] ?? [])
    return options
  }, {})
}
