import type {
  ShipIssue,
  ShipPerson,
  ShipProject,
  ShipStandup,
  ShipWeek,
  SuspectEntity,
} from './types-v2.js'

const WEEK_START_GRACE_HOURS = 4
const DEADLINE_RISK_DAYS = 7
const DEADLINE_RISK_MIN_ISSUES = 3
const STALE_ISSUE_HOURS = 48
const WORKLOAD_IMBALANCE_THRESHOLD = 0.5
const WORKLOAD_IMBALANCE_MULTIPLIER = 2
const MIN_ASSIGNEES_FOR_IMBALANCE = 3
const APPROVAL_GAP_BUSINESS_DAYS = 1
const STANDUP_DUE_HOUR = 12

interface DetectSuspectEntitiesInput {
  issues: ShipIssue[]
  people: ShipPerson[]
  projects: ShipProject[]
  todayStandups?: ShipStandup[]
  weeks: ShipWeek[]
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function getCurrentHour(): number {
  return new Date().getHours()
}

function hoursSince(dateString: string | undefined): number {
  if (!dateString) {
    return Infinity
  }

  const then = new Date(dateString)
  const now = new Date()
  return (now.getTime() - then.getTime()) / (1000 * 60 * 60)
}

function daysUntil(dateString: string | undefined): number {
  if (!dateString) {
    return Infinity
  }

  const target = new Date(dateString)
  const now = new Date()
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
}

function parseDate(dateString: string | undefined): Date | null {
  if (!dateString) {
    return null
  }

  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? null : date
}

function businessDaysSince(dateString: string | undefined): number {
  if (!dateString) {
    return Infinity
  }

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

function checkWeekStartDrift(weeks: ShipWeek[]): SuspectEntity[] {
  const suspects: SuspectEntity[] = []
  const now = new Date()

  for (const week of weeks) {
    if (week.status !== 'planning') {
      continue
    }

    const startDate = parseDate(week.sprintStartDate)
    if (!startDate) {
      continue
    }

    const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceStart <= WEEK_START_GRACE_HOURS) {
      continue
    }

    suspects.push({
      entityId: week.id,
      entityType: 'week',
      metadata: {
        hoursSinceStart,
        sprintStartDate: week.sprintStartDate,
        status: week.status,
      },
      ownerId: week.ownerId,
      type: 'week_start_drift',
      weekId: week.id,
    })
  }

  return suspects
}

function checkEmptyActiveWeek(
  weeks: ShipWeek[],
  issues: ShipIssue[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []
  const issueCountByWeek = new Map<string, number>()

  for (const issue of issues) {
    if (!issue.sprintId) {
      continue
    }

    issueCountByWeek.set(
      issue.sprintId,
      (issueCountByWeek.get(issue.sprintId) ?? 0) + 1
    )
  }

  for (const week of weeks) {
    if (week.status !== 'active') {
      continue
    }

    const issueCount = issueCountByWeek.get(week.id) ?? 0
    if (issueCount > 0) {
      continue
    }

    suspects.push({
      entityId: week.id,
      entityType: 'week',
      metadata: {
        issueCount,
        status: week.status,
      },
      ownerId: week.ownerId,
      type: 'empty_active_week',
      weekId: week.id,
    })
  }

  return suspects
}

function checkDeadlineRisk(
  projects: ShipProject[],
  issues: ShipIssue[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []
  const openIssuesByProject = new Map<string, ShipIssue[]>()

  for (const issue of issues) {
    if (!issue.projectId) {
      continue
    }

    const state = (issue.state ?? '').toLowerCase()
    if (state === 'done' || state === 'closed' || state === 'cancelled') {
      continue
    }

    const projectIssues = openIssuesByProject.get(issue.projectId) ?? []
    projectIssues.push(issue)
    openIssuesByProject.set(issue.projectId, projectIssues)
  }

  for (const project of projects) {
    const targetDays = daysUntil(project.targetDate)
    if (targetDays > DEADLINE_RISK_DAYS || targetDays < 0) {
      continue
    }

    const openIssues = openIssuesByProject.get(project.id) ?? []
    if (openIssues.length < DEADLINE_RISK_MIN_ISSUES) {
      continue
    }

    const hasStaleHighPriority = openIssues.some((issue) => {
      const priority = issue.priority?.toLowerCase()
      const isHighPriority = priority === 'urgent' || priority === 'high'
      const isStale = hoursSince(issue.lastUpdatedAt) > STALE_ISSUE_HOURS
      return isHighPriority && isStale
    })

    suspects.push({
      entityId: project.id,
      entityType: 'project',
      metadata: {
        daysUntil: targetDays,
        hasStaleHighPriority,
        openIssueCount: openIssues.length,
        targetDate: project.targetDate,
      },
      projectId: project.id,
      type: 'deadline_risk',
    })
  }

  return suspects
}

function checkWorkloadImbalance(
  issues: ShipIssue[],
  people: ShipPerson[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []
  const workloadByAssignee = new Map<string, number>()

  for (const issue of issues) {
    if (!issue.assigneeId) {
      continue
    }

    const state = (issue.state ?? '').toLowerCase()
    if (state === 'done' || state === 'closed' || state === 'cancelled') {
      continue
    }

    const estimate = issue.estimate ?? 1
    workloadByAssignee.set(
      issue.assigneeId,
      (workloadByAssignee.get(issue.assigneeId) ?? 0) + estimate
    )
  }

  if (workloadByAssignee.size < MIN_ASSIGNEES_FOR_IMBALANCE) {
    return suspects
  }

  const workloads = Array.from(workloadByAssignee.values())
  const total = workloads.reduce((sum, value) => sum + value, 0)
  const sortedWorkloads = [...workloads].sort((left, right) => left - right)
  const median = sortedWorkloads[Math.floor(sortedWorkloads.length / 2)] ?? 0

  for (const [assigneeId, workload] of workloadByAssignee) {
    const percentOfTotal = total > 0 ? workload / total : 0
    const ratioToMedian = workload / (median || 1)

    if (
      percentOfTotal <= WORKLOAD_IMBALANCE_THRESHOLD &&
      ratioToMedian <= WORKLOAD_IMBALANCE_MULTIPLIER
    ) {
      continue
    }

    const person = people.find((entry) => entry.id === assigneeId)
    suspects.push({
      entityId: assigneeId,
      entityType: 'person',
      metadata: {
        percentOfTotal,
        personName: person?.name,
        ratioToMedian,
        workload,
      },
      personId: assigneeId,
      type: 'workload_imbalance',
    })
  }

  return suspects
}

function checkBlockerAging(issues: ShipIssue[]): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  for (const issue of issues) {
    if (!issue.blockerText) {
      continue
    }

    const hoursSinceUpdate = hoursSince(issue.lastUpdatedAt)
    const businessDaysSinceUpdate = hoursSinceUpdate / 24
    if (businessDaysSinceUpdate <= 3) {
      continue
    }

    suspects.push({
      entityId: issue.id,
      entityType: 'issue',
      metadata: {
        blockerText: issue.blockerText,
        businessDaysSinceUpdate,
        lastUpdatedAt: issue.lastUpdatedAt,
      },
      type: 'blocker_aging',
    })
  }

  return suspects
}

function checkMissingStandup(
  weeks: ShipWeek[],
  issues: ShipIssue[],
  people: ShipPerson[],
  todayStandups: ShipStandup[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []
  const now = new Date()

  if (!isBusinessDay(now) || getCurrentHour() < STANDUP_DUE_HOUR) {
    return suspects
  }

  const activeWeekIds = new Set(
    weeks.filter((week) => week.status === 'active').map((week) => week.id)
  )
  const usersWithStandup = new Set(todayStandups.map((standup) => standup.authorId))
  const assigneesInActiveWeeks = new Map<string, { issueIds: string[]; weekIds: Set<string> }>()

  for (const issue of issues) {
    if (!issue.assigneeId || !issue.sprintId || !activeWeekIds.has(issue.sprintId)) {
      continue
    }

    const state = (issue.state ?? '').toLowerCase()
    if (state === 'done' || state === 'closed' || state === 'cancelled') {
      continue
    }

    const existing = assigneesInActiveWeeks.get(issue.assigneeId) ?? {
      issueIds: [],
      weekIds: new Set<string>(),
    }
    existing.issueIds.push(issue.id)
    existing.weekIds.add(issue.sprintId)
    assigneesInActiveWeeks.set(issue.assigneeId, existing)
  }

  for (const [assigneeId, data] of assigneesInActiveWeeks) {
    if (usersWithStandup.has(assigneeId)) {
      continue
    }

    const person = people.find((entry) => entry.id === assigneeId)
    const weekId = Array.from(data.weekIds)[0]

    suspects.push({
      entityId: assigneeId,
      entityType: 'person',
      metadata: {
        activeWeekIds: Array.from(data.weekIds),
        currentHour: getCurrentHour(),
        dueHour: STANDUP_DUE_HOUR,
        openIssueCount: data.issueIds.length,
        personEmail: person?.email,
        personName: person?.name,
      },
      personId: assigneeId,
      type: 'missing_standup',
      weekId,
    })
  }

  return suspects
}

interface ApprovalTracking {
  approved_at?: string
  feedback?: string
  state: 'approved' | 'changed_since_approved' | 'changes_requested' | null
}

function checkApprovalGap(
  weeks: ShipWeek[],
  projects: ShipProject[]
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  for (const week of weeks) {
    if (week.status === 'completed' || week.status === 'archived') {
      continue
    }

    const props = week.properties ?? {}
    const planApproval = props.plan_approval as ApprovalTracking | undefined
    const reviewApproval = props.review_approval as ApprovalTracking | undefined
    const submittedAt = typeof props.submitted_at === 'string' ? props.submitted_at : undefined
    const assigneeIds = Array.isArray(props.assignee_ids)
      ? props.assignee_ids.filter((value): value is string => typeof value === 'string')
      : undefined
    const ownerId = assigneeIds?.[0] ?? week.ownerId

    if (planApproval?.state === 'changes_requested') {
      suspects.push({
        entityId: week.id,
        entityType: 'week',
        metadata: {
          approvalType: 'plan',
          feedback: planApproval.feedback,
          state: planApproval.state,
          weekTitle: week.title,
        },
        ownerId,
        type: 'approval_gap',
        weekId: week.id,
      })
    } else if (!planApproval?.state && submittedAt) {
      const businessDaysPending = businessDaysSince(submittedAt)
      if (businessDaysPending >= APPROVAL_GAP_BUSINESS_DAYS) {
        suspects.push({
          entityId: week.id,
          entityType: 'week',
          metadata: {
            approvalType: 'plan',
            businessDaysSinceSubmission: businessDaysPending,
            state: 'pending',
            submittedAt,
            weekTitle: week.title,
          },
          ownerId,
          type: 'approval_gap',
          weekId: week.id,
        })
      }
    }

    if (week.status !== 'active' || reviewApproval?.state !== 'changes_requested') {
      continue
    }

    suspects.push({
      entityId: week.id,
      entityType: 'week',
      metadata: {
        approvalType: 'review',
        feedback: reviewApproval.feedback,
        state: reviewApproval.state,
        weekTitle: week.title,
      },
      ownerId,
      type: 'approval_gap',
      weekId: week.id,
    })
  }

  for (const project of projects) {
    const props = project.properties ?? {}
    const planApproval = props.plan_approval as ApprovalTracking | undefined
    const submittedAt = typeof props.submitted_at === 'string' ? props.submitted_at : undefined
    const ownerId = typeof props.owner_id === 'string' ? props.owner_id : project.ownerId

    if (planApproval?.state === 'changes_requested') {
      suspects.push({
        entityId: project.id,
        entityType: 'project',
        metadata: {
          approvalType: 'plan',
          feedback: planApproval.feedback,
          projectTitle: project.title,
          state: planApproval.state,
        },
        ownerId,
        projectId: project.id,
        type: 'approval_gap',
      })
    } else if (!planApproval?.state && submittedAt) {
      const businessDaysPending = businessDaysSince(submittedAt)
      if (businessDaysPending >= APPROVAL_GAP_BUSINESS_DAYS) {
        suspects.push({
          entityId: project.id,
          entityType: 'project',
          metadata: {
            approvalType: 'plan',
            businessDaysSinceSubmission: businessDaysPending,
            projectTitle: project.title,
            state: 'pending',
            submittedAt,
          },
          ownerId,
          projectId: project.id,
          type: 'approval_gap',
        })
      }
    }
  }

  return suspects
}

export function detectSuspectEntities(
  input: DetectSuspectEntitiesInput
): SuspectEntity[] {
  const suspects: SuspectEntity[] = []

  suspects.push(
    ...checkWeekStartDrift(input.weeks),
    ...checkEmptyActiveWeek(input.weeks, input.issues),
    ...checkApprovalGap(input.weeks, input.projects),
    ...checkDeadlineRisk(input.projects, input.issues),
    ...checkWorkloadImbalance(input.issues, input.people),
    ...checkBlockerAging(input.issues),
  )

  if (input.todayStandups) {
    suspects.push(
      ...checkMissingStandup(
        input.weeks,
        input.issues,
        input.people,
        input.todayStandups
      )
    )
  }

  return suspects
}
