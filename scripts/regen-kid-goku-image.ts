/**
 * One-shot regenerator for the "kid" saiyan tier image.
 * Keeps trying new prompts until the user accepts (interactive via CLI args).
 *
 * Usage:
 *   npx tsx scripts/regen-kid-goku-image.ts                 # show candidates
 *   npx tsx scripts/regen-kid-goku-image.ts --accept <url>  # commit a chosen URL
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv(path: string) {
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  } catch {}
}
loadEnv('/root/command-center/.env.local')

const PROMPTS = [
  // Each prompt MUST insist on the Nyoi-Bo magic staff (Power Pole)
  'kid Goku from Dragon Ball Z, young boy about 12 years old, orange gi outfit, spiky black hair, holding the red Nyoi-Bo magic extending staff (Power Pole) on his back, determined smile, dynamic pose, cel-shaded anime style, dramatic lighting, golden aura, full body portrait, high quality',
  'child Son Goku, orange kung-fu uniform, Power Pole staff strapped diagonally across his back visible, clenching fists, confident grin, flying clouds background, vintage 80s Dragon Ball anime style, painterly cel-shading, cinematic composition',
  'young Goku (Dragon Ball Z), orange martial arts gi, extended red Nyoi-Bo staff held across shoulders, spiky jet-black hair, innocent but fierce expression, Kintoun (flying Nimbus) cloud in background, Akira Toriyama style, cel-shading, backlit sunset, full body',
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const accept = process.argv.indexOf('--accept')
  if (accept > -1 && process.argv[accept + 1]) {
    const url = process.argv[accept + 1]
    const { error } = await sb.from('saiyan_tiers').update({ image_url: url, image_locked: true }).eq('code', 'kid')
    if (error) { console.error('update failed:', error.message); process.exit(1) }
    console.log(`✓ kid tier image committed and locked: ${url}`)
    return
  }

  console.log('Current prompts in rotation for kid Goku (Nyoi-Bo must be visible):\n')
  PROMPTS.forEach((p, i) => console.log(`  #${i + 1}  ${p}\n`))
  console.log('\nNext steps:')
  console.log('  1. Send one of the prompts to your image-cascade / Pollinations / Flux pipeline')
  console.log('  2. Inspect the result (check that the red Nyoi-Bo staff is visible)')
  console.log('  3. Accept with: npx tsx scripts/regen-kid-goku-image.ts --accept <url>')
  console.log('  4. The row will be locked (image_locked=true) and no agent will overwrite it')
}

main().catch(e => { console.error(e); process.exit(1) })
