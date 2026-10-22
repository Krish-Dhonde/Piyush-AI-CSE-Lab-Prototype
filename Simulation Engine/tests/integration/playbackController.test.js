import { describe, it, expect, vi } from 'vitest';
import { PlaybackController } from '../../src/playback/controller.js';
import { VirtualClock } from '../../src/playback/clock.js';
import { bubbleSort } from '../../src/algorithms/bubbleSort.js';
import { PlaybackState, ErrorCode, EventType } from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';
import { ExecutionTrace } from '../../src/core/trace.js';

describe('PlaybackController (Integration)', () => {
  function setupTestController(input = [4, 2, 5, 1]) {
    const trace = bubbleSort(input);
    const clock = new VirtualClock();
    const controller = new PlaybackController(trace, { clock, delayMs: 100 });
    return { trace, clock, controller };
  }

  it('should initialize in READY state at index -1 upon loading trace', () => {
    const { controller, trace } = setupTestController();

    expect(controller.state).toBe(PlaybackState.READY);
    expect(controller.currentIndex).toBe(-1);

    const snapshot = controller.getCurrentState();
    expect(snapshot.state).toBe(PlaybackState.READY);
    expect(snapshot.eventIndex).toBe(-1);
    expect(snapshot.isAtStart).toBe(true);
    expect(snapshot.isAtEnd).toBe(false);
    expect(snapshot.currentSnapshot.array).toEqual(trace.initialArray);
  });

  it('should step forward through events and complete at last event', () => {
    const { controller, trace } = setupTestController();

    // Step from -1 to 0
    controller.stepForward();
    expect(controller.currentIndex).toBe(0);
    expect(controller.state).toBe(PlaybackState.PAUSED);

    // Step until end
    while (controller.currentIndex < trace.length - 1) {
      controller.stepForward();
    }

    expect(controller.currentIndex).toBe(trace.length - 1);
    expect(controller.state).toBe(PlaybackState.COMPLETED);

    // Further step forward is safe no-op
    controller.stepForward();
    expect(controller.currentIndex).toBe(trace.length - 1);
    expect(controller.state).toBe(PlaybackState.COMPLETED);
  });

  it('should step backward through events and return to initial state', () => {
    const { controller } = setupTestController();

    controller.stepForward(); // 0
    controller.stepForward(); // 1
    controller.stepForward(); // 2
    expect(controller.currentIndex).toBe(2);

    controller.stepBackward();
    expect(controller.currentIndex).toBe(1);

    controller.stepBackward();
    expect(controller.currentIndex).toBe(0);

    controller.stepBackward();
    expect(controller.currentIndex).toBe(-1);
    expect(controller.state).toBe(PlaybackState.READY);

    // Further step backward is safe no-op at -1
    controller.stepBackward();
    expect(controller.currentIndex).toBe(-1);
  });

  it('should seek accurately to any valid event index', () => {
    const { controller, trace } = setupTestController();

    // Seek to middle
    controller.seek(3);
    expect(controller.currentIndex).toBe(3);
    expect(controller.state).toBe(PlaybackState.PAUSED);

    // Seek to final event
    controller.seek(trace.length - 1);
    expect(controller.currentIndex).toBe(trace.length - 1);
    expect(controller.state).toBe(PlaybackState.COMPLETED);

    // Seek back to start (-1)
    controller.seek(-1);
    expect(controller.currentIndex).toBe(-1);
    expect(controller.state).toBe(PlaybackState.READY);
  });

  it('should reject out-of-bounds seek with INDEX_OUT_OF_BOUNDS', () => {
    const { controller, trace } = setupTestController();

    expect(() => controller.seek(-2)).toThrowError(EngineError);
    expect(() => controller.seek(trace.length)).toThrowError(EngineError);

    try {
      controller.seek(trace.length + 5);
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INDEX_OUT_OF_BOUNDS);
    }
  });

  it('should play, advance on clock ticks, pause, and resume deterministically', () => {
    const { controller, clock, trace } = setupTestController();

    controller.play();
    expect(controller.state).toBe(PlaybackState.RUNNING);

    // Advance virtual clock by 1 tick (100ms) -> advances to index 0
    clock.tick(100);
    expect(controller.currentIndex).toBe(0);
    expect(controller.state).toBe(PlaybackState.RUNNING);

    // Advance 2 more ticks (200ms) -> index 2
    clock.tick(200);
    expect(controller.currentIndex).toBe(2);

    // Pause playback
    controller.pause();
    expect(controller.state).toBe(PlaybackState.PAUSED);

    // Ticking while paused should NOT advance position
    clock.tick(500);
    expect(controller.currentIndex).toBe(2);

    // Resume playback to completion
    controller.play();
    expect(controller.state).toBe(PlaybackState.RUNNING);

    clock.runAll();
    expect(controller.currentIndex).toBe(trace.length - 1);
    expect(controller.state).toBe(PlaybackState.COMPLETED);
  });

  it('should safely restart playback from beginning if play() is called when COMPLETED', () => {
    const { controller, clock, trace } = setupTestController();

    // Fast-forward to completed
    controller.seek(trace.length - 1);
    expect(controller.state).toBe(PlaybackState.COMPLETED);

    // Calling play() at completion restarts from start
    controller.play();
    expect(controller.state).toBe(PlaybackState.RUNNING);
    expect(controller.currentIndex).toBe(-1);

    clock.tick(100);
    expect(controller.currentIndex).toBe(0);
  });

  it('should ignore duplicate play() calls without duplicating timers', () => {
    const { controller, clock } = setupTestController();

    controller.play();
    controller.play(); // duplicate call
    expect(controller.state).toBe(PlaybackState.RUNNING);

    clock.tick(100);
    expect(controller.currentIndex).toBe(0);
  });

  it('should reset controller cleanly to initial state', () => {
    const { controller, clock } = setupTestController();

    controller.play();
    clock.tick(200);
    expect(controller.currentIndex).toBe(1);

    controller.reset();
    expect(controller.currentIndex).toBe(-1);
    expect(controller.state).toBe(PlaybackState.READY);
    expect(clock.hasPending()).toBe(false);
  });

  it('should adjust speed and dynamically update effective delay', () => {
    const { controller, clock } = setupTestController();

    controller.setDelay(200);
    expect(controller.effectiveDelayMs).toBe(200);

    // 2x speed -> 100ms delay
    controller.setSpeed(2.0);
    expect(controller.effectiveDelayMs).toBe(100);

    // 0.5x speed -> 400ms delay
    controller.setSpeed(0.5);
    expect(controller.effectiveDelayMs).toBe(400);

    // Test execution with 2x speed
    controller.setSpeed(2.0);
    controller.play();

    // 100ms tick advances 1 step
    clock.tick(100);
    expect(controller.currentIndex).toBe(0);
  });

  it('should notify subscribers on all state changes and support unsubscribe', () => {
    const { controller } = setupTestController();
    const observedStates = [];

    const unsubscribe = controller.subscribe((state) => {
      observedStates.push({ eventIndex: state.eventIndex, state: state.state });
    });

    // Initial notification
    expect(observedStates.length).toBe(1);
    expect(observedStates[0]).toEqual({ eventIndex: -1, state: PlaybackState.READY });

    controller.stepForward();
    expect(observedStates.length).toBe(2);
    expect(observedStates[1]).toEqual({ eventIndex: 0, state: PlaybackState.PAUSED });

    unsubscribe();

    controller.stepForward();
    // No new notifications after unsubscribe
    expect(observedStates.length).toBe(2);
  });

  it('should reject operations when no trace is loaded', () => {
    const emptyController = new PlaybackController();

    expect(() => emptyController.play()).toThrowError(EngineError);
    expect(() => emptyController.stepForward()).toThrowError(EngineError);
    expect(() => emptyController.stepBackward()).toThrowError(EngineError);
    expect(() => emptyController.seek(0)).toThrowError(EngineError);
    expect(() => emptyController.reset()).toThrowError(EngineError);

    try {
      emptyController.play();
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_CONTROLLER_STATE);
    }
  });

  it('should reject loading invalid trace object', () => {
    const controller = new PlaybackController();
    expect(() => controller.loadTrace(null)).toThrowError(EngineError);
    expect(() => controller.loadTrace({})).toThrowError(EngineError);
  });

  it('should validate setSpeed and setDelay arguments', () => {
    const { controller } = setupTestController();

    expect(() => controller.setSpeed(-1)).toThrowError(EngineError);
    expect(() => controller.setSpeed(0)).toThrowError(EngineError);
    expect(() => controller.setSpeed('fast')).toThrowError(EngineError);

    expect(() => controller.setDelay(-50)).toThrowError(EngineError);
    expect(() => controller.setDelay('slow')).toThrowError(EngineError);
  });

  it('should reject invalid subscriber listener type', () => {
    const { controller } = setupTestController();
    expect(() => controller.subscribe('not a function')).toThrow(TypeError);
  });

  it('should dispose cleanly and reset state to IDLE', () => {
    const { controller, clock } = setupTestController();

    controller.play();
    expect(clock.hasPending()).toBe(true);

    controller.dispose();
    expect(controller.state).toBe(PlaybackState.IDLE);
    expect(controller.trace).toBe(null);
    expect(clock.hasPending()).toBe(false);
  });

  describe('Integrity & Re-entrancy Hardening', () => {
    it('should preserve existing trace and state when loadTrace fails (transactional safety)', () => {
      const { controller, trace } = setupTestController();
      controller.stepForward();
      controller.stepForward(); // at index 1

      const corruptedTrace = {
        validate: () => {
          throw new EngineError(ErrorCode.TRACE_INTEGRITY_VIOLATION, 'Trace is corrupt');
        },
        getSnapshotAt: () => {},
        events: []
      };

      expect(() => controller.loadTrace(corruptedTrace)).toThrowError(EngineError);

      // Verify controller was untouched
      expect(controller.trace).toBe(trace);
      expect(controller.currentIndex).toBe(1);
      expect(controller.state).toBe(PlaybackState.PAUSED);
    });

    it('should reject fractional, NaN, non-integer, and string seek indices', () => {
      const { controller } = setupTestController();
      const invalidIndices = [1.5, -0.5, NaN, Infinity, -Infinity, '1', null, undefined];

      for (const idx of invalidIndices) {
        expect(() => controller.seek(idx)).toThrowError(EngineError);
        try {
          controller.seek(idx);
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INDEX_OUT_OF_BOUNDS);
        }
      }
    });

    it('should enforce hard limits on setSpeed and setDelay', () => {
      const { controller } = setupTestController();

      // Exceeds max speed (20.0) or below min speed (0.05)
      expect(() => controller.setSpeed(25.0)).toThrowError(EngineError);
      expect(() => controller.setSpeed(0.01)).toThrowError(EngineError);

      // Exceeds max delay (10000ms) or non-integer
      expect(() => controller.setDelay(10001)).toThrowError(EngineError);
      expect(() => controller.setDelay(150.5)).toThrowError(EngineError);
    });

    it('should safely handle re-entrant subscriber operations (pause, seek, unsubscribe)', () => {
      const { controller, clock } = setupTestController();
      let unsubscribe1;
      let callCount = 0;

      // Listener 1 unsubscribes itself during notification
      unsubscribe1 = controller.subscribe((state) => {
        callCount++;
        if (state.eventIndex === 0) {
          unsubscribe1();
        }
      });

      // Listener 2 pauses playback when reaching index 1
      controller.subscribe((state) => {
        if (state.eventIndex === 1 && state.state === PlaybackState.RUNNING) {
          controller.pause();
        }
      });

      controller.play();
      clock.tick(100); // reaches 0, listener 1 unsubscribes
      expect(controller.currentIndex).toBe(0);

      clock.tick(100); // reaches 1, listener 2 pauses
      expect(controller.currentIndex).toBe(1);
      expect(controller.state).toBe(PlaybackState.PAUSED);

      clock.tick(500); // paused, no further advancement
      expect(controller.currentIndex).toBe(1);
    });

    it('should safely handle subscriber calling dispose() during notification', () => {
      const { controller } = setupTestController();

      controller.subscribe((state) => {
        if (state.eventIndex === 0) {
          controller.dispose();
        }
      });

      controller.stepForward(); // index 0, subscriber disposes controller
      expect(controller.isDisposed).toBe(true);
      expect(controller.state).toBe(PlaybackState.IDLE);
      expect(controller.trace).toBe(null);
    });

    it('should reject operations on a disposed controller', () => {
      const { controller } = setupTestController();
      controller.dispose();

      expect(() => controller.play()).toThrowError(EngineError);
      expect(() => controller.pause()).toThrowError(EngineError);
      expect(() => controller.stepForward()).toThrowError(EngineError);
      expect(() => controller.stepBackward()).toThrowError(EngineError);
      expect(() => controller.seek(0)).toThrowError(EngineError);
      expect(() => controller.reset()).toThrowError(EngineError);
      expect(() => controller.setSpeed(2.0)).toThrowError(EngineError);
      expect(() => controller.setDelay(100)).toThrowError(EngineError);
      expect(() => controller.subscribe(() => {})).toThrowError(EngineError);
      expect(() => controller.loadTrace({})).toThrowError(EngineError);
    });

    it('should transition controller to ERROR state and cancel timer if tick encounters an error', () => {
      const { controller, clock } = setupTestController();
      controller.play();

      // Seek to last step so next tick transitions to COMPLETED
      controller.seek(controller.trace.length - 2);
      controller.play();

      // Mock FSM transition to throw unexpected fatal error on COMPLETED during tick
      const originalTransition = controller._fsm.transition.bind(controller._fsm);
      vi.spyOn(controller._fsm, 'transition').mockImplementation((targetState, reason) => {
        if (targetState === PlaybackState.COMPLETED) {
          throw new Error('Fatal transition error');
        }
        return originalTransition(targetState, reason);
      });

      clock.tick(100);
      expect(controller.state).toBe(PlaybackState.ERROR);
      expect(clock.hasPending()).toBe(false);
    });



    it('should isolate subscriber errors and continue notifying subsequent listeners', () => {
      const { controller } = setupTestController();
      let listener2Called = false;

      // Listener 1 throws an error
      controller.subscribe(() => {
        throw new Error('Listener 1 failed');
      });

      // Listener 2 should still be called
      controller.subscribe(() => {
        listener2Called = true;
      });

      controller.stepForward();
      expect(listener2Called).toBe(true);
    });

    it('should skip listener if removed by an earlier listener in the same notification cycle', () => {
      const { controller } = setupTestController();
      let listener2Called = false;
      let unsubscribe2;

      controller.subscribe(() => {
        if (unsubscribe2) {
          unsubscribe2(); // removes listener 2 before its turn
        }
      });

      unsubscribe2 = controller.subscribe(() => {
        listener2Called = true;
      });

      listener2Called = false;
      controller.stepForward();
      expect(listener2Called).toBe(false);
    });

    it('should support repeated play, pause, reset, and dispose cycles', () => {
      for (let i = 0; i < 5; i++) {
        const { controller, clock } = setupTestController([3, 1, 2]);
        controller.play();
        clock.tick(100);
        expect(controller.currentIndex).toBe(0);

        controller.pause();
        expect(controller.state).toBe(PlaybackState.PAUSED);

        controller.reset();
        expect(controller.currentIndex).toBe(-1);
        expect(controller.state).toBe(PlaybackState.READY);

        controller.dispose();
        expect(controller.state).toBe(PlaybackState.IDLE);
      }
    });
  });

  describe('Trust Boundary & Corrupted Candidate Trace Rejection (Regression)', () => {
    it('should reject candidate trace with corrupted PASS_COMPLETE.payload.lockedIndex and preserve existing trace, index, state, timers, and subscriber state', () => {
      // Step 1: Controller holding a valid trace
      const initialInput = [4, 2, 5, 1];
      const validTrace = bubbleSort(initialInput);
      const clock = new VirtualClock();
      const controller = new PlaybackController(validTrace, { clock, delayMs: 100 });

      // Advance controller to event index 1 and start auto-playback
      controller.stepForward(); // index 0
      controller.stepForward(); // index 1
      controller.play(); // state RUNNING, active timer scheduled
      expect(controller.currentIndex).toBe(1);
      expect(controller.state).toBe(PlaybackState.RUNNING);
      expect(clock.hasPending()).toBe(true);

      const subscriberNotifications = [];
      controller.subscribe((state) => {
        subscriberNotifications.push(state);
      });
      // Subscriber callback was called once immediately with current state
      expect(subscriberNotifications.length).toBe(1);

      // Step 2: Generate valid candidate trace and mutate PASS_COMPLETE.payload.lockedIndex
      const candidateBase = bubbleSort([3, 1, 2]);
      const corruptedEvents = JSON.parse(JSON.stringify(candidateBase.events));
      const passCompleteEvent = corruptedEvents.find((e) => e.type === EventType.PASS_COMPLETE);
      expect(passCompleteEvent).toBeDefined();

      // Corrupt lockedIndex without changing array snapshots
      passCompleteEvent.payload.lockedIndex = 999;

      // Step 3: Construct candidate ExecutionTrace
      const corruptedTrace = new ExecutionTrace({
        initialArray: candidateBase.initialArray,
        events: corruptedEvents,
        metrics: candidateBase.metrics,
        algorithmName: candidateBase.algorithmName
      });

      // Step 4: Call loadTrace() on controller holding valid trace
      expect(() => controller.loadTrace(corruptedTrace)).toThrowError(EngineError);
      try {
        controller.loadTrace(corruptedTrace);
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
        expect(err.message).toContain('PASS_COMPLETE lockedIndex mismatch');
      }

      // Assert:
      // 1. Previous valid trace remains loaded
      expect(controller.trace).toBe(validTrace);
      // 2. Current index remains unchanged
      expect(controller.currentIndex).toBe(1);
      // 3. State remains unchanged
      expect(controller.state).toBe(PlaybackState.RUNNING);
      // 4. Scheduled timers remain unchanged
      expect(clock.hasPending()).toBe(true);
      // 5. No invalid trace state was delivered to subscribers
      expect(subscriberNotifications.length).toBe(1);
      expect(subscriberNotifications[0].currentSnapshot.array).toEqual(validTrace.initialArray);
    });

    it('should reject candidate trace with corrupted ALGORITHM_COMPLETE.payload.sortedArray and leave previous trace intact', () => {
      const { controller, trace } = setupTestController();
      const candidateBase = bubbleSort([3, 1, 2]);
      const events = JSON.parse(JSON.stringify(candidateBase.events));
      events[events.length - 1].payload.sortedArray = [999, 1000, 1001];

      const corruptedTrace = new ExecutionTrace({
        initialArray: candidateBase.initialArray,
        events,
        metrics: candidateBase.metrics
      });

      expect(() => controller.loadTrace(corruptedTrace)).toThrowError(EngineError);
      try {
        controller.loadTrace(corruptedTrace);
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
      expect(controller.trace).toBe(trace);
    });

    it('should reject candidate trace with invalid COMPARE adjacency and leave previous trace intact', () => {
      const { controller, trace } = setupTestController();
      const candidateBase = bubbleSort([3, 1, 2]);
      const events = JSON.parse(JSON.stringify(candidateBase.events));
      const compareEvent = events.find((e) => e.type === EventType.COMPARE);
      compareEvent.payload.indices = [0, 2]; // non-adjacent!

      const corruptedTrace = new ExecutionTrace({
        initialArray: candidateBase.initialArray,
        events,
        metrics: candidateBase.metrics
      });

      expect(() => controller.loadTrace(corruptedTrace)).toThrowError(EngineError);
      try {
        controller.loadTrace(corruptedTrace);
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
      expect(controller.trace).toBe(trace);
    });

    it('should reject candidate trace with incorrect PASS_COMPLETE metadata', () => {
      const { controller, trace } = setupTestController();
      const candidateBase = bubbleSort([3, 1, 2]);
      const events = JSON.parse(JSON.stringify(candidateBase.events));
      const passComplete = events.find((e) => e.type === EventType.PASS_COMPLETE);
      passComplete.payload.swapsInPass = 777; // incorrect swaps count!

      const corruptedTrace = new ExecutionTrace({
        initialArray: candidateBase.initialArray,
        events,
        metrics: candidateBase.metrics
      });

      expect(() => controller.loadTrace(corruptedTrace)).toThrowError(EngineError);
      try {
        controller.loadTrace(corruptedTrace);
      } catch (err) {
        expect(err.code).toBe(ErrorCode.TRACE_INTEGRITY_VIOLATION);
      }
      expect(controller.trace).toBe(trace);
    });

    it('should reject candidate trace with inconsistent or missing totals', () => {
      const { controller, trace } = setupTestController();
      const candidateBase = bubbleSort([3, 1, 2]);
      const events = JSON.parse(JSON.stringify(candidateBase.events));

      const corruptedTotals = new ExecutionTrace({
        initialArray: candidateBase.initialArray,
        events,
        metrics: { totalComparisons: 999, totalSwaps: 0, totalPasses: 0 }
      });

      expect(() => controller.loadTrace(corruptedTotals)).toThrowError(EngineError);
      expect(controller.trace).toBe(trace);
    });
  });

  describe('Lifecycle State Distinction & Advancement Invariants', () => {
    it('should distinguish clearly between an uninitialized controller and a disposed controller', () => {
      const clock = new VirtualClock();
      const uninit = new PlaybackController(null, { clock });

      // Uninitialized state assertions
      expect(uninit.state).toBe(PlaybackState.IDLE);
      expect(uninit.trace).toBe(null);
      expect(uninit.isDisposed).toBe(false);
      expect(uninit.currentIndex).toBe(-1);

      // Playback operations are blocked because no trace is loaded
      expect(() => uninit.play()).toThrowError(EngineError);
      expect(() => uninit.stepForward()).toThrowError(EngineError);
      expect(() => uninit.stepBackward()).toThrowError(EngineError);
      expect(() => uninit.seek(0)).toThrowError(EngineError);
      expect(() => uninit.reset()).toThrowError(EngineError);

      try {
        uninit.play();
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CONTROLLER_STATE);
        expect(err.message).toContain('No execution trace is currently loaded');
      }

      // But an uninitialized controller CAN load a trace and become READY
      const trace = bubbleSort([2, 1]);
      uninit.loadTrace(trace);
      expect(uninit.state).toBe(PlaybackState.READY);
      expect(uninit.trace).toBe(trace);
      expect(uninit.isDisposed).toBe(false);

      // Now dispose the controller
      uninit.dispose();
      expect(uninit.state).toBe(PlaybackState.IDLE);
      expect(uninit.trace).toBe(null);
      expect(uninit.isDisposed).toBe(true);

      // A disposed controller CANNOT load a trace or execute any operations
      expect(() => uninit.loadTrace(trace)).toThrowError(EngineError);
      try {
        uninit.loadTrace(trace);
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CONTROLLER_STATE);
        expect(err.message).toContain('PlaybackController has been disposed');
      }
      expect(() => uninit.subscribe(() => {})).toThrowError(EngineError);
      expect(() => uninit.setSpeed(2.0)).toThrowError(EngineError);
      expect(() => uninit.setDelay(200)).toThrowError(EngineError);
    });

    it('should strictly guarantee no timer or state advancement after pause, reset, replacement, or disposal', () => {
      const { controller, clock } = setupTestController([4, 2, 5, 1]);

      // 1. No advancement after pause
      controller.play();
      clock.tick(100); // advances to index 0
      expect(controller.currentIndex).toBe(0);
      controller.pause();
      expect(controller.state).toBe(PlaybackState.PAUSED);
      clock.tick(1000); // tick while paused
      expect(controller.currentIndex).toBe(0);
      expect(controller.state).toBe(PlaybackState.PAUSED);

      // 2. No advancement after reset
      controller.play();
      clock.tick(100); // advances to index 1
      expect(controller.currentIndex).toBe(1);
      controller.reset();
      expect(controller.currentIndex).toBe(-1);
      expect(controller.state).toBe(PlaybackState.READY);
      clock.tick(1000); // tick while reset
      expect(controller.currentIndex).toBe(-1);
      expect(controller.state).toBe(PlaybackState.READY);

      // 3. No advancement after replacement from previous timer
      controller.play();
      const newTrace = bubbleSort([3, 1, 2]);
      controller.loadTrace(newTrace);
      expect(controller.currentIndex).toBe(-1);
      expect(controller.state).toBe(PlaybackState.READY);
      clock.tick(1000); // tick should not fire old timer
      expect(controller.currentIndex).toBe(-1);
      expect(controller.state).toBe(PlaybackState.READY);

      // 4. No advancement after disposal
      controller.play();
      controller.dispose();
      expect(controller.state).toBe(PlaybackState.IDLE);
      clock.tick(1000);
      expect(controller.state).toBe(PlaybackState.IDLE);
      expect(clock.hasPending()).toBe(false);
    });
  });
});



