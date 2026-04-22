import { Sandbox } from '@e2b/code-interpreter';
import type { IntegrationPlan, TestOutput } from './types';
import { createSupabaseAdmin } from '@/lib/supabase-server';

const E2B_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes hard cap

export async function runSandboxTest(plan: IntegrationPlan, fixturesJson: string): Promise<TestOutput> {
  const started = Date.now();
  let sandbox: Sandbox | null = null;
  let stdout = '';
  let stderr = '';
  let exited = false;
  let rawMetrics: Record<string, unknown> = {};
  const runId = `aam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    sandbox = await Sandbox.create({ timeoutMs: E2B_TIMEOUT_MS });

    await sandbox.files.write('/home/user/fixtures.json', fixturesJson);
    await sandbox.files.write(`/home/user/${plan.entry_point}`, plan.entry_code);
    await sandbox.files.write('/home/user/install.sh', plan.install_script);

    // Run install script
    const install = await sandbox.commands.run('bash /home/user/install.sh', { cwd: '/home/user', timeoutMs: 120_000 });
    stdout += `=== install ===\n${install.stdout}\n`;
    stderr += install.stderr;
    if (install.exitCode !== 0) {
      throw new Error(`install failed (exit ${install.exitCode})`);
    }

    // Run entry point
    const cmd = plan.entry_point.endsWith('.py')
      ? `python3 /home/user/${plan.entry_point}`
      : `node /home/user/${plan.entry_point}`;
    const run = await sandbox.commands.run(cmd, { cwd: '/home/user', timeoutMs: 240_000 });
    stdout += `=== run ===\n${run.stdout}\n`;
    stderr += run.stderr;
    exited = run.exitCode === 0;

    // Try to read results.json written by the entry point
    try {
      // files.read() returns string by default when no format option is given
      const raw = await sandbox.files.read('/home/user/results.json');
      rawMetrics = JSON.parse(raw);
    } catch { /* no results.json is acceptable */ }

  } catch (e) {
    stderr += `\n[AAM error] ${String(e).slice(0, 500)}`;
  } finally {
    if (sandbox) { try { await sandbox.kill(); } catch { /* ignore */ } }
  }

  const logsUrl = await persistLogs(runId, { stdout, stderr }).catch(() => '');
  void logsUrl; // caller can pick up the URL if needed; currently not threaded through

  return {
    sandbox_run_id: runId,
    exited_cleanly: exited,
    stdout: stdout.slice(-8000),
    stderr: stderr.slice(-4000),
    duration_ms: Date.now() - started,
    raw_metrics: rawMetrics,
  };
}

async function persistLogs(runId: string, logs: { stdout: string; stderr: string }): Promise<string> {
  const admin = createSupabaseAdmin();
  const path = `aam-sandbox-logs/${runId}.jsonl`;
  const body = JSON.stringify(logs);
  const { error } = await admin.storage.from('hisoka').upload(path, body, { contentType: 'application/json', upsert: true });
  if (error) return '';
  const { data } = admin.storage.from('hisoka').getPublicUrl(path);
  return data?.publicUrl ?? '';
}
