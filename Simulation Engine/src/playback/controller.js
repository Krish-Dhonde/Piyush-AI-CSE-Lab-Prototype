import { PlaybackState, ErrorCode, DEFAULT_CONFIG, HARD_LIMITS } from '../core/types.js';
import { EngineError } from '../core/errors.js';
import { RealClock } from './clock.js';
import { PlaybackStateMachine } from './stateMachine.js';

/**
 * Reusable, headless playback controller for algorithmic execution traces.
 * Manages deterministic forward/backward stepping, auto-playback, scrubbing/seeking,
 * and state notifications without any browser DOM or UI dependencies.
 */
export class PlaybackController {
  /**
   * @param {import('../core/trace.js').ExecutionTrace} [trace]
   * @param {object} [options]
   * @param {import('./clock.js').RealClock | import('./clock.js').VirtualClock} [options.clock]
   * @param {number} [options.delayMs=300]
   * @param {number} [options.speedMultiplier=1.0]
   */
  constructor(trace = null, options = {}) {
    this._clock = options.clock ?? new RealClock();
    this._baseDelayMs = DEFAULT_CONFIG.DEFAULT_DELAY_MS;
    this._speedMultiplier = 1.0;
    this._fsm = new PlaybackStateMachine(PlaybackState.IDLE);

    this._trace = null;
    this._currentIndex = -1; // -1 represents initial state before step 0
    this._activeTimer = null;
    this._listeners = new Set();
    this._isStepping = false;
    this._isNotifying = false;
    this._hasPendingNotification = false;
    this._isDisposed = false;

    if (options.delayMs !== undefined) {
      this.setDelay(options.delayMs);
    }
    if (options.speedMultiplier !== undefined) {
      this.setSpeed(options.speedMultiplier);
    }

    if (trace) {
      this.loadTrace(trace);
    }
  }

  /**
   * Active controller state name.
   * @returns {string}
   */
  get state() {
    return this._fsm.state;
  }

  /**
   * Associated ExecutionTrace.
   * @returns {import('../core/trace.js').ExecutionTrace | null}
   */
  get trace() {
    return this._trace;
  }

  /**
   * Current 0-indexed position in event trace (-1 represents initial state).
   * @returns {number}
   */
  get currentIndex() {
    return this._currentIndex;
  }

  /**
   * Playback speed multiplier (e.g. 0.5x, 1x, 2x).
   * @returns {number}
   */
  get speedMultiplier() {
    return this._speedMultiplier;
  }

  /**
   * Base delay interval in milliseconds before speed multiplication.
   * @returns {number}
   */
  get baseDelayMs() {
    return this._baseDelayMs;
  }

  /**
   * Effective step delay in milliseconds after applying speed multiplier.
   * @returns {number}
   */
  get effectiveDelayMs() {
    return Math.max(1, Math.round(this._baseDelayMs / this._speedMultiplier));
  }

  /**
   * Whether controller has been permanently disposed.
   * @returns {boolean}
   */
  get isDisposed() {
    return this._isDisposed;
  }

  /**
   * Loads a new execution trace into the controller.
   * Validates the candidate trace BEFORE modifying controller state.
   *
   * @param {import('../core/trace.js').ExecutionTrace} trace
   * @throws {EngineError} If candidate trace fails validation
   */
  loadTrace(trace) {
    this._assertNotDisposed('loadTrace');

    if (!trace || typeof trace !== 'object' || typeof trace.getSnapshotAt !== 'function' || !Array.isArray(trace.events)) {
      throw new EngineError(
        ErrorCode.INVALID_INPUT_TYPE,
        'Cannot load invalid trace. Must be a valid ExecutionTrace instance.',
        { trace }
      );
    }

    // Step 1: Pre-validate candidate trace before mutating any internal state
    if (typeof trace.validate === 'function') {
      trace.validate();
    } else {
      throw new EngineError(
        ErrorCode.TRACE_INTEGRITY_VIOLATION,
        'Candidate trace must provide a validate() method.',
        { trace }
      );
    }

    // Step 2: Transactional update - only executed if validation succeeds
    this._clearScheduledTimer();
    this._trace = trace;
    this._currentIndex = -1;

    if (this._fsm.state === PlaybackState.IDLE || this._fsm.state === PlaybackState.ERROR) {
      this._fsm.transition(PlaybackState.READY, 'Trace loaded');
    } else {
      this._fsm.reset(PlaybackState.READY);
    }

    this._notifyListeners();
  }

