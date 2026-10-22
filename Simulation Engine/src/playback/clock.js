/**
 * Helper to validate timer scheduling parameters.
 * Rejects non-function callbacks, non-finite values, negatives, and fractional delays.
 *
 * @param {unknown} callback
 * @param {unknown} delayMs
 * @param {string} clockName
 * @throws {TypeError}
 */
function assertValidTimeoutArgs(callback, delayMs, clockName) {
  if (typeof callback !== 'function') {
    throw new TypeError(`${clockName}.setTimeout callback must be a function. Received: ${typeof callback}`);
  }
  if (
    typeof delayMs !== 'number' ||
    !Number.isFinite(delayMs) ||
    !Number.isInteger(delayMs) ||
    delayMs < 0
  ) {
    throw new TypeError(
      `${clockName}.setTimeout delay must be a non-negative finite integer (whole milliseconds). Received: ${String(delayMs)}`
    );
  }
}

/**
 * Production clock implementation using standard runtime timers.
 */
export class RealClock {
  /**
   * Schedules callback execution after delayMs.
   *
   * @param {() => void} callback
   * @param {number} delayMs
   * @returns {ReturnType<typeof setTimeout>}
   */
  setTimeout(callback, delayMs) {
    assertValidTimeoutArgs(callback, delayMs, 'RealClock');
    return globalThis.setTimeout(callback, delayMs);
  }

  /**
   * Cancels previously scheduled timer.
   *
   * @param {ReturnType<typeof setTimeout>} handle
   */
  clearTimeout(handle) {
    globalThis.clearTimeout(handle);
  }

  /**
   * Returns current real timestamp in milliseconds.
   *
   * @returns {number}
   */
  now() {
    return Date.now();
  }
}

/**
 * Deterministic virtual clock for unit and integration testing.
 * Advances simulated time and executes scheduled callbacks synchronously.
 */
export class VirtualClock {
  constructor() {
    this.currentTime = 0;
    this.timers = new Map();
    this.nextTimerId = 1;
  }

  /**
   * Schedules callback at simulated time (currentTime + delayMs).
   *
   * @param {() => void} callback
   * @param {number} delayMs - Non-negative integer milliseconds
   * @returns {number} Timer ID
   */
  setTimeout(callback, delayMs) {
    assertValidTimeoutArgs(callback, delayMs, 'VirtualClock');
    const id = this.nextTimerId++;
    const dueTime = this.currentTime + delayMs;
    this.timers.set(id, { id, callback, dueTime });
    return id;
  }

  /**
   * Cancels scheduled virtual timer.
   *
   * @param {number} id
   */
  clearTimeout(id) {
    this.timers.delete(id);
  }

  /**
   * Returns current virtual time in milliseconds.
   *
   * @returns {number}
   */
  now() {
    return this.currentTime;
  }

  /**
   * Returns true if there are pending scheduled timers.
   *
   * @returns {boolean}
   */
  hasPending() {
    return this.timers.size > 0;
  }

  /**
   * Returns count of scheduled pending timers.
   *
   * @returns {number}
   */
  pendingCount() {
    return this.timers.size;
  }

  /**
   * Advances virtual time by ms, synchronously firing all callbacks whose
   * dueTime has arrived in chronological order.
   *
   * @param {number} ms - Non-negative integer milliseconds to advance
   * @returns {number} Total callbacks executed
   */
  tick(ms) {
    if (typeof ms === 'number' && Number.isFinite(ms) && ms < 0) {
      throw new RangeError(`Cannot advance virtual clock backward: ${ms}`);
    }
    if (typeof ms !== 'number' || !Number.isFinite(ms) || !Number.isInteger(ms)) {
      throw new TypeError(`tick ms must be a non-negative finite integer (whole milliseconds). Received: ${String(ms)}`);
    }

    const targetTime = this.currentTime + ms;
    let executedCount = 0;

    while (this.timers.size > 0) {
      // Find eligible timers with dueTime <= targetTime
      const eligible = Array.from(this.timers.values())
        .filter((t) => t.dueTime <= targetTime)
        .sort((a, b) => a.dueTime - b.dueTime || a.id - b.id);

      if (eligible.length === 0) {
        break;
      }

      // Execute earliest due timer
      const earliest = eligible[0];
      this.timers.delete(earliest.id);
      this.currentTime = earliest.dueTime;
      executedCount++;
      earliest.callback();
    }

    this.currentTime = targetTime;
    return executedCount;
  }

  /**
   * Executes all scheduled timers until queue is empty or maxSteps reached.
   *
   * @param {number} [maxSteps=10000]
   * @returns {number} Total callbacks executed
   */
  runAll(maxSteps = 10000) {
    if (
      typeof maxSteps !== 'number' ||
      !Number.isFinite(maxSteps) ||
      !Number.isInteger(maxSteps)
    ) {
      throw new TypeError(`runAll maxSteps must be a positive finite integer. Received: ${String(maxSteps)}`);
    }
    if (maxSteps <= 0) {
      throw new RangeError(`runAll maxSteps must be greater than zero. Received: ${maxSteps}`);
    }

    let steps = 0;
    while (this.timers.size > 0 && steps < maxSteps) {
      const eligible = Array.from(this.timers.values()).sort(
        (a, b) => a.dueTime - b.dueTime || a.id - b.id
      );
      const next = eligible[0];
      this.timers.delete(next.id);
      this.currentTime = next.dueTime;
      steps++;
      next.callback();
    }
    return steps;
  }

  /**
   * Resets virtual clock state and clears all pending timers.
   */
  reset() {
    this.currentTime = 0;
    this.timers.clear();
    this.nextTimerId = 1;
  }
}

