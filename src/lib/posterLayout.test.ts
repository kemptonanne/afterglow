import { describe, it, expect } from 'vitest';
import { posterLayout } from './posterLayout';
describe('posterLayout', () => {
  it('uses 3 columns up to 6 moments', () => expect(posterLayout(6)).toEqual({ columns: 3, shown: 6, more: 0 }));
  it('uses 4 columns above 6 moments', () => expect(posterLayout(7).columns).toBe(4));
  it('caps at 12 tiles and reports the rest', () => expect(posterLayout(15)).toEqual({ columns: 4, shown: 12, more: 3 }));
});
