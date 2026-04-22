import { runSandboxTest } from '../lib/hisoka/aam/tester';

if (!process.env.E2B_API_KEY) {
  console.log('SKIP: E2B_API_KEY not set in env — sign up at e2b.dev, set E2B_API_KEY in .env.local, re-run.');
  process.exit(0);
}

const plan = {
  candidate: { source: 'github' as const, url: 'https://example.com/echo', title: 'echo-test', reason: 'smoke' },
  install_script: 'echo "nothing to install"',
  entry_point: 'run.mjs',
  entry_code: `
import fs from 'node:fs';
const fixtures = JSON.parse(fs.readFileSync('/home/user/fixtures.json','utf-8'));
const results = fixtures.cases.map(c => ({ id: c.id, ok: true, echo: c.niche ?? c.subject ?? 'n/a' }));
fs.writeFileSync('/home/user/results.json', JSON.stringify({ results }, null, 2));
console.log('echoed', results.length);
`,
  required_env_keys: [] as string[],
  notes: '',
};
const fixtures = JSON.stringify({ cases: [{ id: 'x1', niche: 'foo' }, { id: 'x2', niche: 'bar' }] });

(async () => {
  const out = await runSandboxTest(plan, fixtures);
  console.log('run_id:', out.sandbox_run_id);
  console.log('exited_cleanly:', out.exited_cleanly);
  console.log('duration_ms:', out.duration_ms);
  console.log('metrics:', JSON.stringify(out.raw_metrics).slice(0, 200));
  if (!out.exited_cleanly) { console.error('FAIL:', out.stderr.slice(-400)); process.exit(1); }
  console.log('OK');
})();
