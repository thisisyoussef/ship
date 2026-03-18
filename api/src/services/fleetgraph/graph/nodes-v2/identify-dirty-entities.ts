/**
 * identify_dirty_entities - Proactive Lane
 *
 * Lane: Proactive
 * Type: Deterministic filter
 * LLM: No
 *
 * Applies deterministic threshold checks to identify suspect entities
 * that need deeper analysis. This is the rule-gating layer that keeps
 * clean sweeps token-free.
 *
 * Checks:
 * - Week-start drift: Week status == "planning" AND sprint_start_date has passed
 * - Empty active week: Week status == "active" AND issue count == 0
 * - Missing standup: Business day, active week, assignee has active issues, no standup by noon
 * - Approval gap: Plan/review changes_requested or unapproved > 1 business day
 * - Deadline risk: Project target_date within 7 days AND issues criteria met
 * - Workload imbalance: Assignee has > 50% of open estimate or > 2x median
 * - Blocker aging: Same blocker text in 2 consecutive iterations or no update 3 days
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type {
  ShipProject,
  ShipWeek,
  ShipIssue,
  ShipPerson,
  ShipAccountabilityItem,
  ShipStandup,
  SuspectEntity,
  FleetGraphV2SuspectType,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

/** Hours of grace after sprint start before flagging week-start drift */
const WEEK_START_GRACE_HOURS = 4

/** Days until target date to consider deadline risk */
const DEADLINE_RISK_DAYS = 7

/** Minimum open issues for deadline risk */
const DEADLINE_RISK_MIN_ISSUES = 3

/** Hours without update for stale issues */
const STALE_ISSUE_HOURS = 48

/** Workload imbalance threshold (percentage of total) */
const WORKLOAD_IMBALANCE_THRESHOLD = 0.5

/** Workload imbalance multiplier relative to median */
const WORKLOAD_IMBALANCE_MULTIPLIER = 2

/** Minimum assignees for workload imbalance check */
const MIN_ASSIGNEES_FOR_IMBALANCE = 3

/** Business days for approval gap */
const APPROVAL_GAP_BUSINESS_DAYS = 1

/** Hour after which standup is considered missing (12:00 = noon) */
const STANDUP_DUE_HOUR = 12

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────

function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6 // Not Sunday or Saturday
}

function getCurrentHour(): number {
  return new Date().getHours()
}

function hoursSince(dateString: string | undefined): number {
  if (!dateString) return Infinity
  const then = new Date(dateString)
  const now = new Date()
  return (now.getTime() - then.getTime()) / (1000 * 60 * 60)
}

function daysSince(dateString: string | undefined): number {
  return hoursSince(dateString) / 24
}

function daysUntil(dateString: string | undefined): number {
  if (!dateString) return Infinity
  const target = new Date(dateString)
  const now = new Date()
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
}

function parseDate(dateString: string | undefined): Date | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

// ──────────────────────────────────────────────────────────────────────────────
// Threshold Checks
// ──────────────────────────────────────────────────────────────────────────────

function checkWeekStartDrift(
  weeks: ShipWeek[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []
  const now = new Date()

  for (const week of weeks) {
    if (week.status !== 'planning') continue

    const startDate = parseDate(week.sprintStartDate)
    if (!startDate) continue

    // Calculate hours since start
    const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)

    if (hoursSinceStart > WEEK_START_GRACE_HOURS) {
      suspects.push({
        type: 'week_start_drift',
        entityId: week.id,
        entityType: 'week',
        ownerId: week.ownerId,
        weekId: week.id,
        metadata: {
          status: week.status,
          sprintStartDate: week.sprintStartDate,
          hoursSinceStart,
        },
      })
    }
  }

  return suspects
}

