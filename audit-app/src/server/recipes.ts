export function buildRecipes(run: {
  baselineRepo: string;
  baselineRef: string;
  submissionRepo: string;
  submissionRef: string;
}) {
  return {
    easy: [
      `git clone --branch ${run.submissionRef} ${run.submissionRepo} ship-audit-submission`,
      'cd ship-audit-submission',
      'pnpm install --frozen-lockfile',
      `pnpm audit:grade --baseline-repo ${run.baselineRepo} --baseline-ref ${run.baselineRef}`,
    ].join('\n'),
    manual: [
      `git clone --branch ${run.baselineRef} ${run.baselineRepo} ship-audit-baseline`,
      `git clone --branch ${run.submissionRef} ${run.submissionRepo} ship-audit-submission`,
      'cd ship-audit-submission',
      'pnpm install --frozen-lockfile',
      'pnpm audit:grade --baseline-dir ../ship-audit-baseline --submission-dir .',
    ].join('\n'),
  };
}
