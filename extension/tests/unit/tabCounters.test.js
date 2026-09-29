import { createTabCounters } from '../../src/background/tabCounters.js';

describe('createTabCounters', () => {
  test('get() returns an empty counter for an unseen tab', () => {
    const counters = createTabCounters();
    expect(counters.get(1)).toEqual({ total: 0, byCategory: {} });
  });

  test('record() accumulates totals and per-category counts', () => {
    const counters = createTabCounters();
    counters.record(1, 'SERVER_ERROR');
    counters.record(1, 'SERVER_ERROR');
    const after = counters.record(1, 'NOT_FOUND');
    expect(after).toEqual({ total: 3, byCategory: { SERVER_ERROR: 2, NOT_FOUND: 1 } });
  });

  test('counters for different tabs are independent', () => {
    const counters = createTabCounters();
    counters.record(1, 'SERVER_ERROR');
    counters.record(2, 'NOT_FOUND');
    expect(counters.get(1)).toEqual({ total: 1, byCategory: { SERVER_ERROR: 1 } });
    expect(counters.get(2)).toEqual({ total: 1, byCategory: { NOT_FOUND: 1 } });
  });

  test('reset() clears a tab back to zero without affecting others', () => {
    const counters = createTabCounters();
    counters.record(1, 'SERVER_ERROR');
    counters.record(2, 'NOT_FOUND');
    counters.reset(1);
    expect(counters.get(1)).toEqual({ total: 0, byCategory: {} });
    expect(counters.get(2)).toEqual({ total: 1, byCategory: { NOT_FOUND: 1 } });
  });

  test('dispose() removes the tab entirely (memory is not leaked)', () => {
    const counters = createTabCounters();
    counters.record(1, 'SERVER_ERROR');
    counters.dispose(1);
    expect(counters.get(1)).toEqual({ total: 0, byCategory: {} });
  });
});
