import { describe, it, expect } from 'vitest';
import { selectionSort } from '../../src/algorithms/selectionSort.js';
import { EventType, ErrorCode } from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';

describe('Selection Sort Algorithm (Unit)', () => {
  it('should sort an empty array and generate a valid 2-event trace', () => {
    const trace = selectionSort([]);

    expect(trace.length).toBe(2);
    expect(trace.initialArray).toEqual([]);
    expect(trace.finalArray).toEqual([]);
    expect(trace.events[0].type).toBe(EventType.ALGORITHM_START);
    expect(trace.events[1].type).toBe(EventType.ALGORITHM_COMPLETE);
    expect(trace.metrics.totalComparisons).toBe(0);
    expect(trace.metrics.totalSwaps).toBe(0);
    expect(trace.metrics.totalPasses).toBe(0);
    expect(trace.metrics.totalCandidateUpdates).toBe(0);
    expect(trace.validate()).toBe(true);
  });

  it('should sort a single-element array and lock index 0', () => {
    const trace = selectionSort([42]);

    expect(trace.length).toBe(2);
    expect(trace.finalArray).toEqual([42]);
    expect(trace.events[1].lockedIndices).toEqual([0]);
    expect(trace.metrics.totalComparisons).toBe(0);
    expect(trace.metrics.totalSwaps).toBe(0);
    expect(trace.metrics.totalCandidateUpdates).toBe(0);
    expect(trace.validate()).toBe(true);
  });

  it('should guarantee that caller-owned input is not mutated', () => {
    const callerArray = [9, 3, 7, 1];
    const frozenCopy = [...callerArray];

    const trace = selectionSort(callerArray);

    expect(callerArray).toEqual(frozenCopy);
    expect(trace.finalArray).toEqual([1, 3, 7, 9]);
    expect(Object.isFrozen(callerArray)).toBe(false);
  });

  it('should sort an already-sorted array and emit NO_SWAP on each pass', () => {
    const input = [1, 2, 3, 4];
    const trace = selectionSort(input);

    expect(trace.finalArray).toEqual([1, 2, 3, 4]);
    expect(trace.metrics.totalSwaps).toBe(0);
    expect(trace.metrics.totalCandidateUpdates).toBe(0);
    expect(trace.metrics.totalComparisons).toBe(6); // 3 + 2 + 1 = 6
    expect(trace.metrics.totalPasses).toBe(3); // n - 1 passes

    // In an already sorted array, candidate remains at i, so NO_SWAP is emitted
    const swapEvents = trace.events.filter(e => e.type === EventType.SWAP);
    const noSwapEvents = trace.events.filter(e => e.type === EventType.NO_SWAP);

    expect(swapEvents.length).toBe(0);
    expect(noSwapEvents.length).toBe(3);
    expect(trace.validate()).toBe(true);
  });

  it('should sort a reverse-sorted array with correct candidate updates and swaps', () => {
    const input = [4, 3, 2, 1];
    const trace = selectionSort(input);

    expect(trace.finalArray).toEqual([1, 2, 3, 4]);
    expect(trace.metrics.totalComparisons).toBe(6);
    expect(trace.metrics.totalSwaps).toBe(2); // pass 0: swaps 4 and 1; pass 1: swaps 3 and 2; pass 2: already 3,4 so no swap
    expect(trace.metrics.totalPasses).toBe(3);
    expect(trace.validate()).toBe(true);
  });

  it('should sort an array with duplicate elements correctly', () => {
    const input = [3, 1, 3, 2, 1];
    const trace = selectionSort(input);

    expect(trace.finalArray).toEqual([1, 1, 2, 3, 3]);
    expect(trace.validate()).toBe(true);
  });

  it('should sort an array with negative numbers and zeros', () => {
    const input = [-5, 0, -12, 8, -1, 4];
    const trace = selectionSort(input);

    expect(trace.finalArray).toEqual([-12, -5, -1, 0, 4, 8]);
    expect(trace.validate()).toBe(true);
  });

  it('should correctly handle an array where all elements are identical', () => {
    const input = [5, 5, 5, 5];
    const trace = selectionSort(input);

    expect(trace.finalArray).toEqual([5, 5, 5, 5]);
    expect(trace.metrics.totalSwaps).toBe(0);
    expect(trace.metrics.totalCandidateUpdates).toBe(0);
    expect(trace.validate()).toBe(true);
  });

  it('should handle repeated minimums without false candidate updates (strictly smaller)', () => {
    const input = [10, 2, 5, 2, 8];
    const trace = selectionSort(input);

    expect(trace.finalArray).toEqual([2, 2, 5, 8, 10]);

    // In pass 0: candidateIndex starts at 0 (val 10).
    // j=1: arr[1]=2 < 10 -> CANDIDATE_UPDATE to index 1.
    // j=3: arr[3]=2 is NOT strictly less than current min candidate arr[1]=2.
    // So there should be only ONE CANDIDATE_UPDATE in pass 0.
    const pass0Events = trace.events.filter(e => e.payload && e.payload.pass === 0);
    const updatesInPass0 = pass0Events.filter(e => e.type === EventType.CANDIDATE_UPDATE);
    expect(updatesInPass0.length).toBe(1);
    expect(updatesInPass0[0].payload.candidateIndex).toBe(1);

    expect(trace.validate()).toBe(true);
  });

  it('should emit candidate select, comparison, candidate update, and swap in proper sequence', () => {
    const input = [3, 1, 2];
    const trace = selectionSort(input);

    // Pass 0:
    // PASS_START (pass 0)
    // CANDIDATE_SELECT (candidateIndex: 0)
    // COMPARE (candidateIndex: 0, j: 1) -> 3 > 1
    // CANDIDATE_UPDATE (previous: 0, candidateIndex: 1)
    // COMPARE (candidateIndex: 1, j: 2) -> 1 < 2
    // SWAP (indices: [0, 1])
    // PASS_COMPLETE (pass 0, lockedIndices: [0])
    const eventTypes = trace.events.map(e => e.type);

    expect(eventTypes).toContain(EventType.ALGORITHM_START);
    expect(eventTypes).toContain(EventType.PASS_START);
    expect(eventTypes).toContain(EventType.CANDIDATE_SELECT);
    expect(eventTypes).toContain(EventType.COMPARE);
    expect(eventTypes).toContain(EventType.CANDIDATE_UPDATE);
    expect(eventTypes).toContain(EventType.SWAP);
    expect(eventTypes).toContain(EventType.PASS_COMPLETE);
    expect(eventTypes).toContain(EventType.ALGORITHM_COMPLETE);

    // Verify pass 0 lockedIndices is [0], pass 1 is [0, 1], complete is [0, 1, 2]
    const pass0Complete = trace.events.find(e => e.type === EventType.PASS_COMPLETE && e.payload && e.payload.pass === 0);
    expect(pass0Complete.lockedIndices).toEqual([0]);

    const pass1Complete = trace.events.find(e => e.type === EventType.PASS_COMPLETE && e.payload && e.payload.pass === 1);
    expect(pass1Complete.lockedIndices).toEqual([0, 1]);

    const algoComplete = trace.events.find(e => e.type === EventType.ALGORITHM_COMPLETE);
    expect(algoComplete.lockedIndices).toEqual([0, 1, 2]);

    expect(trace.validate()).toBe(true);
  });

  it('should enforce event limit boundaries and throw EVENT_LIMIT_EXCEEDED without partial trace corruption', () => {
    expect(() => selectionSort([5, 4, 3, 2, 1], { maxEvents: 5 })).toThrowError(EngineError);

    try {
      selectionSort([5, 4, 3, 2, 1], { maxEvents: 5 });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.EVENT_LIMIT_EXCEEDED);
      expect(err.details.maxEvents).toBe(5);
    }
  });

  it('should reject invalid array inputs with EngineError', () => {
    expect(() => selectionSort('invalid')).toThrowError(EngineError);
    expect(() => selectionSort([1, NaN, 2])).toThrowError(EngineError);
    expect(() => selectionSort(Array.from({ length: 101 }, (_, i) => i))).toThrowError(EngineError);
  });

  it('should produce deterministic traces across multiple executions', () => {
    const input = [15, -2, 8, 3, 0, 9, -5];
    const trace1 = selectionSort(input);
    const trace2 = selectionSort(input);

    expect(trace1.length).toBe(trace2.length);
    expect(JSON.stringify(trace1.events)).toBe(JSON.stringify(trace2.events));
    expect(trace1.finalArray).toEqual(trace2.finalArray);
  });
});
