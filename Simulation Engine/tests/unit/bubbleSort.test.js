import { describe, it, expect } from 'vitest';
import { bubbleSort } from '../../src/algorithms/bubbleSort.js';
import { EventType, ErrorCode } from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';

describe('Bubble Sort Algorithm (Unit)', () => {
  it('should sort an empty array and generate a valid 2-event trace', () => {
    const trace = bubbleSort([]);

    expect(trace.length).toBe(2);
    expect(trace.initialArray).toEqual([]);
    expect(trace.finalArray).toEqual([]);
    expect(trace.events[0].type).toBe(EventType.ALGORITHM_START);
    expect(trace.events[1].type).toBe(EventType.ALGORITHM_COMPLETE);
    expect(trace.metrics.totalComparisons).toBe(0);
    expect(trace.metrics.totalSwaps).toBe(0);
    expect(trace.metrics.totalPasses).toBe(0);
  });

  it('should sort a single-element array and lock index 0', () => {
    const trace = bubbleSort([99]);

    expect(trace.length).toBe(2);
    expect(trace.finalArray).toEqual([99]);
    expect(trace.events[1].lockedIndices).toEqual([0]);
    expect(trace.metrics.totalComparisons).toBe(0);
    expect(trace.metrics.totalSwaps).toBe(0);
  });

  it('should correctly sort an already-sorted array and exit early in pass 1', () => {
    const input = [1, 2, 3, 4, 5];
    const trace = bubbleSort(input);

    expect(trace.finalArray).toEqual([1, 2, 3, 4, 5]);
    expect(trace.metrics.totalSwaps).toBe(0);
    expect(trace.metrics.totalComparisons).toBe(4);
    expect(trace.metrics.totalPasses).toBe(1);

    const completeEvent = trace.events[trace.length - 1];
    expect(completeEvent.payload.earlyExit).toBe(true);
    expect(completeEvent.lockedIndices).toEqual([0, 1, 2, 3, 4]);
  });

  it('should correctly sort a reverse-sorted array', () => {
    const input = [5, 4, 3, 2, 1];
    const trace = bubbleSort(input);

    expect(trace.finalArray).toEqual([1, 2, 3, 4, 5]);
    expect(trace.metrics.totalSwaps).toBe(10);
    expect(trace.metrics.totalComparisons).toBe(10);
    expect(trace.metrics.totalPasses).toBe(4);
  });

  it('should correctly sort an array containing duplicate elements', () => {
    const input = [4, 2, 4, 3, 2, 1];
    const trace = bubbleSort(input);

    expect(trace.finalArray).toEqual([1, 2, 2, 3, 4, 4]);
  });

  it('should correctly sort an array with negative numbers and zeros', () => {
    const input = [-3, 0, -10, 5, -1, 2];
    const trace = bubbleSort(input);

    expect(trace.finalArray).toEqual([-10, -3, -1, 0, 2, 5]);
  });

  it('should guarantee that caller-owned input is not mutated', () => {
    const callerArray = [9, 3, 7, 1];
    const frozenCopy = [...callerArray];

    const trace = bubbleSort(callerArray);

    expect(callerArray).toEqual(frozenCopy);
    expect(trace.finalArray).toEqual([1, 3, 7, 9]);
  });

  it('should strictly pair every COMPARE with either SWAP or NO_SWAP', () => {
    const trace = bubbleSort([3, 1, 2]);

    for (let i = 0; i < trace.events.length; i++) {
      const ev = trace.events[i];
      if (ev.type === EventType.COMPARE) {
        const nextEv = trace.events[i + 1];
        expect([EventType.SWAP, EventType.NO_SWAP]).toContain(nextEv.type);
        expect(nextEv.payload.indices).toEqual(ev.payload.indices);
      }
    }
  });

  it('should enforce event limit boundaries and throw EVENT_LIMIT_EXCEEDED without truncation', () => {
    // 5 elements take at least ~15-20 events
    expect(() => bubbleSort([5, 4, 3, 2, 1], { maxEvents: 4 })).toThrowError(EngineError);

    try {
      bubbleSort([5, 4, 3, 2, 1], { maxEvents: 4 });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.EVENT_LIMIT_EXCEEDED);
      expect(err.details.maxEvents).toBe(4);
    }
  });

  it('should reject invalid or excessive maxEvents configuration', () => {
    // Non-integer, negative, or non-finite
    expect(() => bubbleSort([2, 1], { maxEvents: -5 })).toThrowError(EngineError);
    expect(() => bubbleSort([2, 1], { maxEvents: 10.5 })).toThrowError(EngineError);
    expect(() => bubbleSort([2, 1], { maxEvents: NaN })).toThrowError(EngineError);
    expect(() => bubbleSort([2, 1], { maxEvents: Infinity })).toThrowError(EngineError);

    // Exceeds engine hard ceiling (50000)
    expect(() => bubbleSort([2, 1], { maxEvents: 50001 })).toThrowError(EngineError);
    try {
      bubbleSort([2, 1], { maxEvents: 100000 });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.EVENT_LIMIT_EXCEEDED);
      expect(err.details.hardCeiling).toBe(50000);
    }
  });

  it('should reject hostile non-object options argument gracefully', () => {
    expect(() => bubbleSort([2, 1], 'hostile_string')).toThrowError(EngineError);
    expect(() => bubbleSort([2, 1], 12345)).toThrowError(EngineError);
  });
});

