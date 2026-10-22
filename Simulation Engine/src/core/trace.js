import { EventType, ErrorCode } from './types.js';
import { EngineError } from './errors.js';
import { validateCodeMapping } from './validator.js';
import { deepFreeze } from './freeze.js';

export { deepFreeze };

/**
 * Helper to assert that an index argument is a valid finite integer.
 *
 * @param {unknown} index
 * @param {number} min
 * @param {number} max
 * @param {string} paramName
 * @throws {EngineError} If index is not an integer or is out of bounds
 */
function assertValidIntegerIndex(index, min, max, paramName) {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < min || index > max) {
    throw new EngineError(
      ErrorCode.INDEX_OUT_OF_BOUNDS,
      `${paramName} ${String(index)} is invalid or out of bounds [${min}, ${max}]. Expected a finite integer.`,
      { [paramName]: index, min, max }
    );
  }
}

/**
 * Helper to assert that a value is a strict finite integer.
 *
 * @param {unknown} val
 * @param {string} fieldName
 * @param {object} [context={}]
 * @throws {EngineError}
 */
function assertStrictInteger(val, fieldName, context = {}) {
  if (typeof val !== 'number' || !Number.isFinite(val) || !Number.isInteger(val)) {
    throw new EngineError(
      ErrorCode.TRACE_INTEGRITY_VIOLATION,
      `Trace validation failed: Field '${fieldName}' must be a finite integer. Received: ${String(val)}.`,
      { fieldName, value: val, ...context }
    );
  }
}

/**
 * Helper to assert that a value is a strict non-negative finite integer.
 *
 * @param {unknown} val
 * @param {string} fieldName
 * @param {object} [context={}]
 * @throws {EngineError}
 */
function assertStrictNonNegativeInteger(val, fieldName, context = {}) {
  assertStrictInteger(val, fieldName, context);
  if (val < 0) {
    throw new EngineError(
      ErrorCode.TRACE_INTEGRITY_VIOLATION,
      `Trace validation failed: Field '${fieldName}' must be a non-negative integer. Received: ${val}.`,
      { fieldName, value: val, ...context }
    );
  }
}

/**
 * Encapsulates an immutable execution trace produced by an algorithm simulation.
 */
export class ExecutionTrace {
  /**
   * @param {object} params
   * @param {readonly number[]} params.initialArray
   * @param {readonly object[]} params.events
   * @param {object} params.metrics
   * @param {string} [params.algorithmName='unknown']
   */
  constructor({ initialArray, events, metrics, algorithmName = 'unknown' }) {
    if (!Array.isArray(initialArray)) {
      throw new EngineError(
        ErrorCode.INVALID_INPUT_TYPE,
        `Trace initialArray must be an array. Received: ${typeof initialArray}`,
        { initialArray }
      );
    }
    if (!Array.isArray(events)) {
      throw new EngineError(
        ErrorCode.INVALID_INPUT_TYPE,
        `Trace events must be an array. Received: ${typeof events}`,
        { events }
      );
    }
    if (metrics === null || typeof metrics !== 'object') {
      throw new EngineError(
        ErrorCode.INVALID_INPUT_TYPE,
        `Trace metrics must be an object. Received: ${typeof metrics}`,
        { metrics }
      );
    }

    this.algorithmName = String(algorithmName);
    this.initialArray = Object.freeze([...initialArray]);
    this.events = Object.freeze(
      events.map((e) => {
        if (!e || typeof e !== 'object') {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            'Trace event must be a non-null object.',
            { event: e }
          );
        }
        return deepFreeze(JSON.parse(JSON.stringify(e)));
      })
    );
    this.metrics = deepFreeze(JSON.parse(JSON.stringify(metrics)));
    this.length = this.events.length;
    this.finalArray = this.events.length > 0
      ? this.events[this.events.length - 1].arraySnapshot
      : this.initialArray;

