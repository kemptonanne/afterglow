import { describe, it, expect } from 'vitest';
import { transcriptView } from './transcriptView';
const t0 = Date.parse('2026-11-15T00:00:00Z');
describe('transcriptView', () => {
  it('pending under 2 minutes stays pending', () => expect(transcriptView({ transcription_status: 'pending', created_at: '2026-11-15T00:00:00Z' }, t0 + 119_000)).toBe('pending'));
  it('pending over 2 minutes becomes retryable failure', () => expect(transcriptView({ transcription_status: 'pending', created_at: '2026-11-15T00:00:00Z' }, t0 + 121_000)).toBe('failed'));
  it('too_large is shown as too large', () => expect(transcriptView({ transcription_status: 'too_large', created_at: '2026-11-15T00:00:00Z' }, t0)).toBe('too_large'));
});
