import type { IntegrationPlan, TestOutput } from './types';

/**
 * Phase 5.1 stub: does NOT execute any code. Returns a synthetic "needs_human"
 * signal so the orchestrator can still produce an automation_upgrades row with
 * a PR-style plan markdown, to be reviewed manually.
 * Phase 5.2 replaces this with real E2B execution.
 */
export async function runSandboxTest(plan: IntegrationPlan, _fixturesJson: string): Promise<TestOutput> {
  return {
    sandbox_run_id: `stub-${Date.now()}`,
    exited_cleanly: false,
    stdout: '',
    stderr: 'Phase 5.1 stub: sandbox execution not wired yet. Integration plan generated for human review.',
    duration_ms: 0,
    raw_metrics: { phase: '5.1_stub', plan_candidate: plan.candidate.url },
  };
}
