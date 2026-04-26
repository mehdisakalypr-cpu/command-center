/**
 * Portfolio page generator — wraps the cascade LLM call, sanitises the
 * output, and returns ready-to-commit TSX content for a target product page.
 */

import { withFallback } from '@/lib/ai-pool'
import { stripPreamble } from '@/lib/ai-pool/cascade'
import { buildPrompt } from './prompts'
import { getProduct, pagePath, type PageType, type PortfolioProduct } from './products'

export type GenerateResult = {
  product: PortfolioProduct
  pageType: PageType
  path: string
  tsx: string
  provider: string
  costUsd?: number
  durationMs: number
}

/**
 * Strip code fences and common LLM preambles, ensuring we end up with
 * raw TSX. Fails loudly if the result doesn't at least look like a React
 * component (no `export default`).
 */
function sanitiseTSX(raw: string): string {
  let txt = stripPreamble(raw).trim()
  // Drop ```tsx / ```jsx / ``` fences
  txt = txt.replace(/^```(?:tsx|jsx|ts|js)?\s*\n/i, '').replace(/\n```\s*$/i, '').trim()
  // Drop a stray leading "tsx" word some LLMs emit
  txt = txt.replace(/^tsx\s*\n/i, '').trim()
  if (!/export\s+default\s+/.test(txt)) {
    throw new Error('generator: output missing `export default` — likely truncation or refusal')
  }
  return txt
}

export async function generatePage(opts: {
  productSlug: string
  pageType: PageType
  brief?: string
}): Promise<GenerateResult> {
  const product = getProduct(opts.productSlug)
  if (!product) throw new Error(`unknown product slug: ${opts.productSlug}`)

  const { system, prompt } = buildPrompt(product, opts.pageType, opts.brief ?? '')

  const out = await withFallback(
    {
      system,
      prompt,
      temperature: 0.4,
      maxTokens: 7000,
    },
    { project: 'cc' },
  )

  const tsx = sanitiseTSX(out.text)
  return {
    product,
    pageType: opts.pageType,
    path: pagePath(opts.pageType, product.appDir),
    tsx,
    provider: out.provider,
    costUsd: out.costUsd,
    durationMs: out.durationMs,
  }
}
