import { EventType, ErrorCode } from '../core/types.js';
import { EngineError } from '../core/errors.js';
import { validateInputArray, validateAlgorithmOptions, validateCodeMapping } from '../core/validator.js';
import { ExecutionTrace } from '../core/trace.js';

/**
 * Executes a pure, deterministic Selection Sort simulation, generating a complete
 * educational execution trace with intermediate state snapshots and pseudocode mappings.
 *
 * @param {number[]} inputArray - Raw numerical input array
 * @param {object} [options]
 * @param {number} [options.maxArraySize=100] - Maximum array size
 * @param {number} [options.maxEvents=50000] - Maximum event count boundary
 * @returns {ExecutionTrace} Immutable execution trace
 * @throws {EngineError} On validation failure or resource limit breach
 */
export function selectionSort(inputArray, options = {}) {
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
  let candidateUpdates = 0;

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
        passes,
        candidateUpdates
      }
    };

    if (codeMapping) {
      event.codeMapping = validateCodeMapping(codeMapping, {
        eventIndex: eventId,
        eventType: type,
        algorithm: 'selectionSort'
      });
    }

    events.push(event);
  }

  // 1. Initial Start Event
  pushEvent(
    EventType.ALGORITHM_START,
    `Selection Sort simulation started with ${n} element${n === 1 ? '' : 's'}.`,
    {
      array: Object.freeze([...working]),
      totalElements: n
    },
    [],
    {
      line: 1,
      explanation: 'Initialize Selection Sort on input array',
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
        line: 11,
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
        totalCandidateUpdates: 0,
        durationMs: Date.now() - startTime
      },
      algorithmName: 'selectionSort'
    });
    trace.validate();
    return trace;
  }

  // 3. Iterative Selection Sort
  for (let i = 0; i < n - 1; i++) {
    passes++;

    // Begin pass i
    pushEvent(
      EventType.PASS_START,
      `Pass ${i + 1} initiated. Finding minimum element among remaining unsorted elements from index ${i} to ${n - 1}.`,
      {
        pass: i,
        startIndex: i,
        remainingElements: n - i
      },
      [i],
      {
        line: 2,
        explanation: `Begin outer pass ${i + 1}; scan unsorted elements from index ${i} to ${n - 1}`,
        variables: { pass: i, startIndex: i }
      }
    );

    let currentMinIndex = i;

    // Initial minimum candidate for this pass
    pushEvent(
      EventType.CANDIDATE_SELECT,
      `Pass ${i + 1}: Initialized minimum candidate at index ${i} (value: ${working[i]}).`,
      {
        pass: i,
        minIndex: i,
        minValue: working[i],
        candidateIndex: i,
        candidateValue: working[i]
      },
      [i],
      {
        line: 3,
        explanation: `Assume element at index ${i} is current minimum candidate`,
        variables: { pass: i, minIndex: i, minValue: working[i] }
      }
    );

    // Inner scan to find actual minimum
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      const candidateVal = working[currentMinIndex];
      const compareVal = working[j];
      const isSmaller = compareVal < candidateVal;

      pushEvent(
        EventType.COMPARE,
        `Comparing current minimum candidate at index ${currentMinIndex} (${candidateVal}) with element at index ${j} (${compareVal}). ${
          isSmaller
            ? `${compareVal} < ${candidateVal}, new minimum found.`
            : `${compareVal} >= ${candidateVal}, candidate unchanged.`
        }`,
        {
          pass: i,
          candidateIndex: currentMinIndex,
          candidateValue: candidateVal,
          compareIndex: j,
          compareValue: compareVal,
          isSmaller
        },
        [currentMinIndex, j],
        {
          line: 5,
          explanation: `Compare candidate at index ${currentMinIndex} (${candidateVal}) with element at index ${j} (${compareVal})`,
          variables: { pass: i, minIndex: currentMinIndex, j, isSmaller }
        }
      );

      if (isSmaller) {
        candidateUpdates++;
        const previousMinIndex = currentMinIndex;
        currentMinIndex = j;

        pushEvent(
          EventType.CANDIDATE_UPDATE,
          `Updated minimum candidate to index ${j} (value: ${compareVal}).`,
          {
            pass: i,
            previousMinIndex,
            previousMinValue: candidateVal,
            newMinIndex: j,
            newMinValue: compareVal,
            previousCandidateIndex: previousMinIndex,
            previousCandidateValue: candidateVal,
            candidateIndex: j,
            candidateValue: compareVal
          },
          [j],
          {
            line: 6,
            explanation: `Found smaller value at index ${j} (${compareVal}); update minimum candidate to index ${j}`,
            variables: { pass: i, previousMinIndex, newMinIndex: j, newMinValue: compareVal }
          }
        );
      }
    }

    // Place minimum candidate into position i via swap if needed
    if (currentMinIndex !== i) {
      swaps++;
      const valI = working[i];
      const valMin = working[currentMinIndex];

      working[i] = valMin;
      working[currentMinIndex] = valI;

      pushEvent(
        EventType.SWAP,
        `Swapped minimum element at index ${currentMinIndex} (${valMin}) with element at current position ${i} (${valI}).`,
        {
          pass: i,
          indices: [i, currentMinIndex],
          valuesBefore: [valI, valMin],
          valuesAfter: [valMin, valI]
        },
        [i, currentMinIndex],
        {
          line: 8,
          explanation: `Swap minimum candidate at index ${currentMinIndex} into position ${i}`,
          variables: { pass: i, swapIndices: [i, currentMinIndex] }
        }
      );
    } else {
      pushEvent(
        EventType.NO_SWAP,
        `Element at index ${i} (${working[i]}) is already the minimum for this pass. No swap needed.`,
        {
          pass: i,
          index: i,
          value: working[i]
        },
        [i],
        {
          line: 7,
          explanation: `Minimum element is already at position ${i}; no swap needed`,
          variables: { pass: i, index: i }
        }
      );
    }

    // Element at index i is now permanently in its sorted position
    lockedIndices.add(i);

    pushEvent(
      EventType.PASS_COMPLETE,
      `Pass ${i + 1} completed. Element at index ${i} (${working[i]}) is locked in place.`,
      {
        pass: i,
        lockedIndex: i,
        swapsInPass: currentMinIndex !== i ? 1 : 0
      },
      [i],
      {
        line: 9,
        explanation: `Pass ${i + 1} complete; element at index ${i} is locked in sorted position`,
        variables: { pass: i, lockedIndex: i, swapped: currentMinIndex !== i }
      }
    );
  }

  // The last remaining element (index n - 1) is inherently in its correct sorted position
  lockedIndices.add(n - 1);

  // 4. Algorithm Complete Event
  pushEvent(
    EventType.ALGORITHM_COMPLETE,
    `Selection Sort completed successfully in ${passes} pass${passes === 1 ? '' : 'es'}, with ${comparisons} comparisons and ${swaps} swaps.`,
    {
      sortedArray: Object.freeze([...working]),
      totalComparisons: comparisons,
      totalSwaps: swaps,
      totalPasses: passes
    },
    [],
    {
      line: 11,
      explanation: 'Selection Sort completed successfully; all elements sorted',
      variables: { totalPasses: passes, totalComparisons: comparisons, totalSwaps: swaps }
    }
  );

  const trace = new ExecutionTrace({
    initialArray: validatedInput,
    events,
    metrics: {
      totalComparisons: comparisons,
      totalSwaps: swaps,
      totalPasses: passes,
      totalCandidateUpdates: candidateUpdates,
      durationMs: Date.now() - startTime
    },
    algorithmName: 'selectionSort'
  });
  trace.validate();
  return trace;
}
