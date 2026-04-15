const TOP_COMMON = new Set([
  'password','password1','password123','qwerty','qwerty123','123456789','12345678',
  'abc123','letmein','welcome','admin','administrator','root','toor','changeme',
  'passw0rd','iloveyou','monkey','dragon','football','baseball','master','shadow',
  '123qwe','qazwsx','zaq12wsx','1qaz2wsx','azerty','azerty123','motdepasse',
  'azertyuiop','qwertyuiop','trustno1','superman','batman','pokemon','starwars',
  'mustang','harley','ranger','cowboy','sunshine','flower','princess','tigger',
  'password!','password1!','p@ssw0rd','p@ssword','p@ssword1','admin123','root123',
  'secret','secret123','test123','demo1234','welcome1','welcome123','hello123',
  'changeme123','letmein123','login123','user1234','pass1234','qwertyui',
])

export type PasswordCheck = {
  ok: boolean
  reason?: 'too_short' | 'common' | 'no_letter' | 'no_digit' | 'no_variety'
}

export function checkPassword(pw: string, minLength = 12): PasswordCheck {
  if (!pw || pw.length < minLength) return { ok: false, reason: 'too_short' }
  const lower = pw.toLowerCase()
  if (TOP_COMMON.has(lower)) return { ok: false, reason: 'common' }
  if (!/[a-zA-Z]/.test(pw)) return { ok: false, reason: 'no_letter' }
  if (!/[0-9]/.test(pw)) return { ok: false, reason: 'no_digit' }
  // variety: at least 5 unique chars
  const unique = new Set(pw).size
  if (unique < 5) return { ok: false, reason: 'no_variety' }
  return { ok: true }
}

/** Check password against HIBP k-anonymity API (online). Returns count of pwns (0 = safe). */
export async function hibpPwnedCount(pw: string): Promise<number> {
  const enc = new TextEncoder()
  const data = enc.encode(pw)
  const hashBuf = await crypto.subtle.digest('SHA-1', data)
  const hex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  const prefix = hex.slice(0, 5)
  const suffix = hex.slice(5)
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return 0
    const text = await res.text()
    for (const line of text.split('\n')) {
      const [hashSuffix, count] = line.trim().split(':')
      if (hashSuffix === suffix) return parseInt(count || '0', 10)
    }
    return 0
  } catch {
    // network-safe fallback: don't block registration if HIBP is down
    return 0
  }
}
