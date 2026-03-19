/**
 * First Action Pack
 *
 * Registers all first-pack action definitions:
 * - start_week (confirm)
 * - approve_week_plan (confirm)
 * - approve_project_plan (confirm)
 * - assign_owner (single_select)
 * - assign_issues (composite: multi_select + single_select)
 * - post_comment (textarea)
 * - post_standup (confirm)
 * - escalate_risk (single_select)
 * - rebalance_load (composite)
 */

export * from './start-week.js'
export * from './approve-week-plan.js'
export * from './approve-project-plan.js'
export * from './assign-owner.js'
export * from './assign-issues.js'
export * from './post-comment.js'
export * from './post-standup.js'
export * from './escalate-risk.js'
export * from './rebalance-load.js'

import { registerStartWeekAction } from './start-week.js'
import { registerApproveWeekPlanAction } from './approve-week-plan.js'
import { registerApproveProjectPlanAction } from './approve-project-plan.js'
import { registerAssignOwnerAction } from './assign-owner.js'
import { registerAssignIssuesAction } from './assign-issues.js'
import { registerPostCommentAction } from './post-comment.js'
import { registerPostStandupAction } from './post-standup.js'
import { registerEscalateRiskAction } from './escalate-risk.js'
import { registerRebalanceLoadAction } from './rebalance-load.js'

let firstPackRegistered = false

/**
 * Register all first-pack actions with the registry.
 * Call this once at startup.
 */
export function registerFirstPackActions(): void {
  if (firstPackRegistered) {
    return
  }
  registerStartWeekAction()
  registerApproveWeekPlanAction()
  registerApproveProjectPlanAction()
  registerAssignOwnerAction()
  registerAssignIssuesAction()
  registerPostCommentAction()
  registerPostStandupAction()
  registerEscalateRiskAction()
  registerRebalanceLoadAction()
  firstPackRegistered = true
}

export function ensureFirstPackActionsRegistered(): void {
  registerFirstPackActions()
}
