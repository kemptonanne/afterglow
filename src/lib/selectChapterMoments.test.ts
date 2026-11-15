import { describe, expect, it } from 'vitest';
import { selectChapterMoments, type ChapterCandidate } from './selectChapterMoments';
const make = (n: number, extra: Partial<ChapterCandidate> = {}): ChapterCandidate => ({ id: String(n).padStart(3, '0'), moment_date: `2026-11-${String(n).padStart(2, '0')}`, emojis: ['😌'], has_photo: false, has_video: false, has_audio: false, ...extra });
const select = (m: ChapterCandidate[]) => selectChapterMoments(m, '2026-11-01', '2026-11-30');
describe('selectChapterMoments', () => {
  it('returns [] when there are no moments in the period', () => {
    expect(select([])).toEqual([]);
    expect(select([make(1, { moment_date: '2026-10-31' }), make(2, { moment_date: '2026-12-01' })])).toEqual([]);
  });
  it('picks all 3 moments in a month, chronologically', () => {
    const moments = [make(30), make(1), make(15)];
    expect(select(moments)).toEqual([moments[1], moments[2], moments[0]]);
  });
  it('returns the same ids in the same order twice and with reversed input', () => {
    const moments = Array.from({ length: 25 }, (_, i) => make(i + 1, { has_photo: i % 3 === 0, has_audio: i % 3 === 1 }));
    const ids = (m: ChapterCandidate[]) => select(m).map(x => x.id);
    expect(ids(moments)).toEqual(ids(moments));
    expect(ids([...moments].reverse())).toEqual(ids(moments));
  });
  it('caps a month of 20 photos and 2 quotes at 3 pictures and includes a quote', () => {
    const picked = select([...Array.from({ length: 20 }, (_, i) => make(i + 1, { has_photo: true })), make(21), make(22)]);
    expect(picked.filter(m => m.has_photo || m.has_video).length).toBeLessThanOrEqual(3);
    expect(picked.some(m => !m.has_photo && !m.has_video && !m.has_audio)).toBe(true);
  });
  it('includes the sole 🎉 moment in an otherwise 😌 month', () => {
    const moments = Array.from({ length: 30 }, (_, i) => make(i + 1, { emojis: [i === 12 ? '🎉' : '😌'] }));
    expect(select(moments).some(m => m.id === '013')).toBe(true);
  });
  it('includes the last-week moment when all others are in the first week', () => {
    const moments = [...Array.from({ length: 20 }, (_, i) => make(i + 1, { moment_date: `2026-11-0${i % 7 + 1}` })), make(28)];
    expect(select(moments).some(m => m.id === '028')).toBe(true);
  });
  it('fills all six monthly slots when only photos exist', () => {
    const picked = select(Array.from({ length: 30 }, (_, i) => make(i + 1, { has_photo: true })));
    expect(picked).toHaveLength(6);
    expect(picked.every(m => m.has_photo)).toBe(true);
  });
  it('counts video-only moments as pictures', () => {
    const picked = select([...Array.from({ length: 20 }, (_, i) => make(i + 1, { has_video: true })), make(21), make(22)]);
    expect(picked.some(m => m.has_video && !m.has_photo)).toBe(true);
    expect(picked.filter(m => m.has_video).length).toBeLessThanOrEqual(3);
    expect(select(Array.from({ length: 10 }, (_, i) => make(i + 1, { has_video: true })))).toHaveLength(6);
  });
  it('uses inclusive dates, preserves inputs, and uses four weekly and nine long-period slots', () => {
    const moments = Array.from({ length: 30 }, (_, i) => make(i + 1));
    const before = JSON.stringify(moments);
    expect(selectChapterMoments(moments, '2026-11-01', '2026-11-07')).toHaveLength(4);
    expect(selectChapterMoments(moments, '2026-10-01', '2026-11-30')).toHaveLength(9);
    expect(selectChapterMoments([make(1), make(7)], '2026-11-01', '2026-11-07')).toHaveLength(2);
    expect(JSON.stringify(moments)).toBe(before);
  });
});
