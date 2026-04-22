import { synthesizeIntegration } from '../lib/hisoka/aam/alchemist';

(async () => {
  const plan = await synthesizeIntegration(
    { dim: 'content_ops', current_autonomy: 0.75, description: 'Generate niche blog posts at scale', forgeable: true },
    { source: 'github', url: 'https://github.com/example/blog-gen', title: 'blog-gen — AI niche blog generator', stars: 1200, language: 'TypeScript', reason: 'popular' },
  );
  console.log('install_script length:', plan.install_script.length);
  console.log('entry_point:', plan.entry_point);
  console.log('entry_code length:', plan.entry_code.length);
  console.log('required_env:', plan.required_env_keys);
  if (!plan.install_script || !plan.entry_code) { console.error('FAIL: missing fields'); process.exit(1); }
  console.log('OK');
})().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