  /**
   * Starts automatic playback forward through the trace.
   * If at the end, restarts from initial state and plays.
   */
  play() {
    this._assertNotDisposed('play');
    this._assertTraceLoaded('play');

    // If already running, ignore to prevent overlapping operations
    if (this._fsm.state === PlaybackState.RUNNING) {
      return;
    }

    // Safe restart: if completed, reset to start before playing
    if (this._fsm.state === PlaybackState.COMPLETED) {
      this._currentIndex = -1;
      this._fsm.transition(PlaybackState.READY, 'Restart from completion');
    }

    this._fsm.transition(PlaybackState.RUNNING, 'Playback started');
    this._scheduleNextTick();
    this._notifyListeners();
  }

  /**
   * Pauses automatic playback.
   */
  pause() {
    this._assertNotDisposed('pause');
    this._assertTraceLoaded('pause');

    if (this._fsm.state === PlaybackState.RUNNING) {
      this._clearScheduledTimer();
      this._fsm.transition(PlaybackState.PAUSED, 'Playback paused by caller');
      this._notifyListeners();
    }
  }

  /**
   * Advances exactly one step forward.
   *
   * @returns {object} The new current state
   */
  stepForward() {
    this._assertNotDisposed('stepForward');
    this._assertTraceLoaded('stepForward');

    // If running, pause first
    if (this._fsm.state === PlaybackState.RUNNING) {
      this.pause();
    }

    if (this._currentIndex >= this._trace.length - 1) {
      if (this._fsm.state !== PlaybackState.COMPLETED) {
        this._fsm.transition(PlaybackState.COMPLETED, 'Reached end of trace');
        this._notifyListeners();
      }
      return this.getCurrentState();
    }

    this._currentIndex++;

    if (this._currentIndex === this._trace.length - 1) {
      this._fsm.transition(PlaybackState.COMPLETED, 'Reached final event via step');
    } else if (this._fsm.state !== PlaybackState.PAUSED) {
      this._fsm.transition(PlaybackState.PAUSED, 'Stepped forward');
    }

    this._notifyListeners();
    return this.getCurrentState();
  }

  /**
   * Steps exactly one step backward.
   *
   * @returns {object} The new current state
   */
  stepBackward() {
    this._assertNotDisposed('stepBackward');
    this._assertTraceLoaded('stepBackward');

    // If running, pause first
    if (this._fsm.state === PlaybackState.RUNNING) {
      this.pause();
    }

    if (this._currentIndex <= -1) {
      return this.getCurrentState();
    }

    this._currentIndex--;

    if (this._currentIndex === -1) {
      this._fsm.transition(PlaybackState.READY, 'Stepped back to initial state');
    } else if (this._fsm.state === PlaybackState.COMPLETED) {
      this._fsm.transition(PlaybackState.PAUSED, 'Stepped back from completion');
    } else if (this._fsm.state !== PlaybackState.PAUSED) {
      this._fsm.transition(PlaybackState.PAUSED, 'Stepped backward');
    }

    this._notifyListeners();
    return this.getCurrentState();
  }

  /**
   * Seeks directly to a specified event index.
   * Index -1 corresponds to the pre-execution initial array.
   *
   * @param {number} targetIndex - Integer between -1 and trace.length - 1
   * @returns {object} The new current state
   */
  seek(targetIndex) {
    this._assertNotDisposed('seek');
    this._assertTraceLoaded('seek');

    if (typeof targetIndex !== 'number' || !Number.isInteger(targetIndex)) {
      throw new EngineError(
        ErrorCode.INDEX_OUT_OF_BOUNDS,
        `Seek index must be a finite integer. Received: ${targetIndex}`,
        { targetIndex }
      );
    }

    if (targetIndex < -1 || targetIndex >= this._trace.length) {
      throw new EngineError(
        ErrorCode.INDEX_OUT_OF_BOUNDS,
        `Seek target index ${targetIndex} is out of bounds [-1, ${this._trace.length - 1}].`,
        { targetIndex, validRange: [-1, this._trace.length - 1] }
      );
    }

    // Stop active playback if running
    this._clearScheduledTimer();

    this._currentIndex = targetIndex;

    if (targetIndex === this._trace.length - 1) {
      this._fsm.transition(PlaybackState.COMPLETED, `Seeked to final event (${targetIndex})`);
    } else if (targetIndex === -1) {
      this._fsm.transition(PlaybackState.READY, 'Seeked to initial state (-1)');
    } else {
      if (this._fsm.state !== PlaybackState.PAUSED) {
        this._fsm.transition(PlaybackState.PAUSED, `Seeked to event ${targetIndex}`);
      }
    }

    this._notifyListeners();
    return this.getCurrentState();
  }