    Object.freeze(this);
  }

  /**
   * Returns event at specified 0-indexed position.
   *
   * @param {number} index
   * @returns {object}
   */
  getEvent(index) {
    assertValidIntegerIndex(index, 0, this.events.length - 1, 'Event index');
    return this.events[index];
  }

  /**
   * Returns an immutable state snapshot at the given event index.
   * Index -1 corresponds to initial pre-execution state.
   *
   * @param {number} eventIndex - Integer from -1 to events.length - 1
   * @returns {object}
   */
  getSnapshotAt(eventIndex) {
    assertValidIntegerIndex(eventIndex, -1, this.events.length - 1, 'Snapshot index');

    if (eventIndex === -1) {
      return deepFreeze({
        eventIndex: -1,
        array: this.initialArray,
        activeIndices: [],
        lockedIndices: [],
        metrics: {
          comparisons: 0,
          swaps: 0,
          passes: 0
        }
      });
    }

    const event = this.events[eventIndex];
    return deepFreeze({
      eventIndex,
      array: event.arraySnapshot,
      activeIndices: event.activeIndices,
      lockedIndices: event.lockedIndices,
      metrics: { ...event.metrics }
    });
  }

  /**
   * Reconstructs array state from initial state up to targetIndex by sequentially applying
   * swap deltas, providing independent verification of array snapshots.
   *
   * @param {number} targetIndex - Event index up to which to reconstruct (-1 to events.length - 1)
   * @returns {readonly number[]}
   */
  reconstructState(targetIndex) {
    assertValidIntegerIndex(targetIndex, -1, this.events.length - 1, 'Target reconstruction index');

    if (targetIndex === -1) {
      return this.initialArray;
    }

    const working = [...this.initialArray];

    for (let i = 0; i <= targetIndex; i++) {
      const ev = this.events[i];
      if (ev.type === EventType.SWAP) {
        const [idxA, idxB] = ev.payload.indices;
        const temp = working[idxA];
        working[idxA] = working[idxB];
        working[idxB] = temp;
      }
    }

    return Object.freeze(working);
  }

  /**
   * Performs defensive integrity checks on the complete event sequence.
   * Reconstructs states independently to verify snapshot correctness.
   * Enforces semantic correctness of all event payloads, strict integer validation,
   * non-decreasing metrics, swap relationships, and permutation preservation.
   *
   * @throws {EngineError} If any integrity check fails
   * @returns {boolean} True if trace is 100% valid
   */
  validate() {
    if (!Array.isArray(this.events) || this.events.length === 0) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        'Trace validation failed: Event sequence is empty or invalid.'
      );
    }

    if (this.events.length < 2) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: Event sequence must contain at least ALGORITHM_START and ALGORITHM_COMPLETE. Received: ${this.events.length} events.`
      );
    }

    const validEventTypes = new Set(Object.values(EventType));
    const expectedLen = this.initialArray.length;

    // 1. Initial lifecycle event check
    const first = this.events[0];
    if (first.type !== EventType.ALGORITHM_START) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: First event must be ALGORITHM_START, got ${first.type}.`,
        { firstEventType: first.type }
      );
    }
    if (!first.payload || typeof first.payload !== 'object') {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        'Trace validation failed: ALGORITHM_START missing payload object.',
        { payload: first.payload }
      );
    }
    if (!Array.isArray(first.payload.array) || first.payload.array.length !== expectedLen) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: ALGORITHM_START payload.array must match initialArray length. Expected ${expectedLen}, got ${first.payload.array?.length}.`,
        { expectedLength: expectedLen, actualLength: first.payload.array?.length }
      );
    }
    for (let k = 0; k < expectedLen; k++) {
      if (first.payload.array[k] !== this.initialArray[k]) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: ALGORITHM_START payload.array[${k}] (${first.payload.array[k]}) does not match initialArray[${k}] (${this.initialArray[k]}).`,
          { index: k, expected: this.initialArray[k], actual: first.payload.array[k] }
        );
      }
    }
    assertStrictNonNegativeInteger(first.payload.totalElements, 'ALGORITHM_START.payload.totalElements');
    if (first.payload.totalElements !== expectedLen) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: ALGORITHM_START payload.totalElements must equal initialArray length. Expected ${expectedLen}, got ${first.payload.totalElements}.`,
        { expected: expectedLen, actual: first.payload.totalElements }
      );
    }

    // 2. Final lifecycle event check
    const last = this.events[this.events.length - 1];
    if (last.type !== EventType.ALGORITHM_COMPLETE) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: Final event must be ALGORITHM_COMPLETE, got ${last.type}.`,
        { lastEventType: last.type }
      );
    }

    // Independent state reconstruction tracking
    const reconstructed = [...this.initialArray];
    let prevComparisons = 0;
    let prevSwaps = 0;
    let prevPasses = 0;
    const previouslyLocked = new Set();

    // State machine for algorithm event flow
    const isSelectionSort = this.algorithmName === 'selectionSort';
    let stage = expectedLen <= 1 ? 'EXPECT_COMPLETE' : 'EXPECT_PASS_START';
    let currentPass = 0;
    let expectedUnsortedBound = expectedLen > 0 ? expectedLen - 1 : 0;
    let expectedCompareIndex = 0;
    let swapsInCurrentPass = 0;
    let accumulatedComparisons = 0;
    let accumulatedSwaps = 0;
    let accumulatedPasses = 0;
    let selCurrentCandidate = 0;
    let accumulatedCandidateUpdates = 0;

    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];

      // Sequential IDs check
      if (ev.id !== i) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Event ID mismatch at index ${i}. Expected ${i}, got ${ev.id}.`,
          { index: i, eventId: ev.id }
        );
      }

      // Step counter check (1-based)
      if (ev.step !== i + 1) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Step mismatch at index ${i}. Expected ${i + 1}, got ${ev.step}.`,
          { index: i, step: ev.step }
        );
      }

      // Valid EventType check
      if (!validEventTypes.has(ev.type)) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Unknown event type '${ev.type}' at index ${i}.`,
          { index: i, eventType: ev.type }
        );
      }

      // Lifecycle uniqueness checks
      if (i > 0 && ev.type === EventType.ALGORITHM_START) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Duplicate ALGORITHM_START encountered at index ${i}.`,
          { index: i }
        );
      }
      if (i < this.events.length - 1 && ev.type === EventType.ALGORITHM_COMPLETE) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Premature ALGORITHM_COMPLETE encountered at index ${i}.`,
          { index: i }
        );
      }

      // Required description
      if (typeof ev.description !== 'string' || ev.description.trim().length === 0) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Event at index ${i} must have a non-empty description string.`,
          { index: i }
        );
      }

      // Snapshot size and element checks
      if (!Array.isArray(ev.arraySnapshot) || ev.arraySnapshot.length !== expectedLen) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Array snapshot length mismatch at event ${i}. Expected ${expectedLen}, got ${ev.arraySnapshot?.length}.`,
          { index: i, expectedLength: expectedLen }
        );
      }
      for (let k = 0; k < expectedLen; k++) {
        if (typeof ev.arraySnapshot[k] !== 'number' || !Number.isFinite(ev.arraySnapshot[k])) {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: Snapshot element at index ${k} in event ${i} is not a finite number.`,
            { eventIndex: i, arrayIndex: k, value: ev.arraySnapshot[k] }
          );
        }
      }

      // Active indices bounds check
      if (!Array.isArray(ev.activeIndices)) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: activeIndices at event ${i} must be an array.`,
          { index: i }
        );
      }
      for (const aIdx of ev.activeIndices) {
        if (typeof aIdx !== 'number' || !Number.isInteger(aIdx) || aIdx < 0 || (expectedLen > 0 && aIdx >= expectedLen)) {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: activeIndex ${aIdx} at event ${i} is out of bounds [0, ${expectedLen - 1}].`,
            { eventIndex: i, activeIndex: aIdx }
          );
        }
      }

      // Locked indices bounds, sorting, and monotonicity check
      if (!Array.isArray(ev.lockedIndices)) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: lockedIndices at event ${i} must be an array.`,
          { index: i }
        );
      }
      for (let l = 0; l < ev.lockedIndices.length; l++) {
        const lIdx = ev.lockedIndices[l];
        if (typeof lIdx !== 'number' || !Number.isInteger(lIdx) || lIdx < 0 || (expectedLen > 0 && lIdx >= expectedLen)) {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: lockedIndex ${lIdx} at event ${i} is out of bounds [0, ${expectedLen - 1}].`,
            { eventIndex: i, lockedIndex: lIdx }
          );
        }
        if (l > 0 && lIdx <= ev.lockedIndices[l - 1]) {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: lockedIndices at event ${i} must be strictly ascending.`,
            { eventIndex: i, lockedIndices: ev.lockedIndices }
          );
        }
      }
      // Monotonicity: once an index is locked, it must remain locked in subsequent events
      for (const locked of previouslyLocked) {
        if (!ev.lockedIndices.includes(locked)) {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: Previously locked index ${locked} was unlocked at event ${i}.`,
            { eventIndex: i, lockedIndex: locked }
          );
        }
      }
      for (const lIdx of ev.lockedIndices) {
        previouslyLocked.add(lIdx);
      }

      // Non-decreasing metrics check
      if (!ev.metrics || typeof ev.metrics !== 'object') {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Event at index ${i} is missing metrics object.`,
          { index: i }
        );
      }
      assertStrictNonNegativeInteger(ev.metrics.comparisons, `events[${i}].metrics.comparisons`);
      assertStrictNonNegativeInteger(ev.metrics.swaps, `events[${i}].metrics.swaps`);
      assertStrictNonNegativeInteger(ev.metrics.passes, `events[${i}].metrics.passes`);

      const { comparisons, swaps, passes } = ev.metrics;
      if (comparisons < prevComparisons || swaps < prevSwaps || passes < prevPasses) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Non-monotonic metrics detected at event ${i}. Comparisons: ${comparisons} (prev: ${prevComparisons}), Swaps: ${swaps} (prev: ${prevSwaps}), Passes: ${passes} (prev: ${prevPasses}).`,
          { index: i, currentMetrics: ev.metrics, prevMetrics: { comparisons: prevComparisons, swaps: prevSwaps, passes: prevPasses } }
        );
      }
      prevComparisons = comparisons;
      prevSwaps = swaps;
      prevPasses = passes;

      // Validate code mapping if present on event
      if (ev.codeMapping !== undefined) {
        validateCodeMapping(ev.codeMapping, {
          eventIndex: i,
          eventType: ev.type,
          algorithm: this.algorithmName
        });
      }

      // Event-payload and lifecycle progression verification
      if (i === 0) {
        // ALGORITHM_START already validated above
        if (comparisons !== 0 || swaps !== 0 || passes !== 0) {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: ALGORITHM_START metrics must be zero. Got: comparisons=${comparisons}, swaps=${swaps}, passes=${passes}.`,
            { index: i, metrics: ev.metrics }
          );
        }
      } else if (isSelectionSort) {
        if (!ev.payload || typeof ev.payload !== 'object') {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: Event ${i} (${ev.type}) missing payload object.`,
            { index: i, type: ev.type }
          );
        }

        switch (stage) {
          case 'EXPECT_PASS_START': {
            if (ev.type !== EventType.PASS_START) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected PASS_START event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.PASS_START, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START pass number mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.startIndex, `events[${i}].payload.startIndex`);
            if (ev.payload.startIndex !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START startIndex mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.startIndex}.`,
                { index: i, expectedStartIndex: currentPass, actualStartIndex: ev.payload.startIndex }
              );
            }
            accumulatedPasses = currentPass + 1;
            if (ev.metrics.passes !== accumulatedPasses) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START passes metric mismatch at index ${i}. Expected ${accumulatedPasses}, got ${ev.metrics.passes}.`,
                { index: i, expected: accumulatedPasses, actual: ev.metrics.passes }
              );
            }
            if (ev.metrics.comparisons !== accumulatedComparisons || ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START metrics mismatch at index ${i}.`,
                { index: i, expectedComparisons: accumulatedComparisons, expectedSwaps: accumulatedSwaps, actualMetrics: ev.metrics }
              );
            }
            stage = 'EXPECT_CANDIDATE_SELECT';
            break;
          }

          case 'EXPECT_CANDIDATE_SELECT': {
            if (ev.type !== EventType.CANDIDATE_SELECT) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected CANDIDATE_SELECT event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.CANDIDATE_SELECT, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: CANDIDATE_SELECT pass mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.minIndex, `events[${i}].payload.minIndex`);
            if (ev.payload.minIndex !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: CANDIDATE_SELECT minIndex mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.minIndex}.`,
                { index: i, expectedMinIndex: currentPass, actualMinIndex: ev.payload.minIndex }
              );
            }
            if (ev.payload.minValue !== reconstructed[currentPass]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: CANDIDATE_SELECT minValue mismatch at index ${i}. Expected ${reconstructed[currentPass]}, got ${ev.payload.minValue}.`,
                { index: i, expectedMinValue: reconstructed[currentPass], actualMinValue: ev.payload.minValue }
              );
            }
            selCurrentCandidate = currentPass;
            expectedCompareIndex = currentPass + 1;
            swapsInCurrentPass = 0;
            stage = 'EXPECT_COMPARE';
            break;
          }

          case 'EXPECT_COMPARE': {
            if (ev.type !== EventType.COMPARE) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected COMPARE event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.COMPARE, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE pass mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.candidateIndex, `events[${i}].payload.candidateIndex`);
            if (ev.payload.candidateIndex !== selCurrentCandidate) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE candidateIndex mismatch at index ${i}. Expected ${selCurrentCandidate}, got ${ev.payload.candidateIndex}.`,
                { index: i, expectedCandidate: selCurrentCandidate, actualCandidate: ev.payload.candidateIndex }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.compareIndex, `events[${i}].payload.compareIndex`);
            if (ev.payload.compareIndex !== expectedCompareIndex) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE compareIndex mismatch at index ${i}. Expected ${expectedCompareIndex}, got ${ev.payload.compareIndex}.`,
                { index: i, expectedCompareIndex, actualCompareIndex: ev.payload.compareIndex }
              );
            }
            if (ev.payload.candidateValue !== reconstructed[selCurrentCandidate]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE candidateValue mismatch at index ${i}. Expected ${reconstructed[selCurrentCandidate]}, got ${ev.payload.candidateValue}.`,
                { index: i, expectedCandidateValue: reconstructed[selCurrentCandidate], actualCandidateValue: ev.payload.candidateValue }
              );
            }
            if (ev.payload.compareValue !== reconstructed[expectedCompareIndex]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE compareValue mismatch at index ${i}. Expected ${reconstructed[expectedCompareIndex]}, got ${ev.payload.compareValue}.`,
                { index: i, expectedCompareValue: reconstructed[expectedCompareIndex], actualCompareValue: ev.payload.compareValue }
              );
            }
            if (typeof ev.payload.isSmaller !== 'boolean') {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE isSmaller must be a boolean at index ${i}.`,
                { index: i, isSmaller: ev.payload.isSmaller }
              );
            }
            const expectedIsSmaller = reconstructed[expectedCompareIndex] < reconstructed[selCurrentCandidate];
            if (ev.payload.isSmaller !== expectedIsSmaller) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE isSmaller mismatch at index ${i}. Expected ${expectedIsSmaller}, got ${ev.payload.isSmaller}.`,
                { index: i, expectedIsSmaller, actualIsSmaller: ev.payload.isSmaller }
              );
            }

            accumulatedComparisons++;
            if (ev.metrics.comparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE comparisons metric mismatch at index ${i}. Expected ${accumulatedComparisons}, got ${ev.metrics.comparisons}.`,
                { index: i, expected: accumulatedComparisons, actual: ev.metrics.comparisons }
              );
            }
            if (ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE swaps metric mismatch at index ${i}. Expected ${accumulatedSwaps}, got ${ev.metrics.swaps}.`,
                { index: i, expected: accumulatedSwaps, actual: ev.metrics.swaps }
              );
            }

            if (expectedIsSmaller) {
              stage = 'EXPECT_CANDIDATE_UPDATE';
            } else {
              expectedCompareIndex++;
              if (expectedCompareIndex < expectedLen) {
                stage = 'EXPECT_COMPARE';
              } else {
                stage = (selCurrentCandidate !== currentPass) ? 'EXPECT_SWAP' : 'EXPECT_NO_SWAP';
              }
            }
            break;
          }

          case 'EXPECT_CANDIDATE_UPDATE': {
            if (ev.type !== EventType.CANDIDATE_UPDATE) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected CANDIDATE_UPDATE event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.CANDIDATE_UPDATE, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: CANDIDATE_UPDATE pass mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.previousMinIndex, `events[${i}].payload.previousMinIndex`);
            if (ev.payload.previousMinIndex !== selCurrentCandidate) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: CANDIDATE_UPDATE previousMinIndex mismatch at index ${i}. Expected ${selCurrentCandidate}, got ${ev.payload.previousMinIndex}.`,
                { index: i, expectedPreviousMinIndex: selCurrentCandidate, actualPreviousMinIndex: ev.payload.previousMinIndex }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.newMinIndex, `events[${i}].payload.newMinIndex`);
            if (ev.payload.newMinIndex !== expectedCompareIndex) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: CANDIDATE_UPDATE newMinIndex mismatch at index ${i}. Expected ${expectedCompareIndex}, got ${ev.payload.newMinIndex}.`,
                { index: i, expectedNewMinIndex: expectedCompareIndex, actualNewMinIndex: ev.payload.newMinIndex }
              );
            }
            if (ev.payload.newMinValue !== reconstructed[expectedCompareIndex]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: CANDIDATE_UPDATE newMinValue mismatch at index ${i}. Expected ${reconstructed[expectedCompareIndex]}, got ${ev.payload.newMinValue}.`,
                { index: i, expectedNewMinValue: reconstructed[expectedCompareIndex], actualNewMinValue: ev.payload.newMinValue }
              );
            }

            accumulatedCandidateUpdates++;
            selCurrentCandidate = expectedCompareIndex;
            expectedCompareIndex++;
            if (expectedCompareIndex < expectedLen) {
              stage = 'EXPECT_COMPARE';
            } else {
              stage = (selCurrentCandidate !== currentPass) ? 'EXPECT_SWAP' : 'EXPECT_NO_SWAP';
            }
            break;
          }

          case 'EXPECT_SWAP': {
            if (ev.type !== EventType.SWAP) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected SWAP event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.SWAP, actual: ev.type }
              );
            }
            const { indices, valuesBefore, valuesAfter } = ev.payload;
            if (!Array.isArray(indices) || indices.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} missing valid indices array of length 2.`,
                { index: i, indices }
              );
            }
            assertStrictNonNegativeInteger(indices[0], `events[${i}].payload.indices[0]`);
            assertStrictNonNegativeInteger(indices[1], `events[${i}].payload.indices[1]`);

            if (indices[0] !== currentPass || indices[1] !== selCurrentCandidate) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP indices mismatch at index ${i}. Expected [${currentPass}, ${selCurrentCandidate}], got [${indices[0]}, ${indices[1]}].`,
                { index: i, expected: [currentPass, selCurrentCandidate], actual: indices }
              );
            }

            if (!Array.isArray(valuesBefore) || valuesBefore.length !== 2 || !Array.isArray(valuesAfter) || valuesAfter.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} missing valid valuesBefore or valuesAfter payload arrays.`,
                { index: i, valuesBefore, valuesAfter }
              );
            }
            if (
              typeof valuesBefore[0] !== 'number' || !Number.isFinite(valuesBefore[0]) ||
              typeof valuesBefore[1] !== 'number' || !Number.isFinite(valuesBefore[1]) ||
              typeof valuesAfter[0] !== 'number' || !Number.isFinite(valuesAfter[0]) ||
              typeof valuesAfter[1] !== 'number' || !Number.isFinite(valuesAfter[1])
            ) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} values must be finite numbers.`,
                { index: i, valuesBefore, valuesAfter }
              );
            }

            const [idxA, idxB] = indices;
            if (reconstructed[idxA] !== valuesBefore[0] || reconstructed[idxB] !== valuesBefore[1]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP valuesBefore mismatch at index ${i}. Expected [${reconstructed[idxA]}, ${reconstructed[idxB]}], got [${valuesBefore[0]}, ${valuesBefore[1]}].`,
                { index: i, expected: [reconstructed[idxA], reconstructed[idxB]], actual: valuesBefore }
              );
            }
            if (valuesAfter[0] !== valuesBefore[1] || valuesAfter[1] !== valuesBefore[0]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP valuesAfter must invert valuesBefore at index ${i}.`,
                { index: i, valuesBefore, valuesAfter }
              );
            }

            // Apply swap to reconstructed array
            const temp = reconstructed[idxA];
            reconstructed[idxA] = reconstructed[idxB];
            reconstructed[idxB] = temp;

            accumulatedSwaps++;
            swapsInCurrentPass = 1;

            if (ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP swaps metric mismatch at index ${i}. Expected ${accumulatedSwaps}, got ${ev.metrics.swaps}.`,
                { index: i, expected: accumulatedSwaps, actual: ev.metrics.swaps }
              );
            }
            if (ev.metrics.comparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP comparisons metric mismatch at index ${i}. Expected ${accumulatedComparisons}, got ${ev.metrics.comparisons}.`,
                { index: i, expected: accumulatedComparisons, actual: ev.metrics.comparisons }
              );
            }

            stage = 'EXPECT_PASS_COMPLETE';
            break;
          }

          case 'EXPECT_NO_SWAP': {
            if (ev.type !== EventType.NO_SWAP) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected NO_SWAP event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.NO_SWAP, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP pass mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.index, `events[${i}].payload.index`);
            if (ev.payload.index !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP index mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.index}.`,
                { index: i, expectedIndex: currentPass, actualIndex: ev.payload.index }
              );
            }
            if (ev.payload.value !== reconstructed[currentPass]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP value mismatch at index ${i}. Expected ${reconstructed[currentPass]}, got ${ev.payload.value}.`,
                { index: i, expectedValue: reconstructed[currentPass], actualValue: ev.payload.value }
              );
            }

            swapsInCurrentPass = 0;
            if (ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP swaps metric mismatch at index ${i}. Expected ${accumulatedSwaps}, got ${ev.metrics.swaps}.`,
                { index: i, expected: accumulatedSwaps, actual: ev.metrics.swaps }
              );
            }
            if (ev.metrics.comparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP comparisons metric mismatch at index ${i}. Expected ${accumulatedComparisons}, got ${ev.metrics.comparisons}.`,
                { index: i, expected: accumulatedComparisons, actual: ev.metrics.comparisons }
              );
            }

            stage = 'EXPECT_PASS_COMPLETE';
            break;
          }

          case 'EXPECT_PASS_COMPLETE': {
            if (ev.type !== EventType.PASS_COMPLETE) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected PASS_COMPLETE event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.PASS_COMPLETE, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_COMPLETE pass mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictInteger(ev.payload.lockedIndex, `events[${i}].payload.lockedIndex`);
            if (ev.payload.lockedIndex !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_COMPLETE lockedIndex mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.lockedIndex}.`,
                { index: i, expectedLockedIndex: currentPass, actualLockedIndex: ev.payload.lockedIndex }
              );
            }
            if (!ev.lockedIndices.includes(currentPass)) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_COMPLETE lockedIndices must include newly locked index ${currentPass} at index ${i}.`,
                { index: i, lockedIndex: currentPass, lockedIndices: ev.lockedIndices }
              );
            }

            if (currentPass === expectedLen - 2) {
              stage = 'EXPECT_COMPLETE';
            } else {
              currentPass++;
              stage = 'EXPECT_PASS_START';
            }
            break;
          }

          case 'EXPECT_COMPLETE': {
            if (ev.type !== EventType.ALGORITHM_COMPLETE) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected ALGORITHM_COMPLETE event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.ALGORITHM_COMPLETE, actual: ev.type }
              );
            }
            if (!Array.isArray(ev.payload.sortedArray) || ev.payload.sortedArray.length !== expectedLen) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.sortedArray length mismatch at index ${i}. Expected ${expectedLen}, got ${ev.payload.sortedArray?.length}.`,
                { index: i, expectedLength: expectedLen, actualLength: ev.payload.sortedArray?.length }
              );
            }
            for (let k = 0; k < expectedLen; k++) {
              if (ev.payload.sortedArray[k] !== reconstructed[k]) {
                throw new EngineError(
                  ErrorCode.TRACE_INTEGRITY_VIOLATION,
                  `Trace validation failed: ALGORITHM_COMPLETE payload.sortedArray[${k}] (${ev.payload.sortedArray[k]}) does not match reconstructed state (${reconstructed[k]}).`,
                  { index: i, arrayIndex: k, expected: reconstructed[k], actual: ev.payload.sortedArray[k] }
                );
              }
            }
            assertStrictNonNegativeInteger(ev.payload.totalComparisons, `events[${i}].payload.totalComparisons`);
            if (ev.payload.totalComparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.totalComparisons mismatch. Expected ${accumulatedComparisons}, got ${ev.payload.totalComparisons}.`,
                { expected: accumulatedComparisons, actual: ev.payload.totalComparisons }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.totalSwaps, `events[${i}].payload.totalSwaps`);
            if (ev.payload.totalSwaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.totalSwaps mismatch. Expected ${accumulatedSwaps}, got ${ev.payload.totalSwaps}.`,
                { expected: accumulatedSwaps, actual: ev.payload.totalSwaps }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.totalPasses, `events[${i}].payload.totalPasses`);
            if (ev.payload.totalPasses !== accumulatedPasses) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.totalPasses mismatch. Expected ${accumulatedPasses}, got ${ev.payload.totalPasses}.`,
                { expected: accumulatedPasses, actual: ev.payload.totalPasses }
              );
            }

            if (i !== this.events.length - 1) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE must be the final event at index ${this.events.length - 1}, but encountered at index ${i}.`,
                { index: i, totalEvents: this.events.length }
              );
            }
            stage = 'FINISHED';
            break;
          }

          case 'FINISHED': {
            throw new EngineError(
              ErrorCode.TRACE_INTEGRITY_VIOLATION,
              `Trace validation failed: Extraneous event encountered after ALGORITHM_COMPLETE at index ${i}.`,
              { index: i, type: ev.type }
            );
          }

          default:
            throw new EngineError(
              ErrorCode.TRACE_INTEGRITY_VIOLATION,
              `Trace validation failed: Unhandled validation stage '${stage}' at index ${i}.`
            );
        }
      } else {
        if (!ev.payload || typeof ev.payload !== 'object') {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: Event ${i} (${ev.type}) missing payload object.`,
            { index: i, type: ev.type }
          );
        }

        switch (stage) {
          case 'EXPECT_PASS_START': {
            if (ev.type !== EventType.PASS_START) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected PASS_START event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.PASS_START, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START pass number mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictInteger(ev.payload.unsortedBound, `events[${i}].payload.unsortedBound`);
            expectedUnsortedBound = expectedLen - 1 - currentPass;
            if (ev.payload.unsortedBound !== expectedUnsortedBound) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START unsortedBound mismatch at index ${i}. Expected ${expectedUnsortedBound}, got ${ev.payload.unsortedBound}.`,
                { index: i, expectedUnsortedBound, actualUnsortedBound: ev.payload.unsortedBound }
              );
            }
            accumulatedPasses = currentPass + 1;
            if (ev.metrics.passes !== accumulatedPasses) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START passes metric mismatch at index ${i}. Expected ${accumulatedPasses}, got ${ev.metrics.passes}.`,
                { index: i, expected: accumulatedPasses, actual: ev.metrics.passes }
              );
            }
            if (ev.metrics.comparisons !== accumulatedComparisons || ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_START metrics mismatch at index ${i}.`,
                { index: i, expectedComparisons: accumulatedComparisons, expectedSwaps: accumulatedSwaps, actualMetrics: ev.metrics }
              );
            }

            swapsInCurrentPass = 0;
            expectedCompareIndex = 0;
            stage = 'EXPECT_COMPARE';
            break;
          }

          case 'EXPECT_COMPARE': {
            if (ev.type !== EventType.COMPARE) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected COMPARE event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.COMPARE, actual: ev.type }
              );
            }
            const { indices, values, shouldSwap } = ev.payload;
            if (!Array.isArray(indices) || indices.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} missing valid indices array of length 2.`,
                { index: i, indices }
              );
            }
            assertStrictNonNegativeInteger(indices[0], `events[${i}].payload.indices[0]`);
            assertStrictNonNegativeInteger(indices[1], `events[${i}].payload.indices[1]`);

            if (indices[0] !== expectedCompareIndex || indices[1] !== expectedCompareIndex + 1) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} must have adjacent indices [${expectedCompareIndex}, ${expectedCompareIndex + 1}]. Got [${indices[0]}, ${indices[1]}].`,
                { index: i, expected: [expectedCompareIndex, expectedCompareIndex + 1], actual: indices }
              );
            }
            if (indices[1] > expectedUnsortedBound) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} indices [${indices[0]}, ${indices[1]}] exceed unsorted bound ${expectedUnsortedBound}.`,
                { index: i, indices, unsortedBound: expectedUnsortedBound }
              );
            }

            if (!Array.isArray(values) || values.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} missing valid values array of length 2.`,
                { index: i, values }
              );
            }
            if (
              typeof values[0] !== 'number' || !Number.isFinite(values[0]) ||
              typeof values[1] !== 'number' || !Number.isFinite(values[1])
            ) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} values must be finite numbers.`,
                { index: i, values }
              );
            }
            if (values[0] !== reconstructed[indices[0]] || values[1] !== reconstructed[indices[1]]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} values [${values[0]}, ${values[1]}] do not match current state [${reconstructed[indices[0]]}, ${reconstructed[indices[1]]}].`,
                { index: i, values, expected: [reconstructed[indices[0]], reconstructed[indices[1]]] }
              );
            }

            if (typeof shouldSwap !== 'boolean') {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} shouldSwap must be a boolean. Received: ${typeof shouldSwap}.`,
                { index: i, shouldSwap }
              );
            }
            const expectedShouldSwap = values[0] > values[1];
            if (shouldSwap !== expectedShouldSwap) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE event at index ${i} shouldSwap is ${shouldSwap}, expected ${expectedShouldSwap} for values [${values[0]}, ${values[1]}].`,
                { index: i, shouldSwap, expectedShouldSwap }
              );
            }

            accumulatedComparisons++;
            if (ev.metrics.comparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE comparisons metric mismatch at index ${i}. Expected ${accumulatedComparisons}, got ${ev.metrics.comparisons}.`,
                { index: i, expected: accumulatedComparisons, actual: ev.metrics.comparisons }
              );
            }
            if (ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: COMPARE swaps metric mismatch at index ${i}. Expected ${accumulatedSwaps}, got ${ev.metrics.swaps}.`,
                { index: i, expected: accumulatedSwaps, actual: ev.metrics.swaps }
              );
            }

            stage = shouldSwap ? 'EXPECT_SWAP' : 'EXPECT_NO_SWAP';
            break;
          }

          case 'EXPECT_SWAP': {
            if (ev.type !== EventType.SWAP) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP must immediately follow a COMPARE that requires a swap. Got ${ev.type} at index ${i}.`,
                { index: i, expected: EventType.SWAP, actual: ev.type }
              );
            }
            const { indices, valuesBefore, valuesAfter } = ev.payload;
            if (!Array.isArray(indices) || indices.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} missing valid indices array of length 2.`,
                { index: i, indices }
              );
            }
            assertStrictNonNegativeInteger(indices[0], `events[${i}].payload.indices[0]`);
            assertStrictNonNegativeInteger(indices[1], `events[${i}].payload.indices[1]`);

            if (indices[0] !== expectedCompareIndex || indices[1] !== expectedCompareIndex + 1) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} indices [${indices[0]}, ${indices[1]}] do not match preceding COMPARE indices [${expectedCompareIndex}, ${expectedCompareIndex + 1}].`,
                { index: i, expected: [expectedCompareIndex, expectedCompareIndex + 1], actual: indices }
              );
            }

            if (!Array.isArray(valuesBefore) || valuesBefore.length !== 2 || !Array.isArray(valuesAfter) || valuesAfter.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} missing valid valuesBefore or valuesAfter payload arrays.`,
                { index: i, valuesBefore, valuesAfter }
              );
            }
            if (
              typeof valuesBefore[0] !== 'number' || !Number.isFinite(valuesBefore[0]) ||
              typeof valuesBefore[1] !== 'number' || !Number.isFinite(valuesBefore[1]) ||
              typeof valuesAfter[0] !== 'number' || !Number.isFinite(valuesAfter[0]) ||
              typeof valuesAfter[1] !== 'number' || !Number.isFinite(valuesAfter[1])
            ) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} valuesBefore and valuesAfter must contain finite numbers.`,
                { index: i, valuesBefore, valuesAfter }
              );
            }

            const [idxA, idxB] = indices;
            if (reconstructed[idxA] !== valuesBefore[0] || reconstructed[idxB] !== valuesBefore[1]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} valuesBefore do not match current array state before swap.`,
                { index: i, valuesBefore, currentValues: [reconstructed[idxA], reconstructed[idxB]] }
              );
            }
            if (valuesAfter[0] !== valuesBefore[1] || valuesAfter[1] !== valuesBefore[0]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP event at index ${i} valuesAfter do not reflect inverted valuesBefore.`,
                { index: i, valuesBefore, valuesAfter }
              );
            }

            // Apply swap to independent state reconstruction
            const temp = reconstructed[idxA];
            reconstructed[idxA] = reconstructed[idxB];
            reconstructed[idxB] = temp;

            accumulatedSwaps++;
            swapsInCurrentPass++;

            if (ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP swaps metric mismatch at index ${i}. Expected ${accumulatedSwaps}, got ${ev.metrics.swaps}.`,
                { index: i, expected: accumulatedSwaps, actual: ev.metrics.swaps }
              );
            }
            if (ev.metrics.comparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: SWAP comparisons metric mismatch at index ${i}. Expected ${accumulatedComparisons}, got ${ev.metrics.comparisons}.`,
                { index: i, expected: accumulatedComparisons, actual: ev.metrics.comparisons }
              );
            }

            expectedCompareIndex++;
            stage = expectedCompareIndex === expectedUnsortedBound ? 'EXPECT_PASS_COMPLETE' : 'EXPECT_COMPARE';
            break;
          }

          case 'EXPECT_NO_SWAP': {
            if (ev.type !== EventType.NO_SWAP) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP must immediately follow a COMPARE that requires no swap. Got ${ev.type} at index ${i}.`,
                { index: i, expected: EventType.NO_SWAP, actual: ev.type }
              );
            }
            const { indices, values } = ev.payload;
            if (!Array.isArray(indices) || indices.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP event at index ${i} missing valid indices array of length 2.`,
                { index: i, indices }
              );
            }
            assertStrictNonNegativeInteger(indices[0], `events[${i}].payload.indices[0]`);
            assertStrictNonNegativeInteger(indices[1], `events[${i}].payload.indices[1]`);

            if (indices[0] !== expectedCompareIndex || indices[1] !== expectedCompareIndex + 1) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP event at index ${i} indices [${indices[0]}, ${indices[1]}] do not match preceding COMPARE indices [${expectedCompareIndex}, ${expectedCompareIndex + 1}].`,
                { index: i, expected: [expectedCompareIndex, expectedCompareIndex + 1], actual: indices }
              );
            }

            if (!Array.isArray(values) || values.length !== 2) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP event at index ${i} missing valid values array of length 2.`,
                { index: i, values }
              );
            }
            const [idxA, idxB] = indices;
            if (values[0] !== reconstructed[idxA] || values[1] !== reconstructed[idxB]) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP event at index ${i} values [${values[0]}, ${values[1]}] do not match reconstructed array state [${reconstructed[idxA]}, ${reconstructed[idxB]}].`,
                { index: i, values, expected: [reconstructed[idxA], reconstructed[idxB]] }
              );
            }

            if (ev.metrics.swaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP swaps metric mismatch at index ${i}. Expected ${accumulatedSwaps}, got ${ev.metrics.swaps}.`,
                { index: i, expected: accumulatedSwaps, actual: ev.metrics.swaps }
              );
            }
            if (ev.metrics.comparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: NO_SWAP comparisons metric mismatch at index ${i}. Expected ${accumulatedComparisons}, got ${ev.metrics.comparisons}.`,
                { index: i, expected: accumulatedComparisons, actual: ev.metrics.comparisons }
              );
            }

            expectedCompareIndex++;
            stage = expectedCompareIndex === expectedUnsortedBound ? 'EXPECT_PASS_COMPLETE' : 'EXPECT_COMPARE';
            break;
          }

          case 'EXPECT_PASS_COMPLETE': {
            if (ev.type !== EventType.PASS_COMPLETE) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected PASS_COMPLETE event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.PASS_COMPLETE, actual: ev.type }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.pass, `events[${i}].payload.pass`);
            if (ev.payload.pass !== currentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_COMPLETE pass mismatch at index ${i}. Expected ${currentPass}, got ${ev.payload.pass}.`,
                { index: i, expectedPass: currentPass, actualPass: ev.payload.pass }
              );
            }
            assertStrictInteger(ev.payload.lockedIndex, `events[${i}].payload.lockedIndex`);
            if (ev.payload.lockedIndex !== expectedUnsortedBound) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_COMPLETE lockedIndex mismatch at index ${i}. Expected ${expectedUnsortedBound}, got ${ev.payload.lockedIndex}.`,
                { index: i, expectedLockedIndex: expectedUnsortedBound, actualLockedIndex: ev.payload.lockedIndex }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.swapsInPass, `events[${i}].payload.swapsInPass`);
            if (ev.payload.swapsInPass !== swapsInCurrentPass) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_COMPLETE swapsInPass mismatch at index ${i}. Expected ${swapsInCurrentPass}, got ${ev.payload.swapsInPass}.`,
                { index: i, expectedSwaps: swapsInCurrentPass, actualSwaps: ev.payload.swapsInPass }
              );
            }
            if (!ev.lockedIndices.includes(expectedUnsortedBound)) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: PASS_COMPLETE lockedIndices must include newly locked index ${expectedUnsortedBound} at index ${i}.`,
                { index: i, lockedIndex: expectedUnsortedBound, lockedIndices: ev.lockedIndices }
              );
            }

            if (swapsInCurrentPass === 0 || currentPass === expectedLen - 2) {
              stage = 'EXPECT_COMPLETE';
            } else {
              currentPass++;
              stage = 'EXPECT_PASS_START';
            }
            break;
          }

          case 'EXPECT_COMPLETE': {
            if (ev.type !== EventType.ALGORITHM_COMPLETE) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: Expected ALGORITHM_COMPLETE event at index ${i}, got ${ev.type}.`,
                { index: i, expected: EventType.ALGORITHM_COMPLETE, actual: ev.type }
              );
            }
            if (!Array.isArray(ev.payload.sortedArray) || ev.payload.sortedArray.length !== expectedLen) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.sortedArray length mismatch at index ${i}. Expected ${expectedLen}, got ${ev.payload.sortedArray?.length}.`,
                { index: i, expectedLength: expectedLen, actualLength: ev.payload.sortedArray?.length }
              );
            }
            for (let k = 0; k < expectedLen; k++) {
              if (ev.payload.sortedArray[k] !== reconstructed[k]) {
                throw new EngineError(
                  ErrorCode.TRACE_INTEGRITY_VIOLATION,
                  `Trace validation failed: ALGORITHM_COMPLETE payload.sortedArray[${k}] (${ev.payload.sortedArray[k]}) does not match reconstructed state (${reconstructed[k]}).`,
                  { index: i, arrayIndex: k, expected: reconstructed[k], actual: ev.payload.sortedArray[k] }
                );
              }
            }
            assertStrictNonNegativeInteger(ev.payload.totalComparisons, `events[${i}].payload.totalComparisons`);
            if (ev.payload.totalComparisons !== accumulatedComparisons) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.totalComparisons mismatch. Expected ${accumulatedComparisons}, got ${ev.payload.totalComparisons}.`,
                { expected: accumulatedComparisons, actual: ev.payload.totalComparisons }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.totalSwaps, `events[${i}].payload.totalSwaps`);
            if (ev.payload.totalSwaps !== accumulatedSwaps) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.totalSwaps mismatch. Expected ${accumulatedSwaps}, got ${ev.payload.totalSwaps}.`,
                { expected: accumulatedSwaps, actual: ev.payload.totalSwaps }
              );
            }
            assertStrictNonNegativeInteger(ev.payload.totalPasses, `events[${i}].payload.totalPasses`);
            if (ev.payload.totalPasses !== accumulatedPasses) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE payload.totalPasses mismatch. Expected ${accumulatedPasses}, got ${ev.payload.totalPasses}.`,
                { expected: accumulatedPasses, actual: ev.payload.totalPasses }
              );
            }

            if (i !== this.events.length - 1) {
              throw new EngineError(
                ErrorCode.TRACE_INTEGRITY_VIOLATION,
                `Trace validation failed: ALGORITHM_COMPLETE must be the final event at index ${this.events.length - 1}, but encountered at index ${i}.`,
                { index: i, totalEvents: this.events.length }
              );
            }
            stage = 'FINISHED';
            break;
          }

          case 'FINISHED': {
            throw new EngineError(
              ErrorCode.TRACE_INTEGRITY_VIOLATION,
              `Trace validation failed: Extraneous event encountered after ALGORITHM_COMPLETE at index ${i}.`,
              { index: i, type: ev.type }
            );
          }

          default:
            throw new EngineError(
              ErrorCode.TRACE_INTEGRITY_VIOLATION,
              `Trace validation failed: Unhandled validation stage '${stage}' at index ${i}.`
            );
        }
      }

      // Verify that every single snapshot matches independent reconstruction
      for (let k = 0; k < expectedLen; k++) {
        if (ev.arraySnapshot[k] !== reconstructed[k]) {
          throw new EngineError(
            ErrorCode.TRACE_INTEGRITY_VIOLATION,
            `Trace validation failed: Snapshot at event ${i} does not match independently reconstructed state at array index ${k}. Expected ${reconstructed[k]}, got ${ev.arraySnapshot[k]}.`,
            { eventIndex: i, arrayIndex: k, expected: reconstructed[k], actual: ev.arraySnapshot[k] }
          );
        }
      }
    }

    if (stage !== 'FINISHED') {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: Event sequence ended prematurely in stage '${stage}' without completing algorithm lifecycle.`,
        { stage, totalEvents: this.events.length }
      );
    }

    // 3. Final array sortedness check
    for (let k = 0; k < expectedLen - 1; k++) {
      if (reconstructed[k] > reconstructed[k + 1]) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Final array is not sorted. Element at index ${k} (${reconstructed[k]}) > index ${k + 1} (${reconstructed[k + 1]}).`,
          { finalArray: reconstructed }
        );
      }
    }

    // 4. Permutation preservation check
    const initialCounts = new Map();
    for (const val of this.initialArray) {
      initialCounts.set(val, (initialCounts.get(val) || 0) + 1);
    }
    const finalCounts = new Map();
    for (const val of reconstructed) {
      finalCounts.set(val, (finalCounts.get(val) || 0) + 1);
    }
    if (initialCounts.size !== finalCounts.size) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        'Trace validation failed: Final array multiset does not match initial array distinct element count.',
        { initialArray: this.initialArray, finalArray: reconstructed }
      );
    }
    for (const [val, count] of initialCounts) {
      if (finalCounts.get(val) !== count) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Permutation violation for element ${val}. Initial frequency: ${count}, Final frequency: ${finalCounts.get(val) || 0}.`,
          { value: val, initialCount: count, finalCount: finalCounts.get(val) || 0 }
        );
      }
    }

    // 5. Final trace-level metrics consistency check
    assertStrictNonNegativeInteger(this.metrics.totalComparisons, 'metrics.totalComparisons');
    if (this.metrics.totalComparisons !== accumulatedComparisons) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: Trace totalComparisons (${this.metrics.totalComparisons}) does not match accumulated comparisons (${accumulatedComparisons}).`,
        { totalComparisons: this.metrics.totalComparisons, accumulatedComparisons }
      );
    }
    assertStrictNonNegativeInteger(this.metrics.totalSwaps, 'metrics.totalSwaps');
    if (this.metrics.totalSwaps !== accumulatedSwaps) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: Trace totalSwaps (${this.metrics.totalSwaps}) does not match accumulated swaps (${accumulatedSwaps}).`,
        { totalSwaps: this.metrics.totalSwaps, accumulatedSwaps }
      );
    }
    assertStrictNonNegativeInteger(this.metrics.totalPasses, 'metrics.totalPasses');
    if (this.metrics.totalPasses !== accumulatedPasses) {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        `Trace validation failed: Trace totalPasses (${this.metrics.totalPasses}) does not match accumulated passes (${accumulatedPasses}).`,
        { totalPasses: this.metrics.totalPasses, accumulatedPasses }
      );
    }

    if (this.algorithmName === 'selectionSort' && this.metrics.totalCandidateUpdates !== undefined) {
      assertStrictNonNegativeInteger(this.metrics.totalCandidateUpdates, 'metrics.totalCandidateUpdates');
      if (this.metrics.totalCandidateUpdates !== accumulatedCandidateUpdates) {
        throw new EngineError(
          ErrorCode.TRACE_INTEGRITY_VIOLATION,
          `Trace validation failed: Trace totalCandidateUpdates (${this.metrics.totalCandidateUpdates}) does not match accumulated candidate updates (${accumulatedCandidateUpdates}).`,
          { totalCandidateUpdates: this.metrics.totalCandidateUpdates, accumulatedCandidateUpdates }
        );
      }
    }

    return true;
  }

  /**
   * Serializes trace summary.
   * @returns {object}
   */
  toJSON() {
    return {
      algorithmName: this.algorithmName,
      initialArray: [...this.initialArray],
      finalArray: [...this.finalArray],
      metrics: { ...this.metrics },
      eventCount: this.events.length
    };
  }
}

