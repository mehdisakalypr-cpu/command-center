/**
 * Setup Minato Managed Agent — ONE-TIME SETUP
 *
 * Crée :
 *  1. Environment Anthropic (cloud, networking unrestricted)
 *  2. Custom Skill "minato-orchestrator" (upload du dossier skills/minato/)
 *  3. Agent versionné claude-opus-4-6 avec custom tools + skill
 *  4. Persiste les IDs dans .minato.json
 *
 * Usage : npx tsx scripts/setup-minato-agent.ts
 *
 * Prérequis : ANTHROPIC_API_KEY dans .env.local
 *             accès beta managed-agents-2026-04-01 sur ton org
 */
import * as fs from 'fs'
import * as path from 'path'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const BASE_URL = process.env.MINATO_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://command-center-lemon-xi.vercel.app'
const CONFIG_PATH = path.join(process.cwd(), '.minato.json')

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY missing in environment')
  process.exit(1)
}

const headers = {
  'x-api-key': ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'Content-Type': 'application/json',
}

async function api(path: string, method: 'GET' | 'POST', body?: unknown, betaHeader = 'managed-agents-2026-04-01') {
  const r = await fetch(`https://api.anthropic.com${path}`, {
    method,
    headers: { ...headers, 'anthropic-beta': betaHeader },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await r.json()
  if (!r.ok) {
    console.error(`❌ ${method} ${path} → ${r.status}`)
    console.error(JSON.stringify(json, null, 2))
    process.exit(1)
  }
  return json
}

async function main() {
  console.log('⚡ MINATO setup — one-time bootstrap\n')

  const existing: { agent_id?: string; environment_id?: string; skill_id?: string } = fs.existsSync(CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    : {}

  // 1. Environment
  let environment_id = existing.environment_id
  if (!environment_id) {
    console.log('1/4 Creating environment...')
    const env = await api('/v1/environments', 'POST', {
      name: 'minato-prod',
      config: { type: 'cloud', networking: { type: 'unrestricted' } },
    })
    environment_id = env.id
    console.log(`   ✓ ${environment_id}`)
  } else console.log(`1/4 Environment reused: ${environment_id}`)

  // 2. Skills → inlined into system prompt for POC (bypass Skills API multipart upload)
  console.log('2/4 Loading skills as inline system prompt...')
  const skillFiles = ['SKILL.md', 'genkidama.md', 'kakashi-bricks.md']
  const skillsInline = skillFiles.map((f) => {
    const content = fs.readFileSync(path.join(process.cwd(), 'skills/minato', f), 'utf8')
    return `<skill name="${f.replace('.md', '')}">\n${content}\n</skill>`
  }).join('\n\n')
  console.log(`   ✓ ${skillsInline.length} chars loaded from ${skillFiles.length} files`)
  const skill_id = 'inline'

  // 3. Agent
  let agent_id = existing.agent_id
  if (!agent_id) {
    console.log('3/4 Creating agent...')
    const agent = await api('/v1/agents', 'POST', {
      name: 'Minato Orchestrator',
      model: 'claude-opus-4-6',
      system: `Tu es Minato, l'orchestrateur méta des 5 projets de l'utilisateur (FTG, OFA, Estate, Shift, CC).

Utilise les custom tools pour piloter les agents locaux gratuits sur le VPS via le bridge CC.
Commit toutes les 15-20 min via commit_progress. Update les Insights CC après chaque batch.

Méthodologie et contexte ci-dessous :

${skillsInline}`,
      tools: [
        { type: 'agent_toolset_20260401', default_config: { enabled: true } },
        {
          type: 'custom',
          name: 'status_check',
          description: 'Récupère l\'état actuel d\'un projet (counts tables, agents, % Genkidama).',
          input_schema: {
            type: 'object',
            properties: { project: { type: 'string', enum: ['ftg', 'ofa', 'estate', 'shift', 'cc'] } },
            required: ['project'],
          },
        },
        {
          type: 'custom',
          name: 'run_agent',
          description: 'Lance un agent local (script tsx) sur le VPS via le bridge CC.',
          input_schema: {
            type: 'object',
            properties: {
              project: { type: 'string', enum: ['ftg', 'ofa'] },
              script: { type: 'string', description: 'Nom du script (ex: refresh-demos, hyperscale, recover-incomplete)' },
              args: { type: 'array', items: { type: 'string' }, description: 'Arguments CLI optionnels' },
            },
            required: ['project', 'script'],
          },
        },
        {
          type: 'custom',
          name: 'run_kaioken_batch',
          description: 'Lance N agents en parallèle (KAIOKEN mode). Retourne les résultats agrégés.',
          input_schema: {
            type: 'object',
            properties: {
              agents: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    project: { type: 'string' },
                    script: { type: 'string' },
                    args: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['project', 'script'],
                },
                description: 'Liste des agents à lancer en parallèle',
              },
            },
            required: ['agents'],
          },
        },
        {
          type: 'custom',
          name: 'commit_progress',
          description: 'Commit le travail en cours sur le projet ciblé (KAKASHI rule: commit toutes les 15-20 min).',
          input_schema: {
            type: 'object',
            properties: {
              project: { type: 'string', enum: ['ftg', 'ofa', 'cc', 'shift'] },
              message: { type: 'string', description: 'Message de commit (court, type "feat:", "fix:", etc.)' },
            },
            required: ['project', 'message'],
          },
        },
        {
          type: 'custom',
          name: 'update_cc_insights',
          description: 'Update le dashboard Insights CC avec les métriques du dernier batch.',
          input_schema: {
            type: 'object',
            properties: {
              project: { type: 'string' },
              metrics: { type: 'object', description: 'Counts par table + % Genkidama' },
              note: { type: 'string', description: 'Résumé court du run' },
            },
            required: ['project', 'metrics'],
          },
        },
        {
          type: 'custom',
          name: 'check_genkidama',
          description: 'Calcule le % d\'atteinte des cibles Genkidama pour un projet.',
          input_schema: {
            type: 'object',
            properties: { project: { type: 'string' } },
            required: ['project'],
          },
        },
      ],
    })
    agent_id = agent.id
    console.log(`   ✓ ${agent_id} (version ${agent.version})`)
  } else console.log(`3/4 Agent reused: ${agent_id}`)

  // 4. Save config
  console.log('4/4 Persisting IDs to .minato.json...')
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ environment_id, skill_id, agent_id }, null, 2))
  console.log(`   ✓ ${CONFIG_PATH}\n`)

  console.log('🎯 Setup complete. Bridge URL:', BASE_URL + '/api/minato/run-tool')
  console.log('   Use sessions.create({ agent: agent_id, environment_id }) to launch.\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
