'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  return (
    <button
      onClick={copy}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid rgba(201,168,76,.35)',
        background: copied ? '#C9A84C' : 'transparent',
        color: copied ? '#0b0f1a' : '#C9A84C',
        cursor: 'pointer',
      }}
    >
      {copied ? '✓ Copié' : 'Copier'}
    </button>
  )
}
