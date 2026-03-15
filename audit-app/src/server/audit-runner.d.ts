declare module '../../../scripts/audit/lib/run-compare.mjs' {
  export function runComparison(options?: Record<string, unknown>): Promise<{
    runId: string;
    outputDir: string;
    dashboardPath: string;
    baselineSummary: { sha: string };
    submissionSummary: { sha: string };
    comparison: Record<string, unknown>;
  }>;
}