  /**
   * Resets the controller back to the initial pre-execution state (-1).
   */
  reset() {
    this._assertNotDisposed('reset');
    this._assertTraceLoaded('reset');
    this._clearScheduledTimer();

    this._currentIndex = -1;
    this._fsm.transition(PlaybackState.READY, 'Reset to initial state');
    this._notifyListeners();
  }

  /**
   * Adjusts playback speed multiplier within documented hard limits.
   *
   * @param {number} multiplier - Positive finite number within [0.05, 20.0]
   */
  setSpeed(multiplier) {
    this._assertNotDisposed('setSpeed');

    if (
      typeof multiplier !== 'number' ||
      !Number.isFinite(multiplier) ||
      multiplier < HARD_LIMITS.MIN_SPEED_MULTIPLIER ||
      multiplier > HARD_LIMITS.MAX_SPEED_MULTIPLIER
    ) {
      throw new EngineError(
        ErrorCode.INVALID_ELEMENT_VALUE,
        `Speed multiplier must be a finite number between ${HARD_LIMITS.MIN_SPEED_MULTIPLIER} and ${HARD_LIMITS.MAX_SPEED_MULTIPLIER}. Received: ${multiplier}`,
        { multiplier, min: HARD_LIMITS.MIN_SPEED_MULTIPLIER, max: HARD_LIMITS.MAX_SPEED_MULTIPLIER }
      );
    }

    this._speedMultiplier = multiplier;

    // Reschedule next tick with updated delay if running
    if (this._fsm.state === PlaybackState.RUNNING && this._activeTimer !== null) {
      this._clearScheduledTimer();
      this._scheduleNextTick();
    }

    this._notifyListeners();
  }

  /**
   * Adjusts base step delay in milliseconds within documented hard limits.
   *
   * @param {number} delayMs - Non-negative integer within [0, 10000]
   */
  setDelay(delayMs) {
    this._assertNotDisposed('setDelay');

    if (
      typeof delayMs !== 'number' ||
      !Number.isFinite(delayMs) ||
      !Number.isInteger(delayMs) ||
      delayMs < HARD_LIMITS.MIN_DELAY_MS ||
      delayMs > HARD_LIMITS.MAX_DELAY_MS
    ) {
      throw new EngineError(
        ErrorCode.INVALID_ELEMENT_VALUE,
        `Delay must be an integer between ${HARD_LIMITS.MIN_DELAY_MS} and ${HARD_LIMITS.MAX_DELAY_MS} ms. Received: ${delayMs}`,
        { delayMs, min: HARD_LIMITS.MIN_DELAY_MS, max: HARD_LIMITS.MAX_DELAY_MS }
      );
    }

    this._baseDelayMs = delayMs;

    if (this._fsm.state === PlaybackState.RUNNING && this._activeTimer !== null) {
      this._clearScheduledTimer();
      this._scheduleNextTick();
    }

    this._notifyListeners();
  }

  /**
   * Returns a complete, immutable snapshot of the current controller state.
   *
   * @returns {object}
   */
  getCurrentState() {
    const isLoaded = Boolean(this._trace);
    const totalEvents = isLoaded ? this._trace.length : 0;
    let currentEvent = null;
    let currentSnapshot = null;

    if (isLoaded) {
      try {
        if (this._currentIndex >= 0) {
          currentEvent = this._trace.getEvent(this._currentIndex);
        }
      } catch {
        currentEvent = null;
      }

      try {
        currentSnapshot = this._trace.getSnapshotAt(this._currentIndex);
      } catch {
        currentSnapshot = null;
      }
    }

    let progress = 0;
    if (isLoaded) {
      if (totalEvents === 0 || this._currentIndex === totalEvents - 1) {
        progress = 1.0;
      } else if (this._currentIndex >= 0) {
        progress = (this._currentIndex + 1) / totalEvents;
      }
    }

    return Object.freeze({
      state: this._fsm.state,
      eventIndex: this._currentIndex,
      currentEvent,
      currentSnapshot,
      totalEvents,
      progress,
      speedMultiplier: this._speedMultiplier,
      effectiveDelayMs: this.effectiveDelayMs,
      isAtStart: this._currentIndex === -1,
      isAtEnd: isLoaded && this._currentIndex === totalEvents - 1
    });
  }

