import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 10;

type TicketState =
  | 'queued' | 'claimed' | 'in_progress' | 'pr_open'
  | 'merged' | 'done' | 'failed' | 'blocked' | 'draft';

type StatusSummary = 'queued' | 'building' | 'done' | 'failed';

function toStatusSummary(state: TicketState): StatusSummary {
  switch (state) {
    case 'done':
    case 'merged':
      return 'done';
    case 'failed':
    case 'blocked':
      return 'failed';
    case 'claimed':
    case 'in_progress':
    case 'pr_open':
      return 'building';
    default:
      return 'queued';
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: idea, error: ideaErr } = await admin
    .from('business_ideas')
    .select('minato_ticket_id, pushed_to_minato_at')
    .eq('id', id)
    .single();

  if (ideaErr || !idea) {
    return NextResponse.json({ ok: false, error: 'idea not found' }, { status: 404 });
  }

  const ticketId = (idea as Record<string, unknown>).minato_ticket_id as string | null;

  if (!ticketId) {
    return NextResponse.json({
      ok: true,
      ticket_id: null,
      status: null,
      last_event_at: null,
    });
  }

  const { data: ticket, error: ticketErr } = await admin
    .from('minato_tickets')
    .select('id, state, updated_at, error_message, heartbeat_at, claimed_by, commit_sha, pr_url')
    .eq('id', ticketId)
    .single();

  if (ticketErr || !ticket) {
    return NextResponse.json({ ok: false, error: 'ticket not found' }, { status: 404 });
  }

  const t = ticket as {
    id: string;
    state: TicketState;
    updated_at: string;
    error_message: string | null;
    heartbeat_at: string | null;
    claimed_by: string | null;
    commit_sha: string | null;
    pr_url: string | null;
  };

  const last_event_at = t.heartbeat_at ?? t.updated_at;
  const status = toStatusSummary(t.state);

  const response: Record<string, unknown> = {
    ok: true,
    ticket_id: t.id,
    status,
    raw_state: t.state,
    last_event_at,
  };

  if (t.error_message) {
    response.error = t.error_message;
  }
  if (t.claimed_by) {
    response.claimed_by = t.claimed_by;
  }
  if (t.commit_sha) {
    response.commit_sha = t.commit_sha;
  }
  if (t.pr_url) {
    response.pr_url = t.pr_url;
  }

  return NextResponse.json(response);
}
