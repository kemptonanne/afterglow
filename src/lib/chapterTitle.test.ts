import { expect, it } from 'vitest';
import { chapterTitle } from './chapterTitle';
it('names full calendar months before any other rule', () => {
  expect(chapterTitle('2026-11-01', '2026-11-30', '2026-11-30')).toBe('Your November');
  expect(chapterTitle('2028-02-01', '2028-02-29', '2028-03-01')).toBe('Your February');
});
it('names only the current month to date as so far', () => {
  expect(chapterTitle('2026-11-01', '2026-11-14', '2026-11-14')).toBe('November, so far');
  expect(chapterTitle('2026-10-01', '2026-10-14', '2026-11-14')).toBe('Oct 1–Oct 14');
});
it('names seven inclusive days as a week including across year boundaries', () => {
  expect(chapterTitle('2026-11-02', '2026-11-08', '2026-11-14')).toBe('Week of Nov 2');
  expect(chapterTitle('2026-12-29', '2027-01-04', '2027-01-05')).toBe('Week of Dec 29');
});
it('uses a date range for other periods', () => {
  expect(chapterTitle('2026-11-02', '2026-11-14', '2026-11-14')).toBe('Nov 2–Nov 14');
  expect(chapterTitle('2026-11-14', '2026-11-14', '2026-11-14')).toBe('Nov 14–Nov 14');
});
