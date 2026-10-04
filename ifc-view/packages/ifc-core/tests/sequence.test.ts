import { describe, expect, it } from 'vitest';
import { createSequenceState, naturalSort } from '../src';

describe('naturalSort', () => {
  it('orders numeric and mixed construction labels naturally', () => {
    const values = ['Level 10', 'Level 2', 'Level 1', '20', '3'];

    expect(values.sort(naturalSort)).toEqual(['3', '20', 'Level 1', 'Level 2', 'Level 10']);
  });
});

describe('createSequenceState', () => {
  const parameter = {
    values: new Set(['Phase 10', 'Phase 2', 'Phase 1']),
    objectIds: new Map([
      ['Phase 1', [11, 12]],
      ['Phase 2', [21]],
      ['Phase 10', [101, 102]],
    ]),
  };

  it('separates completed, current, and future elements', () => {
    const state = createSequenceState(parameter, 1);

    expect(state.orderedValues).toEqual(['Phase 1', 'Phase 2', 'Phase 10']);
    expect([...state.completedElementIds]).toEqual([11, 12]);
    expect([...state.currentElementIds]).toEqual([21]);
    expect([...state.futureElementIds]).toEqual([101, 102]);
  });

  it('clamps an index beyond the available groups', () => {
    const state = createSequenceState(parameter, 99);

    expect(state.currentIndex).toBe(2);
    expect([...state.currentElementIds]).toEqual([101, 102]);
  });
});
