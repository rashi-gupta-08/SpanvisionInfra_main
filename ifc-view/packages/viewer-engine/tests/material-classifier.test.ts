import { describe, expect, it } from 'vitest';
import { classifyMaterial } from '../src';

describe('classifyMaterial', () => {
  it.each([
    ['CLT panel', 'wood'],
    ['gewapend beton', 'concrete'],
    ['structural steel', 'steel'],
    ['glass facade', 'glass'],
    ['unclassified finish', 'default'],
  ] as const)('classifies %s as %s', (name, expected) => {
    expect(classifyMaterial(name)).toBe(expected);
  });
});
