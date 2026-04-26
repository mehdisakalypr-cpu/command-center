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
 * Extract a TSX file body from LLM output. Tolerates code fences, leading
 * preamble, trailing chatter. If `export default` exists anywhere, slice
 * from the most plausible component start (import / "use client" / export).
 */
function sanitiseTSX(raw: string): string {
  let txt = stripPreamble(raw).trim()

  // Drop fenced code blocks — keep the fence body if present.
  const fenceMatch = txt.match(/```(?:tsx|jsx|ts|js|typescript|javascript)?\s*\n([\s\S]*?)\n```/i)
  if (fenceMatch) txt = fenceMatch[1].trim()

  // Strip stray leading "tsx" or "typescript" labels.
  txt = txt.replace(/^(?:tsx|typescript|jsx)\s*\n/i, '').trim()

  // Repair: if model returned only a function body / JSX block, wrap it.
  if (!/export\s+default\s+/.test(txt)) {
    let body = txt.trim()
    // Drop wrapping curlies if present
    if (body.startsWith('{') && body.endsWith('}')) {
      body = body.slice(1, -1).trim()
    }
    // Drop wrapping parens around a JSX return value
    if (body.startsWith('(') && body.endsWith(')')) {
      body = `return ${body};`
    }
    // Looks like component body if it has any of: return statement, JSX root, var decl + JSX
    const hasJSX = /<\w/.test(body)
    const hasReturn = /\breturn\s*[\(<]/.test(body)
    if (hasReturn || hasJSX) {
      // If body is JSX without return, wrap it
      if (!hasReturn && hasJSX) body = `return (\n${body}\n);`
      txt = `import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ChatbotWidget from "@/components/ChatbotWidget";

export default function GeneratedPage() {
${body}
}`
    } else {
      const preview = txt.slice(0, 400).replace(/\n/g, ' ')
      throw new Error(`generator: no \`export default\` and no JSX body to repair (preview: ${preview})`)
    }
  }

  // Slice from the earliest legitimate file-start anchor.
  const anchors = [
    txt.search(/^"use client"/m),
    txt.search(/^import\s+/m),
    txt.search(/^export\s+default\s+/m),
  ].filter((i) => i >= 0)
  if (anchors.length) {
    const start = Math.min(...anchors)
    txt = txt.slice(start).trim()
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