  /**
   * Subscribes a listener callback to controller state updates.
   * The listener is called immediately with the current state upon subscription,
   * and subsequently whenever state or position changes.
   *
   * @param {(state: object) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    this._assertNotDisposed('subscribe');

    if (typeof listener !== 'function') {
      throw new TypeError('Subscriber listener must be a function');
    }

    this._listeners.add(listener);
    // Immediate notification of initial state
    try {
      listener(this.getCurrentState());
    } catch {
      // ignore listener-thrown errors on initial emit
    }

    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Cleans up timers and unregisters all subscribers.
   */
  dispose() {
    this._isDisposed = true;
    this._clearScheduledTimer();
    this._listeners.clear();
    this._trace = null;
    this._currentIndex = -1;
    if (this._fsm.state !== PlaybackState.IDLE) {
      this._fsm.reset(PlaybackState.IDLE);
    }
  }

  // --- Private Helpers ---

  _assertNotDisposed(operationName) {
    if (this._isDisposed) {
      throw new EngineError(
        ErrorCode.INVALID_CONTROLLER_STATE,
        `Cannot execute '${operationName}': PlaybackController has been disposed.`,
        { operation: operationName }
      );
    }
  }

  _assertTraceLoaded(operationName) {
    if (!this._trace) {
      throw new EngineError(
        ErrorCode.INVALID_CONTROLLER_STATE,
        `Cannot execute '${operationName}': No execution trace is currently loaded in the playback controller.`,
        { operation: operationName, state: this._fsm.state }
      );
    }
  }

  _scheduleNextTick() {
    if (this._isDisposed || this._fsm.state !== PlaybackState.RUNNING || !this._trace) {
      return;
    }
    this._clearScheduledTimer();
    this._activeTimer = this._clock.setTimeout(() => {
      this._activeTimer = null;
      this._onTick();
    }, this.effectiveDelayMs);
  }

  _clearScheduledTimer() {
    if (this._activeTimer !== null) {
      this._clock.clearTimeout(this._activeTimer);
      this._activeTimer = null;
    }
  }

  _onTick() {
    if (this._isDisposed || this._fsm.state !== PlaybackState.RUNNING || !this._trace) {
      return;
    }

    if (this._isStepping) {
      return;
    }

    this._isStepping = true;

    try {
      if (this._currentIndex < this._trace.length - 1) {
        this._currentIndex++;

        if (this._currentIndex === this._trace.length - 1) {
          this._fsm.transition(PlaybackState.COMPLETED, 'Reached completion during auto-playback');
          this._notifyListeners();
        } else {
          this._notifyListeners();
          if (!this._isDisposed && this._fsm.state === PlaybackState.RUNNING && this._trace) {
            this._scheduleNextTick();
          }
        }
      } else {
        this._fsm.transition(PlaybackState.COMPLETED, 'Playback finished');
        this._notifyListeners();
      }
    } catch (err) {
      // Timer callback errors must not leave the controller permanently RUNNING
      this._clearScheduledTimer();
      try {
        if (this._fsm.canTransitionTo(PlaybackState.ERROR)) {
          this._fsm.transition(PlaybackState.ERROR, `Tick execution failed: ${err.message}`);
        } else {
          this._fsm.reset(PlaybackState.ERROR);
        }
      } catch {
        this._fsm.reset(PlaybackState.ERROR);
      }
      this._notifyListeners();
    } finally {
      this._isStepping = false;
    }
  }

  _notifyListeners() {
    if (this._isNotifying) {
      this._hasPendingNotification = true;
      return;
    }

    this._isNotifying = true;
    try {
      // Snapshot listeners to handle additions/deletions during dispatch
      const snapshot = Array.from(this._listeners);
      const state = this.getCurrentState();

      for (const listener of snapshot) {
        if (this._isDisposed) {
          break;
        }
        if (!this._listeners.has(listener)) {
          continue;
        }
        try {
          listener(state);
        } catch (err) {
          console.error('PlaybackController subscriber threw an error:', err);
        }
      }
    } finally {
      this._isNotifying = false;
      if (this._hasPendingNotification) {
        this._hasPendingNotification = false;
        this._notifyListeners();
      }
    }
  }
}

