import { describe, it, expect } from 'vitest';
import { ExecutionTrace, deepFreeze } from '../../src/core/trace.js';
import { EventType, ErrorCode } from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';
import { bubbleSort } from '../../src/algorithms/bubbleSort.js';

describe('ExecutionTrace & Snapshot Reconstruction (Unit)', () => {
  function createSampleTrace() {
    const initialArray = [2, 1];
    const events = [
      {
        id: 0,
        step: 1,
        type: EventType.ALGORITHM_START,
        description: 'Bubble Sort simulation started with 2 elements.',
        payload: { array: [2, 1], totalElements: 2 },
        arraySnapshot: [2, 1],
        activeIndices: [],
        lockedIndices: [],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      },
      {
        id: 1,
        step: 2,
        type: EventType.PASS_START,
        description: 'Pass 1 initiated.',
        payload: { pass: 0, unsortedBound: 1 },
        arraySnapshot: [2, 1],
        activeIndices: [],
        lockedIndices: [],
        metrics: { comparisons: 0, swaps: 0, passes: 1 }
      },
      {
        id: 2,
        step: 3,
        type: EventType.COMPARE,
        description: 'Compare 0 and 1',
        payload: { indices: [0, 1], values: [2, 1], shouldSwap: true },
        arraySnapshot: [2, 1],
        activeIndices: [0, 1],
        lockedIndices: [],
        metrics: { comparisons: 1, swaps: 0, passes: 1 }
      },
      {
        id: 3,
        step: 4,
        type: EventType.SWAP,
        description: 'Swap 0 and 1',
        payload: { indices: [0, 1], valuesBefore: [2, 1], valuesAfter: [1, 2] },
        arraySnapshot: [1, 2],
        activeIndices: [0, 1],
        lockedIndices: [],
        metrics: { comparisons: 1, swaps: 1, passes: 1 }
      },
      {
        id: 4,
        step: 5,
        type: EventType.PASS_COMPLETE,
        description: 'Pass 1 complete.',
        payload: { pass: 0, lockedIndex: 1, swapsInPass: 1 },
        arraySnapshot: [1, 2],
        activeIndices: [1],
        lockedIndices: [1],
        metrics: { comparisons: 1, swaps: 1, passes: 1 }
      },
      {
        id: 5,
        step: 6,
        type: EventType.ALGORITHM_COMPLETE,
        description: 'Complete',
        payload: { sortedArray: [1, 2], totalComparisons: 1, totalSwaps: 1, totalPasses: 1, earlyExit: false },
        arraySnapshot: [1, 2],
        activeIndices: [],
        lockedIndices: [0, 1],
        metrics: { comparisons: 1, swaps: 1, passes: 1 }
      }
    ];

    return new ExecutionTrace({
      initialArray,
      events,
      metrics: { totalComparisons: 1, totalSwaps: 1, totalPasses: 1, durationMs: 1 },
      algorithmName: 'testAlgorithm'
    });
  }

  it('should initialize and deeply freeze trace data', () => {
    const trace = createSampleTrace();

    expect(trace.length).toBe(6);
    expect(trace.initialArray).toEqual([2, 1]);
    expect(trace.finalArray).toEqual([1, 2]);
    expect(trace.algorithmName).toBe('testAlgorithm');
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.events)).toBe(true);
    expect(Object.isFrozen(trace.initialArray)).toBe(true);
  });

  it('should reject invalid constructor arguments with structured EngineError', () => {
    // Non-array initialArray
    expect(() => new ExecutionTrace({ initialArray: 'bad', events: [], metrics: {} })).toThrowError(EngineError);
    try {
      new ExecutionTrace({ initialArray: null, events: [], metrics: {} });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_INPUT_TYPE);
    }

    // Non-array events
    expect(() => new ExecutionTrace({ initialArray: [], events: 'bad', metrics: {} })).toThrowError(EngineError);
    try {
      new ExecutionTrace({ initialArray: [], events: null, metrics: {} });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_INPUT_TYPE);
    }

    // Non-object metrics
    expect(() => new ExecutionTrace({ initialArray: [], events: [], metrics: null })).toThrowError(EngineError);
    try {
      new ExecutionTrace({ initialArray: [], events: [], metrics: 123 });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_INPUT_TYPE);
    }

    // Events containing non-object items
    expect(() => new ExecutionTrace({ initialArray: [], events: [null], metrics: {} })).toThrowError(EngineError);
    try {
      new ExecutionTrace({ initialArray: [], events: ['string_event'], metrics: {} });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
    }
  });

  it('should retrieve event by valid index', () => {
    const trace = createSampleTrace();
    const ev = trace.getEvent(2);

    expect(ev.id).toBe(2);
    expect(ev.type).toBe(EventType.COMPARE);
  });

  it('should throw INDEX_OUT_OF_BOUNDS for invalid event index', () => {
    const trace = createSampleTrace();

    expect(() => trace.getEvent(-1)).toThrowError(EngineError);
    expect(() => trace.getEvent(6)).toThrowError(EngineError);

    try {
      trace.getEvent(99);
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INDEX_OUT_OF_BOUNDS);
    }
  });

  it('should return initial pre-execution state for snapshot index -1', () => {
    const trace = createSampleTrace();
    const snap = trace.getSnapshotAt(-1);

    expect(snap.eventIndex).toBe(-1);
    expect(snap.array).toEqual([2, 1]);
    expect(snap.activeIndices).toEqual([]);
    expect(snap.lockedIndices).toEqual([]);
    expect(snap.metrics).toEqual({ comparisons: 0, swaps: 0, passes: 0 });
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('should return valid snapshot at each event index', () => {
    const trace = createSampleTrace();

    const snap0 = trace.getSnapshotAt(0);
    expect(snap0.array).toEqual([2, 1]);

    const snap3 = trace.getSnapshotAt(3);
    expect(snap3.array).toEqual([1, 2]);
    expect(snap3.activeIndices).toEqual([0, 1]);

    const snap5 = trace.getSnapshotAt(5);
    expect(snap5.array).toEqual([1, 2]);
  });

  it('should throw INDEX_OUT_OF_BOUNDS for invalid snapshot index', () => {
    const trace = createSampleTrace();

    expect(() => trace.getSnapshotAt(-2)).toThrowError(EngineError);
    expect(() => trace.getSnapshotAt(6)).toThrowError(EngineError);
  });

  it('should independently reconstruct array state by applying swap deltas', () => {
    const trace = createSampleTrace();

    expect(trace.reconstructState(-1)).toEqual([2, 1]);
    expect(trace.reconstructState(0)).toEqual([2, 1]);
    expect(trace.reconstructState(1)).toEqual([2, 1]);
    expect(trace.reconstructState(2)).toEqual([2, 1]);
    expect(trace.reconstructState(3)).toEqual([1, 2]);
    expect(trace.reconstructState(4)).toEqual([1, 2]);
    expect(trace.reconstructState(5)).toEqual([1, 2]);
  });

  it('should validate valid trace structure successfully', () => {
    const trace = createSampleTrace();
    expect(trace.validate()).toBe(true);
  });

  it('should detect corrupted event IDs during trace validation', () => {
    const corruptedEvents = [
      {
        id: 0,
        step: 1,
        type: EventType.ALGORITHM_START,
        description: 'Start',
        payload: { array: [1], totalElements: 1 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      },
      {
        id: 99, // Corrupted ID
        step: 2,
        type: EventType.ALGORITHM_COMPLETE,
        description: 'End',
        payload: { sortedArray: [1], totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [0],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      }
    ];

    const corruptedTrace = new ExecutionTrace({
      initialArray: [1],
      events: corruptedEvents,
      metrics: { totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
      algorithmName: 'corrupted'
    });

    expect(() => corruptedTrace.validate()).toThrowError(EngineError);
    try {
      corruptedTrace.validate();
    } catch (err) {
      expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      expect(err.message).toContain('Event ID mismatch');
    }
  });

  it('should detect invalid first or last event types during validation', () => {
    const invalidFirst = new ExecutionTrace({
      initialArray: [1],
      events: [
        {
          id: 0,
          step: 1,
          type: EventType.COMPARE, // Should be ALGORITHM_START
          description: 'bad',
          payload: { indices: [0, 1], values: [1, 1], shouldSwap: false },
          arraySnapshot: [1],
          activeIndices: [],
          lockedIndices: [],
          metrics: { comparisons: 1, swaps: 0, passes: 1 }
        },
        {
          id: 1,
          step: 2,
          type: EventType.ALGORITHM_COMPLETE,
          description: 'end',
          payload: { sortedArray: [1], totalComparisons: 1, totalSwaps: 0, totalPasses: 1 },
          arraySnapshot: [1],
          activeIndices: [],
          lockedIndices: [0],
          metrics: { comparisons: 1, swaps: 0, passes: 1 }
        }
      ],
      metrics: { totalComparisons: 1, totalSwaps: 0, totalPasses: 1 }
    });

    expect(() => invalidFirst.validate()).toThrowError(EngineError);
  });

  it('deepFreeze should handle null, primitives, and circular/nested structures safely', () => {
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('str')).toBe('str');

    const nested = { a: { b: [1, 2] } };
    deepFreeze(nested);
    expect(Object.isFrozen(nested)).toBe(true);
    expect(Object.isFrozen(nested.a)).toBe(true);
    expect(Object.isFrozen(nested.a.b)).toBe(true);
  });

  it('deepFreeze should traverse shallow-frozen objects with mutable children', () => {
    const child = { value: 42 };
    const parent = Object.freeze({ child });

    // parent was already frozen before calling deepFreeze
    deepFreeze(parent);
    expect(Object.isFrozen(child)).toBe(true);
  });

  it('deepFreeze should safely handle circular and repeated references', () => {
    const circular = { name: 'cycle' };
    circular.self = circular;

    expect(() => deepFreeze(circular)).not.toThrow();
    expect(Object.isFrozen(circular)).toBe(true);

    const shared = { counter: 10 };
    const dag = { first: shared, second: shared };
    deepFreeze(dag);
    expect(Object.isFrozen(dag.first)).toBe(true);
    expect(Object.isFrozen(dag.second)).toBe(true);
  });

  it('should reject fractional, NaN, non-integer, and out-of-bounds indices consistently', () => {
    const trace = createSampleTrace();
    const badIndices = [1.5, -0.5, NaN, Infinity, -Infinity, '0', null, undefined];

    for (const bad of badIndices) {
      expect(() => trace.getEvent(bad)).toThrowError(EngineError);
      expect(() => trace.getSnapshotAt(bad)).toThrowError(EngineError);
      expect(() => trace.reconstructState(bad)).toThrowError(EngineError);
    }

    // Boundary checks
    expect(() => trace.getEvent(-1)).toThrowError(EngineError);
    expect(() => trace.getEvent(6)).toThrowError(EngineError);
    expect(() => trace.getSnapshotAt(-2)).toThrowError(EngineError);
    expect(() => trace.getSnapshotAt(6)).toThrowError(EngineError);
    expect(() => trace.reconstructState(-2)).toThrowError(EngineError);
    expect(() => trace.reconstructState(6)).toThrowError(EngineError);
  });

  it('should detect tampered snapshots that diverge from independent reconstruction', () => {
    const validTrace = createSampleTrace();
    const corruptedEvents = JSON.parse(JSON.stringify(validTrace.events));
    corruptedEvents[2].arraySnapshot = [999, 1]; // Tampered snapshot in COMPARE event!

    const trace = new ExecutionTrace({
      initialArray: [2, 1],
      events: corruptedEvents,
      metrics: { totalComparisons: 1, totalSwaps: 1, totalPasses: 1 }
    });

    expect(() => trace.validate()).toThrowError(EngineError);
    try {
      trace.validate();
    } catch (err) {
      expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      expect(err.message).toContain('does not match independently reconstructed state');
    }
  });

  it('should detect SWAP event with invalid valuesBefore or valuesAfter', () => {
    const validTrace = createSampleTrace();
    const badSwapEvents = JSON.parse(JSON.stringify(validTrace.events));
    badSwapEvents[3].payload.valuesBefore = [50, 60]; // Fake valuesBefore!
    badSwapEvents[3].payload.valuesAfter = [60, 50];

    const trace = new ExecutionTrace({
      initialArray: [2, 1],
      events: badSwapEvents,
      metrics: { totalComparisons: 1, totalSwaps: 1, totalPasses: 1 }
    });

    expect(() => trace.validate()).toThrowError(EngineError);
    try {
      trace.validate();
    } catch (err) {
      expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      expect(err.message).toContain('valuesBefore do not match current array state before swap');
    }
  });

  it('should detect non-monotonic decreasing metrics', () => {
    const decreasingMetricsEvents = [
      {
        id: 0,
        step: 1,
        type: EventType.ALGORITHM_START,
        description: 'Start',
        payload: { array: [1], totalElements: 1 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [],
        metrics: { comparisons: 5, swaps: 2, passes: 1 }
      },
      {
        id: 1,
        step: 2,
        type: EventType.ALGORITHM_COMPLETE,
        description: 'End',
        payload: { sortedArray: [1], totalComparisons: 4, totalSwaps: 2, totalPasses: 1 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [0],
        metrics: { comparisons: 4, swaps: 2, passes: 1 } // Decreased comparisons!
      }
    ];

    const trace = new ExecutionTrace({
      initialArray: [1],
      events: decreasingMetricsEvents,
      metrics: { totalComparisons: 4, totalSwaps: 2, totalPasses: 1 }
    });

    expect(() => trace.validate()).toThrowError(EngineError);
  });

  it('should detect permutation corruption in final array', () => {
    const validTrace = createSampleTrace();
    const badPermutationEvents = JSON.parse(JSON.stringify(validTrace.events));
    badPermutationEvents[5].payload.sortedArray = [1, 1]; // 2 replaced by 1!
    badPermutationEvents[5].arraySnapshot = [1, 1];

    const trace = new ExecutionTrace({
      initialArray: [2, 1],
      events: badPermutationEvents,
      metrics: { totalComparisons: 1, totalSwaps: 1, totalPasses: 1 }
    });

    expect(() => trace.validate()).toThrowError(EngineError);
  });

  it('should detect trace total metrics mismatch with event metrics', () => {
    const validTrace = createSampleTrace();

    // Mismatched totalComparisons
    const traceComp = new ExecutionTrace({
      initialArray: [2, 1],
      events: validTrace.events,
      metrics: { totalComparisons: 99, totalSwaps: 1, totalPasses: 1 }
    });
    expect(() => traceComp.validate()).toThrowError(EngineError);

    // Mismatched totalSwaps
    const traceSwap = new ExecutionTrace({
      initialArray: [2, 1],
      events: validTrace.events,
      metrics: { totalComparisons: 1, totalSwaps: 99, totalPasses: 1 }
    });
    expect(() => traceSwap.validate()).toThrowError(EngineError);

    // Mismatched totalPasses
    const tracePass = new ExecutionTrace({
      initialArray: [2, 1],
      events: validTrace.events,
      metrics: { totalComparisons: 1, totalSwaps: 1, totalPasses: 99 }
    });
    expect(() => tracePass.validate()).toThrowError(EngineError);
  });

  it('should detect duplicate ALGORITHM_START and premature ALGORITHM_COMPLETE', () => {
    const dupStartEvents = [
      {
        id: 0,
        step: 1,
        type: EventType.ALGORITHM_START,
        description: 'Start',
        payload: { array: [1], totalElements: 1 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      },
      {
        id: 1,
        step: 2,
        type: EventType.ALGORITHM_START, // Duplicate!
        description: 'Start again',
        payload: { array: [1], totalElements: 1 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      },
      {
        id: 2,
        step: 3,
        type: EventType.ALGORITHM_COMPLETE,
        description: 'End',
        payload: { sortedArray: [1], totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [0],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      }
    ];

    const traceDup = new ExecutionTrace({ initialArray: [1], events: dupStartEvents, metrics: { totalComparisons: 0, totalSwaps: 0, totalPasses: 0 } });
    expect(() => traceDup.validate()).toThrowError(EngineError);

    const prematureEvents = [
      {
        id: 0,
        step: 1,
        type: EventType.ALGORITHM_START,
        description: 'Start',
        payload: { array: [1], totalElements: 1 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      },
      {
        id: 1,
        step: 2,
        type: EventType.ALGORITHM_COMPLETE, // Premature!
        description: 'End',
        payload: { sortedArray: [1], totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [0],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      },
      {
        id: 2,
        step: 3,
        type: EventType.ALGORITHM_COMPLETE,
        description: 'End again',
        payload: { sortedArray: [1], totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
        arraySnapshot: [1],
        activeIndices: [],
        lockedIndices: [0],
        metrics: { comparisons: 0, swaps: 0, passes: 0 }
      }
    ];

    const tracePremature = new ExecutionTrace({ initialArray: [1], events: prematureEvents, metrics: { totalComparisons: 0, totalSwaps: 0, totalPasses: 0 } });
    expect(() => tracePremature.validate()).toThrowError(EngineError);
  });

  it('should detect invalid activeIndices, lockedIndices sorting, and index unlocking', () => {
    // Out of bounds active index
    const badActive = new ExecutionTrace({
      initialArray: [1, 2],
      events: [
        {
          id: 0,
          step: 1,
          type: EventType.ALGORITHM_START,
          description: 'Start',
          payload: { array: [1, 2], totalElements: 2 },
          arraySnapshot: [1, 2],
          activeIndices: [99], // out of bounds!
          lockedIndices: [],
          metrics: { comparisons: 0, swaps: 0, passes: 0 }
        },
        {
          id: 1,
          step: 2,
          type: EventType.ALGORITHM_COMPLETE,
          description: 'End',
          payload: { sortedArray: [1, 2], totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
          arraySnapshot: [1, 2],
          activeIndices: [],
          lockedIndices: [0, 1],
          metrics: { comparisons: 0, swaps: 0, passes: 0 }
        }
      ],
      metrics: { totalComparisons: 0, totalSwaps: 0, totalPasses: 0 }
    });
    expect(() => badActive.validate()).toThrowError(EngineError);

    // Unsorted locked indices [1, 0]
    const unsortedLocked = new ExecutionTrace({
      initialArray: [1, 2],
      events: [
        {
          id: 0,
          step: 1,
          type: EventType.ALGORITHM_START,
          description: 'Start',
          payload: { array: [1, 2], totalElements: 2 },
          arraySnapshot: [1, 2],
          activeIndices: [],
          lockedIndices: [],
          metrics: { comparisons: 0, swaps: 0, passes: 0 }
        },
        {
          id: 1,
          step: 2,
          type: EventType.ALGORITHM_COMPLETE,
          description: 'End',
          payload: { sortedArray: [1, 2], totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
          arraySnapshot: [1, 2],
          activeIndices: [],
          lockedIndices: [1, 0], // not ascending!
          metrics: { comparisons: 0, swaps: 0, passes: 0 }
        }
      ],
      metrics: { totalComparisons: 0, totalSwaps: 0, totalPasses: 0 }
    });
    expect(() => unsortedLocked.validate()).toThrowError(EngineError);

    // Unlocking a previously locked index
    const unlockedIndex = new ExecutionTrace({
      initialArray: [1, 2],
      events: [
        {
          id: 0,
          step: 1,
          type: EventType.ALGORITHM_START,
          description: 'Start',
          payload: { array: [1, 2], totalElements: 2 },
          arraySnapshot: [1, 2],
          activeIndices: [],
          lockedIndices: [1], // 1 locked
          metrics: { comparisons: 0, swaps: 0, passes: 0 }
        },
        {
          id: 1,
          step: 2,
          type: EventType.ALGORITHM_COMPLETE,
          description: 'End',
          payload: { sortedArray: [1, 2], totalComparisons: 0, totalSwaps: 0, totalPasses: 0 },
          arraySnapshot: [1, 2],
          activeIndices: [],
          lockedIndices: [0], // 1 was unlocked!
          metrics: { comparisons: 0, swaps: 0, passes: 0 }
        }
      ],
      metrics: { totalComparisons: 0, totalSwaps: 0, totalPasses: 0 }
    });
    expect(() => unlockedIndex.validate()).toThrowError(EngineError);
  });

  it('should serialize trace to JSON summary', () => {
    const trace = createSampleTrace();
    const json = trace.toJSON();

    expect(json.algorithmName).toBe('testAlgorithm');
    expect(json.initialArray).toEqual([2, 1]);
    expect(json.finalArray).toEqual([1, 2]);
    expect(json.eventCount).toBe(6);
  });

  it('should serialize EngineError to JSON object', () => {
    const err = new EngineError(ErrorCode.INDEX_OUT_OF_BOUNDS, 'Test message', { foo: 'bar' });
    const json = err.toJSON();

    expect(json.name).toBe('EngineError');
    expect(json.code).toBe(ErrorCode.INDEX_OUT_OF_BOUNDS);
    expect(json.message).toBe('Test message');
    expect(json.details.foo).toBe('bar');
    expect(typeof json.timestamp).toBe('string');
  });

  describe('Deterministic Field-by-Field Mutation Integrity Tests', () => {
    function cloneValidTrace() {
      const base = createSampleTrace();
      const events = JSON.parse(JSON.stringify(base.events));
      return { base, events };
    }

    it('rejects ALGORITHM_START with array mismatch', () => {
      const { base, events } = cloneValidTrace();
      events[0].payload.array = [99, 1];
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
      expect(base.events[0].payload.array).toEqual([2, 1]); // original not mutated
    });

    it('rejects ALGORITHM_START with invalid totalElements', () => {
      const { base, events } = cloneValidTrace();
      events[0].payload.totalElements = 999;
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects PASS_START with incorrect pass number or unsorted bound', () => {
      const { base, events } = cloneValidTrace();
      events[1].payload.pass = 5; // expected 0
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);

      const { events: events2 } = cloneValidTrace();
      events2[1].payload.unsortedBound = 99; // expected 1
      const trace2 = new ExecutionTrace({ initialArray: [2, 1], events: events2, metrics: base.metrics });
      expect(() => trace2.validate()).toThrowError(EngineError);
    });

    it('rejects COMPARE with non-adjacent indices', () => {
      const { base, events } = cloneValidTrace();
      events[2].payload.indices = [0, 2]; // non-adjacent!
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects COMPARE with values diverging from reconstructed state', () => {
      const { base, events } = cloneValidTrace();
      events[2].payload.values = [100, 200];
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects COMPARE with false shouldSwap when swap is required', () => {
      const { base, events } = cloneValidTrace();
      events[2].payload.shouldSwap = false; // 2 > 1 requires swap!
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects SWAP with non-matching indices from preceding COMPARE', () => {
      const { base, events } = cloneValidTrace();
      events[3].payload.indices = [0, 2]; // doesn't match compare [0, 1]
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects PASS_COMPLETE with corrupted lockedIndex', () => {
      const { base, events } = cloneValidTrace();
      events[4].payload.lockedIndex = 999; // corrupted lockedIndex!
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects PASS_COMPLETE with incorrect swapsInPass', () => {
      const { base, events } = cloneValidTrace();
      events[4].payload.swapsInPass = 0; // expected 1
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects ALGORITHM_COMPLETE with corrupted sortedArray', () => {
      const { base, events } = cloneValidTrace();
      events[5].payload.sortedArray = [999, 1000];
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);
    });

    it('rejects ALGORITHM_COMPLETE with incorrect comparison/swap totals', () => {
      const { base, events } = cloneValidTrace();
      events[5].payload.totalComparisons = 999;
      const trace = new ExecutionTrace({ initialArray: [2, 1], events, metrics: base.metrics });
      expect(() => trace.validate()).toThrowError(EngineError);

      const { events: events2 } = cloneValidTrace();
      events2[5].payload.totalSwaps = 999;
      const trace2 = new ExecutionTrace({ initialArray: [2, 1], events: events2, metrics: base.metrics });
      expect(() => trace2.validate()).toThrowError(EngineError);
    });

    it('rejects trace with missing metrics or non-integer metrics', () => {
      const { events } = cloneValidTrace();
      const trace = new ExecutionTrace({
        initialArray: [2, 1],
        events,
        metrics: { totalComparisons: 'one', totalSwaps: 1, totalPasses: 1 }
      });
      expect(() => trace.validate()).toThrowError(EngineError);
    });
  });

  describe('ExecutionTrace Code Mapping Invariant Validation', () => {
    it('rejects Bubble Sort trace with line: 999 in codeMapping', () => {
      const trace = bubbleSort([2, 1]);
      const raw = {
        initialArray: trace.initialArray,
        events: JSON.parse(JSON.stringify(trace.events)),
        metrics: trace.metrics,
        algorithmName: trace.algorithmName
      };

      raw.events[1].codeMapping = { line: 999, explanation: 'Line 999 out of range' };
      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        expect(err.message).toMatch(/exceeds maximum pseudocode line \(8\)/);
      }
    });

    it('rejects Bubble Sort trace with line: 9 in codeMapping', () => {
      const trace = bubbleSort([2, 1]);
      const raw = {
        initialArray: trace.initialArray,
        events: JSON.parse(JSON.stringify(trace.events)),
        metrics: trace.metrics,
        algorithmName: trace.algorithmName
      };

      raw.events[1].codeMapping = { line: 9, explanation: 'Line 9 out of range' };
      const tampered = new ExecutionTrace(raw);
      expect(() => tampered.validate()).toThrowError(EngineError);
      try {
        tampered.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        expect(err.message).toMatch(/exceeds maximum pseudocode line \(8\)/);
      }
    });

    it('rejects Bubble Sort trace with out-of-range entry in lines array (999 or 9)', () => {
      const trace = bubbleSort([2, 1]);
      const raw = {
        initialArray: trace.initialArray,
        events: JSON.parse(JSON.stringify(trace.events)),
        metrics: trace.metrics,
        algorithmName: trace.algorithmName
      };

      raw.events[1].codeMapping = { line: 2, lines: [2, 999], explanation: 'Contains 999' };
      const tampered999 = new ExecutionTrace(raw);
      expect(() => tampered999.validate()).toThrowError(EngineError);
      try {
        tampered999.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
      }

      const raw2 = {
        initialArray: trace.initialArray,
        events: JSON.parse(JSON.stringify(trace.events)),
        metrics: trace.metrics,
        algorithmName: trace.algorithmName
      };
      raw2.events[1].codeMapping = { line: 2, lines: [2, 9], explanation: 'Contains 9' };
      const tampered9 = new ExecutionTrace(raw2);
      expect(() => tampered9.validate()).toThrowError(EngineError);
      try {
        tampered9.validate();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
      }
    });

    it('verifies valid boundary lines (1 and 8) on actual Bubble Sort trace events', () => {
      const trace = bubbleSort([3, 1, 2]);
      const linesUsed = trace.events.map(e => e.codeMapping.line);

      expect(linesUsed).toContain(1); // Lower boundary: procedure bubbleSort(A)
      expect(linesUsed).toContain(8); // Upper boundary: return A

      for (const ev of trace.events) {
        expect(ev.codeMapping.line).toBeGreaterThanOrEqual(1);
        expect(ev.codeMapping.line).toBeLessThanOrEqual(8);
        for (const l of ev.codeMapping.lines) {
          expect(l).toBeGreaterThanOrEqual(1);
          expect(l).toBeLessThanOrEqual(8);
        }
      }
    });
  });
});


