import type { Moment } from './moments';
export const STALE_PENDING_MS = 2 * 60 * 1000;
/** What the moment view shows for a voice note; "pending" older than 2 minutes counts as failed so it can be retried. */
export function transcriptView(m: Pick<Moment, 'transcription_status' | 'created_at'>, now = Date.now()) {
  const s = m.transcription_status;
  if (s === 'pending') return now - new Date(m.created_at).getTime() > STALE_PENDING_MS ? 'failed' : 'pending';
  if (s === 'done' || s === 'failed' || s === 'too_large') return s;
  return 'none';
}
