/**
 * Safe font-family chain with emoji fallbacks.
 *
 * Why this file exists: flag emoji bug recurs every time someone inlines
 * an Inter-only chain (e.g. Inter, system-ui, sans-serif) that shadows the
 * emoji fallback inherited from globals.css. Flags then render as "FR"/"US"
 * letter pairs on Windows+Chrome / Linux instead of 🇫🇷/🇺🇸.
 *
 * Rule: NEVER inline `fontFamily: 'Inter, ...'` without the emoji chain.
 * Use FONT_STACK or `'inherit'` instead.
 */
export const FONT_STACK = "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif"