function checkEmptyActiveWeek(
  weeks: ShipWeek[],
  issues: ShipIssue[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  // Build issue count per week
  const issueCountByWeek = new Map<string, number>()
  for (const issue of issues) {
    if (issue.sprintId) {
      issueCountByWeek.set(
        issue.sprintId,
        (issueCountByWeek.get(issue.sprintId) ?? 0) + 1
      )
    }
  }

  for (const week of weeks) {
    if (week.status !== 'active') continue

    const issueCount = issueCountByWeek.get(week.id) ?? 0
    if (issueCount === 0) {
      suspects.push({
        type: 'empty_active_week',
        entityId: week.id,
        entityType: 'week',
        ownerId: week.ownerId,
        weekId: week.id,
        metadata: {
          status: week.status,
          issueCount,
        },
      })
    }
  }

  return suspects
}

function checkDeadlineRisk(
  projects: ShipProject[],
  issues: ShipIssue[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  // Build open issues per project
  const openIssuesByProject = new Map<string, ShipIssue[]>()
  for (const issue of issues) {
    if (!issue.projectId) continue
    const state = issue.state?.toLowerCase()
    if (state === 'done' || state === 'closed' || state === 'cancelled') continue

    if (!openIssuesByProject.has(issue.projectId)) {
      openIssuesByProject.set(issue.projectId, [])
    }
    openIssuesByProject.get(issue.projectId)!.push(issue)
  }

  for (const project of projects) {
    const targetDays = daysUntil(project.targetDate)
    if (targetDays > DEADLINE_RISK_DAYS || targetDays < 0) continue

    const openIssues = openIssuesByProject.get(project.id) ?? []
    if (openIssues.length < DEADLINE_RISK_MIN_ISSUES) continue

    // Check for urgent/high stale issues
    const hasStaleHighPriority = openIssues.some((issue) => {
      const priority = issue.priority?.toLowerCase()
      const isHighPriority = priority === 'urgent' || priority === 'high'
      const isStale = hoursSince(issue.lastUpdatedAt) > STALE_ISSUE_HOURS
      return isHighPriority && isStale
    })

    if (openIssues.length >= DEADLINE_RISK_MIN_ISSUES || hasStaleHighPriority) {
      suspects.push({
        type: 'deadline_risk',
        entityId: project.id,
        entityType: 'project',
        projectId: project.id,
        metadata: {
          targetDate: project.targetDate,
          daysUntil: targetDays,
          openIssueCount: openIssues.length,
          hasStaleHighPriority,
        },
      })
    }
  }

  return suspects
}

function checkWorkloadImbalance(
  issues: ShipIssue[],
  people: ShipPerson[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  // Build workload per assignee (open issues only)
  const workloadByAssignee = new Map<string, number>()
  for (const issue of issues) {
    if (!issue.assigneeId) continue
    const state = issue.state?.toLowerCase()
    if (state === 'done' || state === 'closed' || state === 'cancelled') continue

    const estimate = issue.estimate ?? 1 // Default to 1 if no estimate
    workloadByAssignee.set(
      issue.assigneeId,
      (workloadByAssignee.get(issue.assigneeId) ?? 0) + estimate
    )
  }

  // Need at least MIN_ASSIGNEES_FOR_IMBALANCE assignees
  if (workloadByAssignee.size < MIN_ASSIGNEES_FOR_IMBALANCE) {
    return suspects
  }

  // Calculate total and median
  const workloads = Array.from(workloadByAssignee.values())
  const total = workloads.reduce((a, b) => a + b, 0)
  const sortedWorkloads = [...workloads].sort((a, b) => a - b)
  const median = sortedWorkloads[Math.floor(sortedWorkloads.length / 2)]

  for (const [assigneeId, workload] of workloadByAssignee) {
    const percentOfTotal = workload / total
    const ratioToMedian = workload / (median || 1)

    if (
      percentOfTotal > WORKLOAD_IMBALANCE_THRESHOLD ||
      ratioToMedian > WORKLOAD_IMBALANCE_MULTIPLIER
    ) {
      const person = people.find((p) => p.id === assigneeId)
      suspects.push({
        type: 'workload_imbalance',
        entityId: assigneeId,
        entityType: 'person',
        personId: assigneeId,
        metadata: {
          workload,
          percentOfTotal,
          ratioToMedian,
          personName: person?.name,
        },
      })
    }
  }

  return suspects
}

function checkBlockerAging(
  issues: ShipIssue[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  for (const issue of issues) {
    // Check if issue has blocker text
    if (!issue.blockerText) continue

    // Check for no update in 3+ business days
    const hoursSinceUpdate = hoursSince(issue.lastUpdatedAt)
    const businessDaysSinceUpdate = hoursSinceUpdate / 24 // Simplified; could be more precise

    if (businessDaysSinceUpdate > 3) {
      suspects.push({
        type: 'blocker_aging',
        entityId: issue.id,
        entityType: 'issue',
        metadata: {
          blockerText: issue.blockerText,
          businessDaysSinceUpdate,
          lastUpdatedAt: issue.lastUpdatedAt,
        },
      })
    }
  }

  return suspects
}

/**
 * Detects missing standups for users with assigned issues in active weeks.
 *
 * Logic:
 * 1. Must be a business day
 * 2. Must be after the standup due hour (noon by default)
 * 3. User must have at least one open issue assigned in an active week
 * 4. User must NOT have posted a standup today
 *
 * @param weeks - All weeks in workspace
 * @param issues - All issues in workspace
 * @param people - All people in workspace
 * @param todayStandups - All standups posted today
 */
function checkMissingStandup(
  weeks: ShipWeek[],
  issues: ShipIssue[],
  people: ShipPerson[],
  todayStandups: ShipStandup[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  // Gate 1: Must be a business day
  const now = new Date()
  if (!isBusinessDay(now)) {
    return suspects
  }

  // Gate 2: Must be after the standup due hour
  if (getCurrentHour() < STANDUP_DUE_HOUR) {
    return suspects
  }

  // Build set of active week IDs
  const activeWeekIds = new Set(
    weeks
      .filter((w) => w.status === 'active')
      .map((w) => w.id)
  )

  // Build map of user IDs who have posted today
  const usersWithStandup = new Set(
    todayStandups.map((s) => s.authorId)
  )

  // Build map of assignees with open issues in active weeks
  const assigneesInActiveWeeks = new Map<string, { issueIds: string[]; weekIds: Set<string> }>()

  for (const issue of issues) {
    // Must be assigned
    if (!issue.assigneeId) continue

    // Must be in an active week
    if (!issue.sprintId || !activeWeekIds.has(issue.sprintId)) continue

    // Must be open (not done/closed/cancelled)
    const state = issue.state?.toLowerCase()
    if (state === 'done' || state === 'closed' || state === 'cancelled') continue

    // Track this assignee
    if (!assigneesInActiveWeeks.has(issue.assigneeId)) {
      assigneesInActiveWeeks.set(issue.assigneeId, { issueIds: [], weekIds: new Set() })
    }
    const entry = assigneesInActiveWeeks.get(issue.assigneeId)!
    entry.issueIds.push(issue.id)
    entry.weekIds.add(issue.sprintId)
  }

  // Check each assignee with open issues in active weeks
  for (const [assigneeId, data] of assigneesInActiveWeeks) {
    // Skip if user already posted a standup today
    if (usersWithStandup.has(assigneeId)) continue

    const person = people.find((p) => p.id === assigneeId)
    const weekId = Array.from(data.weekIds)[0] // Pick first active week for context

    suspects.push({
      type: 'missing_standup',
      entityId: assigneeId,
      entityType: 'person',
      personId: assigneeId,
      weekId,
      metadata: {
        personName: person?.name,
        personEmail: person?.email,
        openIssueCount: data.issueIds.length,
        activeWeekIds: Array.from(data.weekIds),
        currentHour: getCurrentHour(),
        dueHour: STANDUP_DUE_HOUR,
      },
    })
  }

  return suspects
}

/**
 * Helper interface for approval tracking within documents
 */
interface ApprovalTracking {
  state: 'approved' | 'changed_since_approved' | 'changes_requested' | null
  approved_at?: string
  feedback?: string
}

/**
 * Helper to calculate business days since a date
 */
function businessDaysSince(dateString: string | undefined): number {
  if (!dateString) return Infinity
  const then = new Date(dateString)
  const now = new Date()

  let count = 0
  const current = new Date(then)
  while (current < now) {
    current.setDate(current.getDate() + 1)
    if (isBusinessDay(current)) {
      count++
    }
  }
  return count
}

/**
 * Detects approval gaps in sprints and projects.
 *
 * Logic:
 * 1. changes_requested: Plan/review has been sent back for revisions
 * 2. Pending > 1 business day: submitted_at exists but no approval decision yet
 *
 * @param weeks - All weeks in workspace
 * @param projects - All projects in workspace
 */
function checkApprovalGap(
  weeks: ShipWeek[],
  projects: ShipProject[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  // Check weeks for approval gaps
  for (const week of weeks) {
    // Skip non-active weeks (only care about active/planning weeks)
    if (week.status === 'completed' || week.status === 'archived') continue

    const props = week.properties ?? {}
    const planApproval = props.plan_approval as ApprovalTracking | undefined
    const reviewApproval = props.review_approval as ApprovalTracking | undefined
    const submittedAt = props.submitted_at as string | undefined
    const assigneeIds = props.assignee_ids as string[] | undefined
    const ownerId = assigneeIds?.[0] ?? week.ownerId

    // Check plan approval
    if (planApproval?.state === 'changes_requested') {
      suspects.push({
        type: 'approval_gap',
        entityId: week.id,
        entityType: 'week',
        weekId: week.id,
        ownerId,
        metadata: {
          approvalType: 'plan',
          state: planApproval.state,
          feedback: planApproval.feedback,
          weekTitle: week.title,
        },
      })
    } else if (!planApproval?.state && submittedAt) {
      // Pending approval check: submitted but no decision
      const businessDays = businessDaysSince(submittedAt)
      if (businessDays >= APPROVAL_GAP_BUSINESS_DAYS) {
        suspects.push({
          type: 'approval_gap',
          entityId: week.id,
          entityType: 'week',
          weekId: week.id,
          ownerId,
          metadata: {
            approvalType: 'plan',
            state: 'pending',
            submittedAt,
            businessDaysPending: businessDays,
            weekTitle: week.title,
          },
        })
      }
    }

    // Check review approval (only for active weeks - completed/archived already filtered out)
    if (week.status === 'active') {
      if (reviewApproval?.state === 'changes_requested') {
        suspects.push({
          type: 'approval_gap',
          entityId: week.id,
          entityType: 'week',
          weekId: week.id,
          ownerId,
          metadata: {
            approvalType: 'review',
            state: reviewApproval.state,
            feedback: reviewApproval.feedback,
            weekTitle: week.title,
          },
        })
      }
    }
  }

  // Check projects for approval gaps
  for (const project of projects) {
    const props = project.properties ?? {}
    const planApproval = props.plan_approval as ApprovalTracking | undefined
    const submittedAt = props.submitted_at as string | undefined
    const ownerId = props.owner_id as string | undefined

    // Check plan approval
    if (planApproval?.state === 'changes_requested') {
      suspects.push({
        type: 'approval_gap',
        entityId: project.id,
        entityType: 'project',
        projectId: project.id,
        ownerId,
        metadata: {
          approvalType: 'plan',
          state: planApproval.state,
          feedback: planApproval.feedback,
          projectTitle: project.title,
        },
      })
    } else if (!planApproval?.state && submittedAt) {
      // Pending approval check
      const businessDays = businessDaysSince(submittedAt)
      if (businessDays >= APPROVAL_GAP_BUSINESS_DAYS) {
        suspects.push({
          type: 'approval_gap',
          entityId: project.id,
          entityType: 'project',
          projectId: project.id,
          ownerId,
          metadata: {
            approvalType: 'plan',
            state: 'pending',
            submittedAt,
            businessDaysPending: businessDays,
            projectTitle: project.title,
          },
        })
      }
    }
  }

  return suspects
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Applies deterministic threshold checks to identify suspect entities.
 *
 * @param state - Current graph state with raw workspace data
 * @returns State update with suspect entities
 */
export function identifyDirtyEntities(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  const suspects: SuspectEntity[] = []

  // Run all threshold checks
  suspects.push(
    ...checkWeekStartDrift(state.rawWeeks),
    ...checkEmptyActiveWeek(state.rawWeeks, state.rawIssues),
    ...checkMissingStandup(state.rawWeeks, state.rawIssues, state.rawPeople, state.rawTodayStandups),
    ...checkApprovalGap(state.rawWeeks, state.rawProjects),
    ...checkDeadlineRisk(state.rawProjects, state.rawIssues),
    ...checkWorkloadImbalance(state.rawIssues, state.rawPeople),
    ...checkBlockerAging(state.rawIssues)
  )

  return {
    suspectEntities: suspects,
    path: ['identify_dirty_entities'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type IdentifyDirtyEntitiesRoute = 'expand_suspects' | 'normalize_ship_state'

/**
 * Routes to expand_suspects if there are suspects, otherwise to normalize_ship_state.
 */
export function routeFromDirtyEntities(
  state: FleetGraphStateV2
): IdentifyDirtyEntitiesRoute {
  if (state.suspectEntities.length > 0) {
    return 'expand_suspects'
  }
  return 'normalize_ship_state'
}
