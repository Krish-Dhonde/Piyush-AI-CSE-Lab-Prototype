import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  bubbleSort,
  selectionSort,
  PlaybackController,
  PlaybackState,
  EventType,
  ErrorCode,
  EngineError,
  VirtualClock,
  HARD_LIMITS,
  BUBBLE_SORT_PSEUDOCODE,
  SELECTION_SORT_PSEUDOCODE
} from 'virtual-cse-lab-simulation-engine';

describe('Milestone 3 — End-to-End Integration Verification', () => {
  // Test 1: Bubble Sort sorts a typical unsorted array
  it('1. Bubble Sort sorts a typical unsorted array', () => {
    const input = [29, 10, 14, 37, 13];
    const trace = bubbleSort(input);
    trace.validate();

    assert.equal(trace.algorithmName, 'bubbleSort');
    assert.deepEqual(trace.initialArray, input);
    assert.deepEqual(trace.finalArray, [10, 13, 14, 29, 37]);
    assert.ok(trace.events.length > 0);

    const lastEvent = trace.events[trace.events.length - 1];
    assert.equal(lastEvent.type, EventType.ALGORITHM_COMPLETE);
    assert.deepEqual(lastEvent.payload.sortedArray, [10, 13, 14, 29, 37]);
  });

  // Test 2: Selection Sort sorts a typical unsorted array
  it('2. Selection Sort sorts a typical unsorted array', () => {
    const input = [29, 10, 14, 37, 13];
    const trace = selectionSort(input);
    trace.validate();

    assert.equal(trace.algorithmName, 'selectionSort');
    assert.deepEqual(trace.initialArray, input);
    assert.deepEqual(trace.finalArray, [10, 13, 14, 29, 37]);
    assert.ok(trace.events.length > 0);

    const lastEvent = trace.events[trace.events.length - 1];
    assert.equal(lastEvent.type, EventType.ALGORITHM_COMPLETE);
    assert.deepEqual(lastEvent.payload.sortedArray, [10, 13, 14, 29, 37]);
  });

  // Test 3: Empty input and single-element array behave according to contract
  it('3. Empty input and single-element array behave according to contract', () => {
    // Empty array
    const emptyBubble = bubbleSort([]);
    assert.equal(emptyBubble.length, 2); // ALGORITHM_START and ALGORITHM_COMPLETE
    assert.deepEqual(emptyBubble.finalArray, []);

    const emptySelection = selectionSort([]);
    assert.equal(emptySelection.length, 2);
    assert.deepEqual(emptySelection.finalArray, []);

    // Single-element array
    const singleBubble = bubbleSort([42]);
    assert.equal(singleBubble.length, 2);
    assert.deepEqual(singleBubble.finalArray, [42]);
    assert.deepEqual(singleBubble.events[1].lockedIndices, [0]);

    const singleSelection = selectionSort([42]);
    assert.equal(singleSelection.length, 2);
    assert.deepEqual(singleSelection.finalArray, [42]);
    assert.deepEqual(singleSelection.events[1].lockedIndices, [0]);
  });

  // Test 4: Negative numbers and duplicate values work
  it('4. Negative numbers and duplicate values work properly', () => {
    const negatives = [-4, 7, 0, -9, 2];
    const traceNegBubble = bubbleSort(negatives);
    assert.deepEqual(traceNegBubble.finalArray, [-9, -4, 0, 2, 7]);

    const traceNegSelection = selectionSort(negatives);
    assert.deepEqual(traceNegSelection.finalArray, [-9, -4, 0, 2, 7]);

    const duplicates = [8, 3, 8, 1, 3];
    const traceDupBubble = bubbleSort(duplicates);
    assert.deepEqual(traceDupBubble.finalArray, [1, 3, 3, 8, 8]);

    const traceDupSelection = selectionSort(duplicates);
    assert.deepEqual(traceDupSelection.finalArray, [1, 3, 3, 8, 8]);
  });

  // Test 5: Already-sorted and reverse-sorted arrays work
  it('5. Already-sorted and reverse-sorted arrays work properly', () => {
    const sorted = [5, 12, 18, 27, 33];
    assert.deepEqual(bubbleSort(sorted).finalArray, sorted);
    assert.deepEqual(selectionSort(sorted).finalArray, sorted);

    const reversed = [50, 40, 30, 20, 10];
    assert.deepEqual(bubbleSort(reversed).finalArray, [10, 20, 30, 40, 50]);
    assert.deepEqual(selectionSort(reversed).finalArray, [10, 20, 30, 40, 50]);
  });

  // Test 6: Invalid input is rejected with clear error codes
  it('6. Invalid input is rejected with clear error codes', () => {
    assert.throws(
      () => bubbleSort('not an array'),
      (err) => err instanceof EngineError && err.code === ErrorCode.INVALID_INPUT_TYPE
    );

    assert.throws(
      () => bubbleSort([1, NaN, 3]),
      (err) => err instanceof EngineError && err.code === ErrorCode.INVALID_ELEMENT_VALUE
    );

    assert.throws(
      () => bubbleSort([1, 'string', 3]),
      (err) => err instanceof EngineError && err.code === ErrorCode.INVALID_ELEMENT_VALUE
    );

    assert.throws(
      () => bubbleSort(new Array(HARD_LIMITS.MAX_ARRAY_SIZE + 1).fill(1)),
      (err) => err instanceof EngineError && err.code === ErrorCode.INPUT_SIZE_EXCEEDED
    );
  });

  // Test 7: Next and previous steps display the correct states
  it('7. Next and previous steps display the correct states', () => {
    const trace = bubbleSort([3, 1, 2]);
    const controller = new PlaybackController(trace);

    // Initial state
    assert.equal(controller.currentIndex, -1);
    assert.equal(controller.state, PlaybackState.READY);
    let s = controller.getCurrentState();
    assert.equal(s.isAtStart, true);
    assert.deepEqual(s.currentSnapshot.array, [3, 1, 2]);
    assert.equal(s.currentEvent, null);

    // Step forward
    controller.stepForward();
    assert.equal(controller.currentIndex, 0);
    s = controller.getCurrentState();
    assert.equal(s.isAtStart, false);
    assert.equal(s.currentEvent.type, EventType.ALGORITHM_START);

    // Step forward again
    controller.stepForward();
    assert.equal(controller.currentIndex, 1);

    // Step backward
    controller.stepBackward();
    assert.equal(controller.currentIndex, 0);
    s = controller.getCurrentState();
    assert.equal(s.currentEvent.type, EventType.ALGORITHM_START);

    // Step backward to initial
    controller.stepBackward();
    assert.equal(controller.currentIndex, -1);
    s = controller.getCurrentState();
    assert.equal(s.isAtStart, true);
    assert.equal(s.currentEvent, null);

    controller.dispose();
  });

  // Test 8: Play and pause do not create overlapping playback loops
  it('8. Play and pause do not create overlapping playback loops', () => {
    const clock = new VirtualClock();
    const trace = bubbleSort([3, 2, 1]);
    const controller = new PlaybackController(trace, { clock, delayMs: 100 });

    controller.play();
    assert.equal(controller.state, PlaybackState.RUNNING);

    // Calling play again while running must be a no-op
    controller.play();
    assert.equal(controller.state, PlaybackState.RUNNING);

    // Advance clock by 1 tick
    clock.tick(100);
    assert.equal(controller.currentIndex, 0);

    // Pause stops playback cleanly
    controller.pause();
    assert.equal(controller.state, PlaybackState.PAUSED);

    // Advancing clock while paused must NOT advance index
    clock.tick(500);
    assert.equal(controller.currentIndex, 0);

    controller.dispose();
  });

  // Test 9: Reset restores a consistent initial state
  it('9. Reset restores a consistent initial state', () => {
    const trace = selectionSort([5, 4, 3]);
    const controller = new PlaybackController(trace);

    controller.stepForward();
    controller.stepForward();
    assert.ok(controller.currentIndex > -1);

    controller.reset();
    assert.equal(controller.currentIndex, -1);
    assert.equal(controller.state, PlaybackState.READY);
    const s = controller.getCurrentState();
    assert.equal(s.isAtStart, true);
    assert.deepEqual(s.currentSnapshot.array, [5, 4, 3]);
    assert.equal(s.currentEvent, null);

    controller.dispose();
  });

  // Test 10: Switching algorithms does not reuse stale traces
  it('10. Switching algorithms does not reuse stale traces', () => {
    const array = [4, 2, 3];
    const traceBubble = bubbleSort(array);
    const controller1 = new PlaybackController(traceBubble);
    controller1.stepForward();

    // Student switches to Selection Sort
    controller1.dispose();
    assert.equal(controller1.isDisposed, true);

    const traceSelection = selectionSort(array);
    const controller2 = new PlaybackController(traceSelection);
    assert.equal(controller2.currentIndex, -1);
    assert.equal(controller2.trace.algorithmName, 'selectionSort');

    controller2.dispose();
  });

  // Test 11: Loading new input during or after playback does not leave stale updates
  it('11. Loading new input during playback does not leave stale updates', () => {
    const clock = new VirtualClock();
    const traceOld = bubbleSort([10, 20]);
    const controller = new PlaybackController(traceOld, { clock, delayMs: 100 });

    controller.play();
    assert.equal(controller.state, PlaybackState.RUNNING);

    // Student loads new array while playing
    const traceNew = bubbleSort([99, 88, 77]);
    controller.loadTrace(traceNew);

    // Controller should transition to READY with index -1 and cancel pending timers
    assert.equal(controller.state, PlaybackState.READY);
    assert.equal(controller.currentIndex, -1);
    assert.deepEqual(controller.getCurrentState().currentSnapshot.array, [99, 88, 77]);

    // Advance old clock — no stale updates should happen
    clock.tick(500);
    assert.equal(controller.currentIndex, -1);

    controller.dispose();
  });

  // Test 12: Pseudocode highlighting matches current event mapping
  it('12. Pseudocode highlighting matches current event mapping', () => {
    const traceBubble = bubbleSort([4, 1]);
    for (const event of traceBubble.events) {
      if (event.codeMapping) {
        assert.ok(
          event.codeMapping.line >= 1 &&
          event.codeMapping.line <= BUBBLE_SORT_PSEUDOCODE.length,
          `Bubble Sort code mapping line ${event.codeMapping.line} out of range 1-${BUBBLE_SORT_PSEUDOCODE.length}`
        );
      }
    }

    const traceSelection = selectionSort([4, 1]);
    for (const event of traceSelection.events) {
      if (event.codeMapping) {
        assert.ok(
          event.codeMapping.line >= 1 &&
          event.codeMapping.line <= SELECTION_SORT_PSEUDOCODE.length,
          `Selection Sort code mapping line ${event.codeMapping.line} out of range 1-${SELECTION_SORT_PSEUDOCODE.length}`
        );
      }
    }
  });

  // Test 13: Event explanations correspond to the actual event
  it('13. Event explanations correspond to the actual event', () => {
    const trace = bubbleSort([2, 1]);
    const compareEvent = trace.events.find((e) => e.type === EventType.COMPARE);
    assert.ok(compareEvent);
    assert.ok(compareEvent.description.includes('Comparing'));
    assert.ok(compareEvent.codeMapping?.explanation);

    const swapEvent = trace.events.find((e) => e.type === EventType.SWAP);
    assert.ok(swapEvent);
    assert.ok(swapEvent.description.includes('Swapped'));
  });

  // Test 14: Completion disables inappropriate playback actions
  it('14. Completion disables inappropriate playback actions', () => {
    const trace = bubbleSort([2, 1]);
    const controller = new PlaybackController(trace);

    // Seek to last event
    controller.seek(trace.length - 1);
    assert.equal(controller.state, PlaybackState.COMPLETED);
    const s = controller.getCurrentState();
    assert.equal(s.isAtEnd, true);

    // Stepping forward past completion remains at completion
    controller.stepForward();
    assert.equal(controller.currentIndex, trace.length - 1);
    assert.equal(controller.state, PlaybackState.COMPLETED);

    controller.dispose();
  });

  // Test 15: The Engine remains usable independently of React
  it('15. The Engine remains usable independently of React', () => {
    const trace = bubbleSort([9, 3, 5]);
    assert.equal(typeof trace.validate, 'function');
    assert.deepEqual(trace.finalArray, [3, 5, 9]);

    const controller = new PlaybackController(trace);
    let notifyCount = 0;
    const unsub = controller.subscribe(() => {
      notifyCount++;
    });

    controller.stepForward();
    assert.ok(notifyCount >= 2); // Initial notification + stepForward notification

    unsub();
    controller.dispose();
  });
});
