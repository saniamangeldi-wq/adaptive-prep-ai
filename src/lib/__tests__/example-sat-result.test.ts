import { describe, expect, it } from 'vitest';
import { canViewExampleSatResult, exampleSatResult as result } from '../example-sat-result';

describe('personal SAT example', () => {
  it('shows 1190 overall, 520 verbal, and 670 math', () => {
    expect([result.overall, result.verbal, result.math]).toEqual([1190, 520, 670]);
    expect(result.verbal + result.math).toBe(result.overall);
  });
  it('has exactly five math mistakes: two algebra, two advanced math, one trigonometry', () => {
    expect(result.mathTopics.map(t => t.mistakes)).toEqual([2, 2, 0, 1]);
    expect(result.mathTopics.reduce((n, t) => n + t.mistakes, 0)).toBe(5);
    expect(result.mathTopics.reduce((n, t) => n + t.total, 0)).toBe(44);
  });
  it('makes Standard English Conventions the lowest of four verbal domains', () => {
    expect(result.verbalTopics).toHaveLength(4);
    expect(result.verbalTopics.reduce((n, t) => n + t.total, 0)).toBe(54);
    const conventions = result.verbalTopics.find(t => t.name === 'Standard English Conventions');
    expect(conventions).toBeDefined();
    if (!conventions) throw new Error('Missing conventions domain');
    for (const topic of result.verbalTopics.filter(t => t !== conventions)) {
      expect((conventions.total - conventions.mistakes) / conventions.total)
        .toBeLessThan((topic.total - topic.mistakes) / topic.total);
    }
  });
  it('only offers the personal example to Sani’s accounts', () => {
    expect(canViewExampleSatResult('sani.amangeldi@gmail.com')).toBe(true);
    expect(canViewExampleSatResult('sani.amangeldi09@gmail.com')).toBe(true);
    expect(canViewExampleSatResult('other@example.com')).toBe(false);
    expect(canViewExampleSatResult(null)).toBe(false);
  });
});