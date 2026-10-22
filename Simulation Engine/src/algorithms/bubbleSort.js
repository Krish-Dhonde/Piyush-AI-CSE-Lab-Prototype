import { EventType, ErrorCode } from '../core/types.js';
import { EngineError } from '../core/errors.js';
import { validateInputArray, validateAlgorithmOptions, validateCodeMapping } from '../core/validator.js';
import { ExecutionTrace } from '../core/trace.js';

/**
 * Executes a pure, deterministic Bubble Sort simulation, generating a complete
 * educational execution trace with intermediate state snapshots and pseudocode mappings.
 *
 * @param {number[]} inputArray - Raw numerical input array
 * @param {object} [options]
 * @param {number} [options.maxArraySize=100] - Maximum array size
 * @param {number} [options.maxEvents=50000] - Maximum event count boundary
 * @returns {ExecutionTrace} Immutable execution trace
 * @throws {EngineError} On validation failure or resource limit breach
 */
export function bubbleSort(inputArray, options = {}) {
  const startTime = Date.now();
  const { maxArraySize, maxEvents } = validateAlgorithmOptions(options);

  // Validate and produce frozen defensive copy
  const validatedInput = validateInputArray(inputArray, { maxArraySize });
  const n = validatedInput.length;

  const events = [];
  const working = [...validatedInput];
  const lockedIndices = new Set();

  let comparisons = 0;
  let swaps = 0;
  let passes = 0;

  function pushEvent(type, description, payload, activeIndices = [], codeMapping = null) {
    if (events.length >= maxEvents) {
      throw new EngineError(
        ErrorCode.EVENT_LIMIT_EXCEEDED,
        `Algorithm exceeded maximum permitted event limit of ${maxEvents} events. Execution halted to prevent resource exhaustion.`,
        { maxEvents, currentEventCount: events.length }
      );
    }

    const eventId = events.length;
    const event = {
      id: eventId,
      step: eventId + 1,
      type,
      description,
      payload: { ...payload },
      arraySnapshot: Object.freeze([...working]),
      activeIndices: Object.freeze([...activeIndices]),
      lockedIndices: Object.freeze(Array.from(lockedIndices).sort((a, b) => a - b)),
      metrics: {
        comparisons,
        swaps,
        passes
      }
    };

    if (codeMapping) {
      event.codeMapping = validateCodeMapping(codeMapping, {
        eventIndex: eventId,
        eventType: type,
        algorithm: 'bubbleSort'
      });
    }

    events.push(event);
  }

  // 1. Initial Start Event
  pushEvent(
    EventType.ALGORITHM_START,
    `Bubble Sort simulation started with ${n} element${n === 1 ? '' : 's'}.`,
    {
      array: Object.freeze([...working]),
      totalElements: n
    },
    [],
    {
      line: 1,
      explanation: 'Initialize Bubble Sort on input array',
      variables: { n }
    }
  );

  // 2. Base Cases: Empty or Single-Element Array
  if (n <= 1) {
    if (n === 1) {
      lockedIndices.add(0);
    }

    pushEvent(
      EventType.ALGORITHM_COMPLETE,
      n === 0
        ? 'Sorting completed: array is empty.'
        : 'Sorting completed: single element is inherently sorted.',
      {
        sortedArray: Object.freeze([...working]),
        totalComparisons: 0,
        totalSwaps: 0,
        totalPasses: 0
      },
      n === 1 ? [0] : [],
      {
        line: 8,
        explanation: 'Sorting completed immediately for base case array',
        variables: { totalElements: n }
      }
    );

    const trace = new ExecutionTrace({
      initialArray: validatedInput,
      events,
      metrics: {
        totalComparisons: 0,
        totalSwaps: 0,
        totalPasses: 0,
        durationMs: Date.now() - startTime
      },
      algorithmName: 'bubbleSort'
    });
    trace.validate();
    return trace;
  }

  // 3. Iterative Sorting with Early Exit Optimization
  for (let i = 0; i < n - 1; i++) {
    passes++;
    const unsortedBound = n - 1 - i;

    pushEvent(
      EventType.PASS_START,
      `Pass ${i + 1} initiated. Comparing adjacent elements from index 0 to ${unsortedBound}.`,
      {
        pass: i,
        unsortedBound
      },
      [],
      {
        line: 2,
        explanation: `Begin outer pass ${i + 1}; compare adjacent elements up to index ${unsortedBound}`,
        variables: { pass: i, unsortedBound }
      }
    );

    let swapsInPass = 0;

    for (let j = 0; j < unsortedBound; j++) {
      comparisons++;
      const valA = working[j];
      const valB = working[j + 1];
      const shouldSwap = valA > valB;

      // Emit comparison event
      pushEvent(
        EventType.COMPARE,
        `Comparing index ${j} (${valA}) and index ${j + 1} (${valB}). ${
          shouldSwap
            ? `${valA} > ${valB}, so a swap is required.`
            : `${valA} <= ${valB}, order is correct.`
        }`,
        {
          indices: [j, j + 1],
          values: [valA, valB],
          shouldSwap
        },
        [j, j + 1],
        {
          line: 4,
          explanation: `Compare adjacent elements at index ${j} and ${j + 1}`,
          variables: { i, j, shouldSwap }
        }
      );

      if (shouldSwap) {
        // Perform swap
        swaps++;
        swapsInPass++;

        working[j] = valB;
        working[j + 1] = valA;

        pushEvent(
          EventType.SWAP,
          `Swapped index ${j} (${valA}) with index ${j + 1} (${valB}).`,
          {
            indices: [j, j + 1],
            valuesBefore: [valA, valB],
            valuesAfter: [valB, valA]
          },
          [j, j + 1],
          {
            line: 5,
            explanation: `Swap adjacent elements at index ${j} and ${j + 1} because ${valA} > ${valB}`,
            variables: { i, j }
          }
        );
      } else {
        pushEvent(
          EventType.NO_SWAP,
          `No swap needed for index ${j} (${valA}) and index ${j + 1} (${valB}).`,
          {
            indices: [j, j + 1],
            values: [valA, valB]
          },
          [j, j + 1],
          {
            line: 4,
            explanation: `No swap needed for index ${j} and ${j + 1} because ${valA} <= ${valB}`,
            variables: { i, j }
          }
        );
      }
    }

    // At the end of pass i, the element at `unsortedBound` has bubbled to its final position
    lockedIndices.add(unsortedBound);

    pushEvent(
      EventType.PASS_COMPLETE,
      `Pass ${i + 1} completed. Element at index ${unsortedBound} (${working[unsortedBound]}) is locked in place. ${swapsInPass} swap${swapsInPass === 1 ? '' : 's'} performed in this pass.`,
      {
        pass: i,
        lockedIndex: unsortedBound,
        swapsInPass
      },
      [unsortedBound],
      {
        line: 6,
        explanation: `Pass ${i + 1} complete; element at index ${unsortedBound} locked in place`,
        variables: { pass: i, lockedIndex: unsortedBound, swapsInPass }
      }
    );

    // Early termination: if no swaps occurred, the entire array is sorted
    if (swapsInPass === 0) {
      // Lock all remaining unsorted positions
      for (let k = 0; k < unsortedBound; k++) {
        lockedIndices.add(k);
      }

      pushEvent(
        EventType.ALGORITHM_COMPLETE,
        `Sorting completed early in pass ${i + 1} because no swaps were required. Array is fully sorted.`,
        {
          sortedArray: Object.freeze([...working]),
          totalComparisons: comparisons,
          totalSwaps: swaps,
          totalPasses: passes,
          earlyExit: true
        },
        [],
        {
          line: 8,
          explanation: 'Sorting completed early because no swaps occurred in pass',
          variables: { earlyExit: true, totalPasses: passes }
        }
      );

      const trace = new ExecutionTrace({
        initialArray: validatedInput,
        events,
        metrics: {
          totalComparisons: comparisons,
          totalSwaps: swaps,
          totalPasses: passes,
          durationMs: Date.now() - startTime
        },
        algorithmName: 'bubbleSort'
      });
      trace.validate();
      return trace;
    }
  }

  // Final remaining first element (index 0) is guaranteed to be in its correct place
  lockedIndices.add(0);

  // 4. Algorithm Complete Event
  pushEvent(
    EventType.ALGORITHM_COMPLETE,
    `Bubble Sort completed successfully in ${passes} pass${passes === 1 ? '' : 'es'}, with ${comparisons} comparisons and ${swaps} swaps.`,
    {
      sortedArray: Object.freeze([...working]),
      totalComparisons: comparisons,
      totalSwaps: swaps,
      totalPasses: passes,
      earlyExit: false
    },
    [],
    {
      line: 8,
      explanation: 'Bubble Sort completed successfully; all elements sorted',
      variables: { earlyExit: false, totalPasses: passes, totalComparisons: comparisons, totalSwaps: swaps }
    }
  );

  const trace = new ExecutionTrace({
    initialArray: validatedInput,
    events,
    metrics: {
      totalComparisons: comparisons,
      totalSwaps: swaps,
      totalPasses: passes,
      durationMs: Date.now() - startTime
    },
    algorithmName: 'bubbleSort'
  });
  trace.validate();
  return trace;
}
