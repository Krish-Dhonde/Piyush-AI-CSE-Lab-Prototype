import { describe, it, expect } from 'vitest';
import { bubbleSort } from '../../src/algorithms/bubbleSort.js';
import { PlaybackController } from '../../src/playback/controller.js';
import { VirtualClock } from '../../src/playback/clock.js';

describe('Determinism & Invariant Correctness (Integration)', () => {
  /**
   * Helper to verify if array is sorted in ascending order.
   */
  function isSorted(arr) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] > arr[i + 1]) return false;
    }
    return true;
  }

  /**
   * Helper to verify multiset equality (permutation check).
   */
  function isPermutation(a, b) {
    if (a.length !== b.length) return false;
    const countA = new Map();
    const countB = new Map();

    for (const x of a) countA.set(x, (countA.get(x) || 0) + 1);
    for (const x of b) countB.set(x, (countB.get(x) || 0) + 1);

    if (countA.size !== countB.size) return false;
    for (const [k, v] of countA.entries()) {
      if (countB.get(k) !== v) return false;
    }
    return true;
  }

  it('should generate byte-for-byte identical event sequences for repeated executions (Determinism)', () => {
    const input = [29, -4, 15, 0, 8, -4, 42, 10, -18, 3];

    const trace1 = bubbleSort(input);
    const trace2 = bubbleSort(input);
    const trace3 = bubbleSort(input);

    expect(trace1.length).toBe(trace2.length);
    expect(trace2.length).toBe(trace3.length);

    const json1 = JSON.stringify(trace1.events);
    const json2 = JSON.stringify(trace2.events);
    const json3 = JSON.stringify(trace3.events);

    expect(json1).toBe(json2);
    expect(json2).toBe(json3);
  });

  it('should maintain mathematical invariants across diverse generated arrays', () => {
    // Generate various test cases
    const testCases = [
      [],
      [42],
      [-10, 10],
      [1, 1, 1, 1, 1],
      [5, 4, 3, 2, 1, 0, -1, -2],
      [-50, 20.5, 0, -12.3, 100, -50, 4.2],
      Array.from({ length: 25 }, (_, i) => 25 - i), // reverse 25
      Array.from({ length: 50 }, (_, i) => (i * 37) % 100 - 50) // pseudo-random 50
    ];

    for (const input of testCases) {
      const originalCopy = [...input];
      const trace = bubbleSort(input);

      // Invariant 1: Caller array is never mutated
      expect(input).toEqual(originalCopy);

      // Invariant 2: Output array is sorted
      expect(isSorted(trace.finalArray)).toBe(true);

      // Invariant 3: Output array is a permutation of input
      expect(isPermutation(input, trace.finalArray)).toBe(true);

      // Invariant 4: Trace self-validates
      expect(trace.validate()).toBe(true);
    }
  });

  it('should guarantee bidirectional symmetry: stepForward to end then stepBackward reconstructs exact snapshots', () => {
    const input = [12, -3, 7, 0, 5];
    const trace = bubbleSort(input);
    const controller = new PlaybackController(trace);

    // Forward traversal recording snapshots
    const forwardSnapshots = [controller.getCurrentState().currentSnapshot.array];
    for (let i = 0; i < trace.length; i++) {
      controller.stepForward();
      forwardSnapshots.push(controller.getCurrentState().currentSnapshot.array);
    }

    // Backward traversal verifying snapshots
    for (let i = trace.length; i >= 0; i--) {
      const current = controller.getCurrentState().currentSnapshot.array;
      expect(current).toEqual(forwardSnapshots[i]);
      if (i > 0) {
        controller.stepBackward();
      }
    }
  });

  it('should verify seeking to index matches both cached snapshot and reconstructed delta state', () => {
    const input = [8, 3, 1, 9, 2];
    const trace = bubbleSort(input);
    const controller = new PlaybackController(trace);

    for (let i = -1; i < trace.length; i++) {
      controller.seek(i);

      const controllerSnapshot = controller.getCurrentState().currentSnapshot.array;
      const traceSnapshot = trace.getSnapshotAt(i).array;
      const reconstructedState = trace.reconstructState(i);

      expect(controllerSnapshot).toEqual(traceSnapshot);
      expect(traceSnapshot).toEqual(reconstructedState);
    }
  });

  it('should verify correctness, determinism, and 100% snapshot agreement across 20 seeded pseudo-random arrays', () => {
    // Linear Congruential Generator (LCG) for deterministic pseudo-random sequences
    function makeLCG(seed) {
      let s = seed;
      return function next() {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
      };
    }

    const rng = makeLCG(1337);

    for (let trial = 0; trial < 20; trial++) {
      const length = Math.floor(rng() * 30) + 2; // length between 2 and 31
      const arr = [];
      for (let j = 0; j < length; j++) {
        // Values between -100 and 100 with frequent duplicates
        arr.push(Math.floor(rng() * 40) - 20);
      }

      const inputCopy = [...arr];
      const trace1 = bubbleSort(arr);
      const trace2 = bubbleSort(arr);

      // Determinism: Repeated runs yield identical serialized event sequences
      expect(JSON.stringify(trace1.events)).toBe(JSON.stringify(trace2.events));

      // Input unmutated
      expect(arr).toEqual(inputCopy);

      // Final output sorted
      expect(isSorted(trace1.finalArray)).toBe(true);

      // Permutation preserved
      expect(isPermutation(arr, trace1.finalArray)).toBe(true);

      // Validation passes
      expect(trace1.validate()).toBe(true);

      // 100% agreement between every event snapshot and independently reconstructed state
      for (let k = -1; k < trace1.length; k++) {
        const snapshot = trace1.getSnapshotAt(k).array;
        const reconstructed = trace1.reconstructState(k);
        expect(snapshot).toEqual(reconstructed);
      }
    }
  });
});

