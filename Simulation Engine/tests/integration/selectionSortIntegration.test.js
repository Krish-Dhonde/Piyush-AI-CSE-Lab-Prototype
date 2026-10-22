import { describe, it, expect } from 'vitest';
import { selectionSort } from '../../src/algorithms/selectionSort.js';
import { PlaybackController } from '../../src/playback/controller.js';
import { VirtualClock } from '../../src/playback/clock.js';
import { ExecutionTrace } from '../../src/core/trace.js';
import { EventType, ErrorCode } from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';

describe('Selection Sort Integration & Invariants', () => {
  function isSorted(arr) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] > arr[i + 1]) return false;
    }
    return true;
  }

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

  describe('Seeded Pseudo-Randomized Correctness & Invariants', () => {
    it('should verify correctness, determinism, and 100% snapshot agreement across 20 seeded pseudo-random arrays', () => {
      // Deterministic LCG
      function makeLCG(seed) {
        let s = seed;
        return function next() {
          s = (s * 1664525 + 1013904223) % 4294967296;
          return s / 4294967296;
        };
      }

      const rng = makeLCG(4242);

      for (let trial = 0; trial < 20; trial++) {
        const length = Math.floor(rng() * 25) + 2; // length between 2 and 26
        const arr = [];
        for (let j = 0; j < length; j++) {
          arr.push(Math.floor(rng() * 50) - 25); // values -25 to 24 with duplicates
        }

        const inputCopy = [...arr];
        const expectedSorted = [...arr].sort((a, b) => a - b);

        const trace1 = selectionSort(arr);
        const trace2 = selectionSort(arr);

        // Determinism
        expect(JSON.stringify(trace1.events)).toBe(JSON.stringify(trace2.events));

        // Input caller-array unmutated
        expect(arr).toEqual(inputCopy);

        // Final output matches trusted native numerical sort
        expect(trace1.finalArray).toEqual(expectedSorted);
        expect(isSorted(trace1.finalArray)).toBe(true);

        // Permutation invariant
        expect(isPermutation(arr, trace1.finalArray)).toBe(true);

        // Self-validation
        expect(trace1.validate()).toBe(true);

        // 100% agreement between every snapshot and independently reconstructed state
        for (let k = -1; k < trace1.length; k++) {
          const snapshot = trace1.getSnapshotAt(k).array;
          const reconstructed = trace1.reconstructState(k);
          expect(snapshot).toEqual(reconstructed);
        }
      }
    });
  });

  describe('PlaybackController with Selection Sort', () => {
    it('should support bidirectional stepForward and stepBackward with exact snapshot matching', () => {
      const input = [14, -5, 22, 0, 8, -5];
      const trace = selectionSort(input);
      const controller = new PlaybackController(trace);

      const snapshots = [controller.getCurrentState().currentSnapshot.array];

      // Forward step
      for (let i = 0; i < trace.length; i++) {
        controller.stepForward();
        snapshots.push(controller.getCurrentState().currentSnapshot.array);
      }

      // Backward step
      for (let i = trace.length; i >= 0; i--) {
        const current = controller.getCurrentState().currentSnapshot.array;
        expect(current).toEqual(snapshots[i]);
        if (i > 0) {
          controller.stepBackward();
        }
      }
    });

    it('should seek to any index and match both cached snapshot and reconstructed state', () => {
      const input = [9, 1, 6, 3, 7];
      const trace = selectionSort(input);
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

    it('should play through Selection Sort trace using VirtualClock and jumpToEnd', () => {
      const input = [5, 2, 4, 1];
      const trace = selectionSort(input);
      const clock = new VirtualClock();
      const controller = new PlaybackController(trace, { clock });

      controller.play();
      // Advance clock through all events (each step is 300ms by default)
      clock.tick(trace.length * 500 + 100);

      expect(controller.getCurrentState().state).toBe('COMPLETED');
      expect(controller.getCurrentState().currentSnapshot.array).toEqual([1, 2, 4, 5]);

      controller.reset();
      expect(controller.getCurrentState().state).toBe('READY');
      expect(controller.getCurrentState().eventIndex).toBe(-1);
      expect(controller.currentIndex).toBe(-1);

      controller.seek(trace.length - 1);
      expect(controller.getCurrentState().state).toBe('COMPLETED');
      expect(controller.getCurrentState().eventIndex).toBe(trace.length - 1);
      expect(controller.currentIndex).toBe(trace.length - 1);
      expect(controller.getCurrentState().currentSnapshot.array).toEqual([1, 2, 4, 5]);
    });
  });

  describe('Trace Tampering & Rejection (Selection Sort)', () => {
    function getDeepClone(trace) {
      return {
        algorithmName: trace.algorithmName,
        initialArray: [...trace.initialArray],
        finalArray: [...trace.finalArray],
        events: JSON.parse(JSON.stringify(trace.events)),
        metrics: { ...trace.metrics }
      };
    }

    it('should reject tampered CANDIDATE_SELECT candidateIndex', () => {
      const trace = selectionSort([5, 2, 8]);
      const raw = getDeepClone(trace);

      const selectIdx = raw.events.findIndex(e => e.type === EventType.CANDIDATE_SELECT);
      expect(selectIdx).toBeGreaterThanOrEqual(0);

      raw.events[selectIdx].payload.minIndex = 99; // Invalid index
      raw.events[selectIdx].payload.candidateIndex = 99;

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
    });

    it('should reject tampered CANDIDATE_UPDATE payload', () => {
      const trace = selectionSort([5, 2, 8]);
      const raw = getDeepClone(trace);

      const updateIdx = raw.events.findIndex(e => e.type === EventType.CANDIDATE_UPDATE);
      expect(updateIdx).toBeGreaterThanOrEqual(0);

      raw.events[updateIdx].payload.previousMinIndex = 88; // Tampered previous index
      raw.events[updateIdx].payload.previousCandidateIndex = 88;

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
    });

    it('should reject tampered snapshot array in Selection Sort trace', () => {
      const trace = selectionSort([4, 1, 3]);
      const raw = getDeepClone(trace);

      // Corrupt arraySnapshot at event 2
      raw.events[2].arraySnapshot[0] = 999;

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
    });

    it('should reject tampered metrics in Selection Sort trace', () => {
      const trace = selectionSort([4, 1, 3]);
      const raw = getDeepClone(trace);

      raw.metrics.totalCandidateUpdates = 999; // Inconsistent

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
    });

    it('should reject invalid code mapping in Selection Sort event', () => {
      const trace = selectionSort([4, 1, 3]);
      const raw = getDeepClone(trace);

      raw.events[1].codeMapping = { line: 0, explanation: 'Zero line invalid' };

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
      }
    });

    it('should reject out-of-range line 999 in Selection Sort event code mapping', () => {
      const trace = selectionSort([4, 1, 3]);
      const raw = getDeepClone(trace);

      raw.events[1].codeMapping = { line: 999, explanation: 'Line 999 out of range' };

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        expect(err.message).toMatch(/exceeds maximum pseudocode line \(11\)/);
      }
    });

    it('should reject out-of-range line 12 in Selection Sort event code mapping', () => {
      const trace = selectionSort([4, 1, 3]);
      const raw = getDeepClone(trace);

      raw.events[1].codeMapping = { line: 12, explanation: 'Line 12 exceeds Selection Sort max lines (11)' };

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        expect(err.message).toMatch(/exceeds maximum pseudocode line \(11\)/);
      }
    });

    it('should reject lines array containing out-of-range entry (999 or 12) in Selection Sort event code mapping', () => {
      const trace = selectionSort([4, 1, 3]);
      const raw = getDeepClone(trace);

      raw.events[1].codeMapping = { line: 2, lines: [2, 999], explanation: 'Contains line 999' };

      const tampered999 = new ExecutionTrace(raw);
      expect(() => tampered999.validate()).toThrowError(EngineError);
      try {
        tampered999.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
      }

      const raw2 = getDeepClone(trace);
      raw2.events[1].codeMapping = { line: 2, lines: [2, 12], explanation: 'Contains line 12' };

      const tampered12 = new ExecutionTrace(raw2);
      expect(() => tampered12.validate()).toThrowError(EngineError);
      try {
        tampered12.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
      }
    });

    it('should verify valid boundary line numbers (1 and 11) on actual Selection Sort trace events', () => {
      const trace = selectionSort([3, 1, 2]);
      const linesUsed = trace.events.map(e => e.codeMapping.line);

      expect(linesUsed).toContain(1);  // Lower boundary: procedure selectionSort(A)
      expect(linesUsed).toContain(11); // Upper boundary: return A

      for (const ev of trace.events) {
        expect(ev.codeMapping.line).toBeGreaterThanOrEqual(1);
        expect(ev.codeMapping.line).toBeLessThanOrEqual(11);
        for (const l of ev.codeMapping.lines) {
          expect(l).toBeGreaterThanOrEqual(1);
          expect(l).toBeLessThanOrEqual(11);
        }
      }
    });

    it('should reject non-permutation finalArray in Selection Sort trace', () => {
      const trace = selectionSort([4, 1, 3]);
      const raw = getDeepClone(trace);

      const lastIdx = raw.events.length - 1;
      raw.events[lastIdx].payload.sortedArray = [1, 3, 99];
      raw.events[lastIdx].arraySnapshot = [1, 3, 99];

      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
    });
  });
});
