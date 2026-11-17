import { describe, expect, it } from 'vitest';
import { canViewExampleSatResult, exampleSatResult as result, getExampleSatResult } from '../example-sat-result';

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

describe('second personal SAT example (math 700, verbal 480)', () => {
  const second = getExampleSatResult('1180');
  if (!second) throw new Error('Missing the 1180 example');

  it('shows 1180 overall, 480 verbal, and 700 math', () => {
    expect([second.overall, second.verbal, second.math]).toEqual([1180, 480, 700]);
    expect(second.verbal + second.math).toBe(second.overall);
  });
  it('has exactly three math mistakes: one algebra, one advanced math, one data analysis', () => {
    expect(second.mathTopics.map(t => t.mistakes)).toEqual([1, 1, 1, 0]);
    expect(second.mathTopics.reduce((n, t) => n + t.mistakes, 0)).toBe(3);
    expect(second.mathTopics.reduce((n, t) => n + t.total, 0)).toBe(44);
    expect(second.mathCorrect).toBe(44 - 3);
  });
  it('makes Standard English Conventions the lowest of four verbal domains', () => {
    expect(second.verbalTopics).toHaveLength(4);
    expect(second.verbalTopics.reduce((n, t) => n + t.total, 0)).toBe(54);
    const conventions = second.verbalTopics.find(t => t.name === 'Standard English Conventions');
    expect(conventions).toBeDefined();
    if (!conventions) throw new Error('Missing conventions domain');
    for (const topic of second.verbalTopics.filter(t => t !== conventions)) {
      expect((conventions.total - conventions.mistakes) / conventions.total)
        .toBeLessThan((topic.total - topic.mistakes) / topic.total);
    }
  });
  it('counts verbal mistakes so the section shows 27 of 54 correct', () => {
    expect(second.verbalTopics.reduce((n, t) => n + t.mistakes, 0)).toBe(27);
    expect(second.verbalCorrect).toBe(54 - 27);
  });
  it('marks only the conventions domain as the review priority', () => {
    expect(second.verbalTopics.filter(t => t.priority).map(t => t.name)).toEqual(['Standard English Conventions']);
    expect(second.mathTopics.some(t => t.priority)).toBe(false);
  });
  it('keeps the two examples separate and rejects unknown ids', () => {
    expect(getExampleSatResult()?.id).toBe('1190');
    expect(second.id).toBe('1180');
    expect(second.overall).not.toBe(result.overall);
    expect(getExampleSatResult('9999')).toBeUndefined();
  });
});