import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: 'saas_session',
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
  });
  return res;
}
