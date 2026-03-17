/**
 * Calculates the UTC start date of a sprint given the workspace's base sprint
 * start date and the sprint number.
 *
 * Sprint 1 starts on `workspaceSprintStartDate`. Each subsequent sprint starts
 * exactly 7 days later.
 */
export function calculateWeekStartDate(
  workspaceSprintStartDate: string,
  sprintNumber: number
): Date {
  const baseDate = new Date(`${workspaceSprintStartDate.slice(0, 10)}T00:00:00.000Z`)
  const startDate = new Date(baseDate)
  startDate.setUTCDate(baseDate.getUTCDate() + (sprintNumber - 1) * 7)
  return startDate
}
