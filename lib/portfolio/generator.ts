/**
 * Portfolio page generator — wraps the cascade LLM call, sanitises the
 * output, and returns ready-to-commit TSX content for a target product page.
 */

import ts from 'typescript'
import { withFallback } from '@/lib/ai-pool'
import { stripPreamble } from '@/lib/ai-pool/cascade'
import { buildPrompt } from './prompts'
import { getProduct, pagePath, type PageType, type PortfolioProduct } from './products'

/**
 * Parse-only TSX validation. Catches LLM truncation, unbalanced braces,
 * unescaped `}`/`>` in JSX text, missing closing tags, etc. Throws so the
 * job is marked failed and the deploy-watcher schedules a retry instead of
 * pushing broken TSX to GitHub.
 */
function validateTSX(code: string): void {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      isolatedModules: true,
    },
    fileName: 'page.tsx',
    reportDiagnostics: true,
  })
  const errs = (result.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  )
  if (errs.length > 0) {
    const msgs = errs
      .slice(0, 3)
      .map((d) => {
        const text = ts.flattenDiagnosticMessageText(d.messageText, ' ')
        return `pos=${d.start ?? '?'}: ${text}`
      })
      .join(' | ')
    throw new Error(`generator: TSX parse error → ${msgs}`)
  }
}

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

  // L2. Strip <style jsx> blocks entirely — they cause build failures and
  // the same effect can be achieved with regular <style> or inline styles.
  txt = txt.replace(/<style\s+jsx(?:\s+global)?>(?:[^]*?)<\/style>/g, '')

  // L1. Force "use client" on every generated page. Marketing pages don't
  // need server components, and this kills the entire server/client
  // boundary class of bugs (event handlers, hooks, state).
  if (!/^"use client"/.test(txt)) {
    txt = `"use client";\n\n${txt}`
  }

  // L3. CSS custom props in inline style: handled at the project level by
  // types/css-vars.d.ts which extends React.CSSProperties to allow `--*` keys.
  // No transform needed here.

  // L4. Auto-inject Next.js imports the LLM commonly forgets.
  const insertImport = (need: RegExp, importLine: string, importMatch: RegExp): void => {
    if (need.test(txt) && !importMatch.test(txt)) {
      const useClientMatch = /^"use client";?\s*\n\s*\n?/.exec(txt)
      const at = useClientMatch ? useClientMatch[0].length : 0
      txt = txt.slice(0, at) + importLine + '\n' + txt.slice(at)
    }
  }
  insertImport(/<Link[\s>]/, `import Link from "next/link";`, /\bfrom\s+["']next\/link["']/)
  insertImport(/<Image[\s>]/, `import Image from "next/image";`, /\bfrom\s+["']next\/image["']/)

  // L6. Strip Nav / Footer / ChatbotWidget — they are rendered by the root
  // layout (app/layout.tsx). LLM frequently re-includes them, causing
  // duplicate header/footer in production.
  txt = txt
    .replace(/^import\s+Nav\s+from\s+["']@\/components\/Nav["'];?\s*\n/m, '')
    .replace(/^import\s+Footer\s+from\s+["']@\/components\/Footer["'];?\s*\n/m, '')
    .replace(/^import\s+ChatbotWidget\s+from\s+["']@\/components\/ChatbotWidget["'];?\s*\n/m, '')
    .replace(/<Nav\s*\/>\s*\n?/g, '')
    .replace(/<Footer\s*\/>\s*\n?/g, '')
    .replace(/<ChatbotWidget\s*\/>\s*\n?/g, '')

  // L7. JSX HTML attribute corrections (LLM occasionally writes raw HTML attrs).
  // Only touches attributes inside opening tags so we don't rewrite text content.
  txt = txt.replace(/(<[a-zA-Z][^>]*?)\sclass="/g, '$1 className="')

  // L8. Strip invalid pseudo-selector keys from inline-style objects.
  // React's CSSProperties does not accept '::marker', '::before', etc. as keys.
  txt = txt.replace(/,\s*['"]::(?:marker|before|after|placeholder|selection|first-line|first-letter)['"]\s*:\s*\{[^}]*\}/g, '')

  // L9. Coerce string aria-level / tabIndex values to numbers (LLM writes
  // `aria-level="3"` which TS rejects as HTMLAttributes type mismatch).
  txt = txt.replace(/\baria-level="(\d+)"/g, 'aria-level={$1}')
  txt = txt.replace(/\btabIndex="(-?\d+)"/g, 'tabIndex={$1}')
  // Same in spread-form: {...{ 'aria-level': '3' }} — easiest to drop the spread.
  txt = txt.replace(/\{\.\.\.\{\s*role:\s*['"]heading['"]\s*,\s*['"]aria-level['"]\s*:\s*['"]\d+['"]\s*\}\}/g, '')

  // L10. Replace hallucinated lucide-react icon refs (LLM forgets the import)
  // with a unicode glyph fallback. Only common arrow / check icons covered.
  if (!/from\s+["']lucide-react["']/.test(txt)) {
    txt = txt
      .replace(/<ArrowRight\s+size=\{[^}]*\}\s*\/>/g, '→')
      .replace(/<ArrowRight\s*\/>/g, '→')
      .replace(/<ArrowLeft\s+size=\{[^}]*\}\s*\/>/g, '←')
      .replace(/<ArrowLeft\s*\/>/g, '←')
      .replace(/<ChevronRight\s+size=\{[^}]*\}\s*\/>/g, '›')
      .replace(/<ChevronRight\s*\/>/g, '›')
      .replace(/<Check\s+size=\{[^}]*\}\s*\/>/g, '✓')
      .replace(/<Check\s*\/>/g, '✓')
  }

  // L11. Final gate: parse the result with TypeScript. Catches LLM
  // truncation, unbalanced braces, unescaped `}`/`>` in JSX text, etc.
  validateTSX(txt)

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
      maxTokens: 12000,
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
