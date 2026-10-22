# Virtual CSE Lab — Simulation Engine Contract

## Document Overview
- **Document Version:** 1.0.0
- **Scope:** Milestone 1 — Simulation Engine Core
- **Target Platform:** Node.js (ESM), Web Browsers (ESM)
- **Status:** Approved Architecture Contract
- **Date:** October 18, 2026

---

## 1. Algorithm Input Contract

The simulation engine executes pure algorithm simulations on numerical array data. All sorting algorithms implemented within this engine adhere to the uniform input contract.

### 1.1 Signature
```typescript
function runAlgorithm(input: number[], options?: AlgorithmOptions): ExecutionTrace
```

### 1.2 Input Invariants
1. **Type:** The input must strictly be a standard JavaScript `Array` (`Array.isArray(input) === true`).
2. **Element Types:** Every element in the input array must be a finite numerical primitive (`typeof x === 'number' && Number.isFinite(x)`).
3. **Disallowed Values:**
   - `NaN`
   - `+Infinity` / `-Infinity`
   - `null` / `undefined`
   - Strings, booleans, objects, symbols, or functions
   - Sparse arrays or unassigned array slots (`[1, , 3]`)
4. **Size Constraints:**
   - Minimum length: `0` (empty arrays are valid inputs).
   - Maximum length: `MAX_ARRAY_SIZE` (default: `100` elements for Milestone 1).
   - Attempting to pass an array exceeding `MAX_ARRAY_SIZE` triggers a synchronous validation `EngineError`.
5. **Caller Immutability:**
   - Algorithm execution **must never** mutate the caller-provided array.
   - Algorithms must create an isolated working copy immediately upon receiving the input.
   - The original input reference is frozen or defensively cloned to guarantee zero side-effects.

---

## 2. Event Schema and Permitted Event Types

Algorithm execution produces an ordered, contiguous, discrete stream of immutable **Events**. The event sequence constitutes the complete educational representation of the algorithm.

### 2.1 Permitted Event Types
| Event Type | Category | Semantic Meaning | Required Payload Fields |
|---|---|---|---|
| `ALGORITHM_START` | Lifecycle | Emitted once before any algorithm iterations begin. | `array`, `totalElements` |
| `PASS_START` | Flow | Marks the beginning of an iteration pass over the array. | `pass`, `unsortedBound` (Bubble Sort) or `startIndex`, `remainingElements` (Selection Sort) |
| `CANDIDATE_SELECT` | Candidate Tracking | Identifies initial candidate minimum element for current selection pass. | `pass`, `minIndex`, `minValue`, `candidateIndex`, `candidateValue` |
| `COMPARE` | Operation | Two elements (adjacent in Bubble Sort; candidate vs candidate in Selection Sort) are compared. | `indices: [i, j]` or `candidateIndex`, `compareIndex`, `values` / `valuesBefore`, `shouldSwap` / `isSmaller` |
| `CANDIDATE_UPDATE` | Candidate Tracking | A strictly smaller element is discovered; updates current minimum candidate. | `pass`, `previousMinIndex`, `previousMinValue`, `newMinIndex`, `newMinValue` |
| `SWAP` | Mutation | Two elements are exchanged into sorted position. | `indices: [i, j]`, `valuesBefore: [a, b]`, `valuesAfter: [b, a]` |
| `NO_SWAP` | Operation | Element is already at its sorted position; swap skipped. | `indices: [i, j]` or `index: i`, `value: a` |
| `PASS_COMPLETE` | Flow | Current pass has finished; an element has reached its final sorted position. | `pass`, `lockedIndex`, `swapsInPass` |
| `ALGORITHM_COMPLETE` | Lifecycle | Sorting complete; all elements verified in sorted order. | `sortedArray`, `totalComparisons`, `totalSwaps`, `totalPasses` |

### 2.2 Event Object Schema
Every event conforms to the following strict shape:
```typescript
interface SimulationEvent {
  /** Sequential, 0-indexed integer identifying the event position in the trace */
  id: number;
  /** 1-indexed human-readable step number for educational interfaces */
  step: number;
  /** Standardized event classification */
  type: EventType;
  /** High-level educational narrative explaining the step */
  description: string;
  /** Structured, event-specific data payload */
  payload: Readonly<Record<string, unknown>>;
  /** State snapshot of the array immediately following this event */
  arraySnapshot: readonly number[];
  /** Indices of elements currently active or highlighted in this event */
  activeIndices: readonly number[];
  /** Indices of elements permanently locked into their final sorted positions */
  lockedIndices: readonly number[];
  /** Cumulative metrics up to and including this event */
  metrics: {
    comparisons: number;
    swaps: number;
    passes: number;
    candidateUpdates?: number;
  };
  /** Optional validated event-to-code mapping contract */
  codeMapping?: CodeMapping;
}
```

### 2.3 Event Immutability
All event instances, payloads, `arraySnapshot` arrays, index lists, and `codeMapping` objects must be deeply frozen using `Object.freeze()` prior to leaving the engine boundary. Consumers may inspect event properties but cannot mutate them.

### 2.4 Event-to-Code Mapping Contract
The engine defines a strictly validated, deeply frozen schema associating each discrete simulation event with corresponding pseudocode or source lines:

```typescript
interface CodeMapping {
  /** Primary 1-based pseudocode line number (strict positive integer >= 1) */
  line: number;
  /** Concise educational explanation of the operation executed on this line */
  explanation: string;
  /** Optional array of associated line numbers (must contain primary line, positive integers >= 1) */
  lines?: readonly number[];
  /** Optional structured runtime variable evaluation snapshot (immutable dictionary) */
  variables?: Readonly<Record<string, unknown>>;
}
```

#### Line-Numbering Convention
- **1-Based Indexing:** Standardized on 1-based positive integers (`line >= 1`), matching standard IDE line displays, textbooks, and editor line gutters. Line 0 or negative integers are strictly rejected.
- **Single vs Multi-line:** Every event designates a single primary execution `line`. If an event represents a compound construct (e.g. a condition and action), `lines: [line, ...]` provides all associated lines, but MUST include the primary `line`.
- **Validation:** Enforced via `validateCodeMapping(mapping, context)`. Invalid lines (`NaN`, `<= 0`, fractional, non-finite), line numbers exceeding the algorithm's pseudocode length (e.g., `line: 999`, or `line > 8` for Bubble Sort, `line > 11` for Selection Sort), empty explanations, malformed arrays, out-of-range elements in the `lines` array, or non-object variables immediately throw `EngineError` with `ErrorCode.INVALID_CODE_MAPPING`. Recognized algorithms (`bubbleSort`, `selectionSort`) are authoritative and cannot be overridden by arbitrary `maxLines`; conflicting `maxLines` or pseudocode arrays are strictly rejected. Generic custom-pseudocode contexts without a recognized algorithm allow explicit `maxLines` and/or `pseudocode` arrays provided they do not conflict.
- **Frontend Pseudocode Highlighting:**
  Frontends consume the exported pseudocode registry (`ALGORITHM_PSEUDOCODE`, `BUBBLE_SORT_PSEUDOCODE`, `SELECTION_SORT_PSEUDOCODE`) containing `{ line: number, text: string }`. As the playback controller emits state updates, the frontend highlights line `state.currentEvent.codeMapping.line`, renders `codeMapping.explanation` in the narration banner, and displays `codeMapping.variables` in an inspector panel.


---

## 3. State Snapshot Schema and Immutability Requirements

The engine provides continuous historical state reconstruction across all points in time.

### 3.1 Snapshot Schema
```typescript
interface StateSnapshot {
  /** Event index associated with this snapshot (-1 indicates initial pre-execution state) */
  eventIndex: number;
  /** Readonly copy of the array elements at this point in execution */
  array: readonly number[];
  /** Array indices currently being actively examined, compared, or swapped */
  activeIndices: readonly number[];
  /** Array indices confirmed to be in their final sorted order */
  lockedIndices: readonly number[];
  /** Cumulative metrics up to and including this snapshot */
  metrics: {
    comparisons: number;
    swaps: number;
    passes: number;
  };
}
```

### 3.2 Immutability Guarantees
1. Snapshots returned by `trace.getSnapshotAt(index)` or the playback controller are frozen.
2. Modifying an element of a retrieved snapshot array throws a `TypeError` in strict mode.
3. Internal engine array operations always create new array allocations or apply isolated in-place changes on local copies before capturing frozen snapshots.
4. `deepFreeze(obj)` recursively traverses all properties even if an ancestor object was already shallow-frozen, and employs a `WeakSet` to prevent infinite recursion on circular or DAG references.
5. Unsupported mutable collection types (e.g. `Map`, `Set`, `WeakMap`, `WeakSet`) retain internal state semantics and must not be used in serialized simulation execution traces.

---

## 4. Deterministic Replay, Event Ordering, and Independent Verification

Determinism is the foundational invariant of the educational simulation engine.

### 4.1 Determinism Invariant
> Given identical input array elements $[a_0, a_1, \dots, a_{n-1}]$ and identical algorithm configuration, the engine will **always** produce:
> 1. The exact same number of events.
> 2. The exact same sequence of event types.
> 3. Identical payload values and descriptions for every event index.
> 4. Identical intermediate snapshots at every event index.

### 4.2 Event Ordering Constraints
1. Event IDs must be strictly monotonically increasing integers without gaps: `event[k].id === k`.
2. Step numbers must be 1-based sequential integers: `event[k].step === k + 1`.
3. `ALGORITHM_START` is always the first event (`id === 0`) and cannot appear anywhere else.
4. `ALGORITHM_COMPLETE` is always the final event (`id === events.length - 1`) and cannot appear prematurely.
5. For $n \le 1$, the event sequence consists of `ALGORITHM_START` followed immediately by `ALGORITHM_COMPLETE`.
6. Every `SWAP` event must be directly preceded by a `COMPARE` event referencing the exact same indices with `shouldSwap: true`.
7. Every `NO_SWAP` event must be directly preceded by a `COMPARE` event referencing the exact same indices with `shouldSwap: false`.
8. A `PASS_COMPLETE` event must reference the index of the newly locked element, which subsequently remains present in `lockedIndices` monotonically across all future events.
9. Metrics (`comparisons`, `swaps`, `passes`) must be non-decreasing across the entire event stream.

### 4.3 Independent Trace Reconstruction & Complete Payload Validation
`ExecutionTrace.validate()` does not trust recorded snapshots or descriptions as proof of algorithmic correctness. It derives expected values strictly from the initial array and independently reconstructed execution state:

#### Bubble Sort Validation
1. **Initial Payload (`ALGORITHM_START`):** `payload.array` must strictly equal `initialArray` element-by-element, and `payload.totalElements` must equal `initialArray.length`.
2. **Pass Start (`PASS_START`):** `payload.pass` must equal the 0-indexed pass counter, and `payload.unsortedBound` must strictly equal `N - 1 - pass`.
3. **Comparison Adjacency & Values (`COMPARE`):** `payload.indices` must be strictly adjacent (`indices[1] === indices[0] + 1`) within the current unsorted bound; `payload.values` must match the current reconstructed array state; and `payload.shouldSwap` must strictly equal (`values[0] > values[1]`).
4. **Swap Integrity (`SWAP`):** Must immediately follow a `COMPARE` event requiring a swap (`shouldSwap: true`). `payload.indices` and `payload.valuesBefore` must match the preceding comparison and the array state prior to the swap; `payload.valuesAfter` must reflect the inverted values. The swap mutation is applied to the reconstructed array.
5. **No-Swap Integrity (`NO_SWAP`):** Must immediately follow a `COMPARE` event requiring no swap (`shouldSwap: false`), with matching indices and values.
6. **Pass Completion (`PASS_COMPLETE`):** `payload.pass` must equal the current pass number; `payload.lockedIndex` must equal `N - 1 - pass`; `payload.swapsInPass` must equal the count of swaps observed in that pass; and `lockedIndices` must monotonically include `lockedIndex`.
7. **Final Payload (`ALGORITHM_COMPLETE`):** `payload.sortedArray` must strictly equal the reconstructed array; `payload.totalComparisons`, `payload.totalSwaps`, and `payload.totalPasses` must match accumulated counts.

#### Selection Sort Validation
1. **Pass Start (`PASS_START`):** `payload.pass` must equal `currentPass`, and `payload.startIndex` must equal `currentPass`.
2. **Initial Candidate Selection (`CANDIDATE_SELECT`):** Must begin each pass with candidate index equal to `currentPass` and candidate value matching `reconstructed[currentPass]`.
3. **Scan Comparisons (`COMPARE`):** Must compare `selCurrentCandidate` with each sequential `j` from `currentPass + 1` to `N - 1`. `payload.isSmaller` must strictly match `(reconstructed[j] < reconstructed[selCurrentCandidate])`.
4. **Candidate Update (`CANDIDATE_UPDATE`):** Emitted strictly when `isSmaller === true`. `previousMinIndex` must match the old candidate and `newMinIndex` must equal `j`.
5. **Pass Resolution (`SWAP` vs `NO_SWAP`):**
   - If `minIdx !== currentPass`, a `SWAP` event must be emitted exchanging elements at indices `[currentPass, minIdx]`.
   - If `minIdx === currentPass`, a `NO_SWAP` event must be emitted for index `currentPass`.
6. **Pass Completion (`PASS_COMPLETE`):** Locked index `currentPass` is added to `lockedIndices` monotonically.
7. **Algorithm Completion (`ALGORITHM_COMPLETE`):** All indices `[0, ..., N - 1]` are verified locked, final array is sorted, and metrics match accumulated counters.

#### Universal Trace Invariants
- **Code Mapping Invariant:** If `codeMapping` is present on an event, it is verified via `validateCodeMapping()` with explicit algorithm context (1-based integer line `1 <= line <= maxLines`, non-empty explanation, valid lines array containing integers within `[1, maxLines]`, and valid variables object). Line numbers exceeding the algorithm's pseudocode length (e.g. line 999) are strictly rejected.
- **Strict Finite-Integer Validation:** All numeric indices, pass counts, swap counts, comparison counts, and element counters are validated using strict finite-integer assertions (`typeof x === 'number' && Number.isFinite(x) && Number.isInteger(x)`).
- **Trace Metrics Invariant:** Trace-level `metrics.totalComparisons`, `metrics.totalSwaps`, `metrics.totalPasses`, and optional `metrics.totalCandidateUpdates` must strictly equal accumulated totals.

---

## 5. Input Validation and Resource Ceilings

The engine enforces defensive validation to guarantee termination, bound memory consumption, and safeguard host runtimes.

### 5.1 Validation Rules
- **Non-Array Input:** Rejected with `INVALID_INPUT_TYPE`.
- **Exceeded Array Length:** Inputs with `length > maxArraySize` are rejected with `INPUT_SIZE_EXCEEDED`.
- **Invalid Number Elements:** Elements containing `NaN`, `Infinity`, strings, objects, or `undefined` are rejected with `INVALID_ELEMENT_VALUE`.
- **Option Validation:** Caller options are validated via `validateAlgorithmOptions()`. Non-integer, negative, or non-finite option values are rejected with `INVALID_INPUT_TYPE`.
- **Index Arguments:** All methods accepting indices (`getEvent(index)`, `getSnapshotAt(eventIndex)`, `reconstructState(targetIndex)`, `seek(targetIndex)`) require finite integers (`Number.isInteger(x)`). Fractional numbers (`1.5`), `NaN`, infinities, strings, and out-of-bounds values throw structured `INDEX_OUT_OF_BOUNDS` errors.
- **Clock Schedulers:** Both `RealClock.setTimeout()` and `VirtualClock.setTimeout()` enforce that `callback` is a function and `delayMs` is a non-negative finite integer (`delayMs >= 0 && Number.isInteger(delayMs)`). Fractional milliseconds, negative numbers, `NaN`, and infinities are rejected with `TypeError` and are never silently converted into zero-delay timers. `VirtualClock.tick(ms)` requires non-negative finite integer milliseconds; `runAll(maxSteps)` requires positive finite integer steps.

### 5.2 Resource Limits & Absolute Ceilings
Callers cannot override resource ceilings via options to disable memory or execution protections.

| Resource / Parameter | Default | Hard Ceiling (`HARD_LIMITS`) | Behavior on Breach |
|---|---|---|---|
| Array Size (`maxArraySize`) | 100 elements | 100 elements | Synchronous rejection with `INPUT_SIZE_EXCEEDED` before execution begins. |
| Event Count (`maxEvents`) | 50,000 events | 50,000 events | Execution halts with `EVENT_LIMIT_EXCEEDED`. Never silently truncated. |
| Speed Multiplier (`speed`) | 1.0x | [0.05x, 20.0x] | Rejection with `INVALID_ELEMENT_VALUE`. |
| Delay Interval (`delayMs`) | 300 ms | [0 ms, 10,000 ms] | Rejection with `INVALID_ELEMENT_VALUE`. |

### 5.3 Memory Scaling Boundary
For an array of $N=100$ items, worst-case Bubble Sort generates $\approx 10,000$ events. Storing full array snapshots for $10^4$ events is estimated roughly at $\approx 10^4 \times 100 \times 8 \text{ bytes} \approx 8 \text{ MB}$ for the numerical snapshot arrays alone.

> [!NOTE]
> This $\approx 8\text{ MB}$ calculation is a rough theoretical lower bound for the raw snapshot array payload data rather than a measured total process/runtime memory figure. Total runtime heap consumption includes V8 object header overhead, string descriptions, event metadata structures, and closure contexts. The hard ceiling of $N=100$ ensures that even with total runtime overhead, memory consumption remains safely within modest browser and Node.js heap limits.

---

## 6. Error Handling and Cancellation Behavior

All errors originating inside the simulation engine are instances of `EngineError`.

### 6.1 `EngineError` Structure
```typescript
class EngineError extends Error {
  readonly code: ErrorCode;
  readonly details: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}
```

### 6.2 Standard Error Codes
- `INVALID_INPUT_TYPE`: Caller provided a non-array input or invalid option types.
- `INPUT_SIZE_EXCEEDED`: Array length or requested maxArraySize exceeds configured or hard ceiling.
- `INVALID_ELEMENT_VALUE`: Non-finite or non-numeric element detected, or speed/delay outside allowed range.
- `EVENT_LIMIT_EXCEEDED`: Algorithm loop generated more than maximum allowed events.
- `INVALID_CONTROLLER_STATE`: Illegal playback command issued in current controller state or called on a disposed controller.
- `INDEX_OUT_OF_BOUNDS`: Index argument is not a finite integer or is out of bounds.
- `TRACE_INTEGRITY_VIOLATION`: Event sequence corrupted, missing IDs, disordered, invalid payload, tampered snapshots, or permutation corrupted.
- `INVALID_CODE_MAPPING`: Code mapping schema violated (line < 1, missing explanation, invalid lines or variables).

### 6.3 Controller Lifecycle: Uninitialized vs Disposed Controllers
The engine establishes a strict architectural distinction between an uninitialized controller and a disposed controller:

1. **Uninitialized Controller (`state === IDLE`, `trace === null`, `isDisposed === false`):**
   - Created when calling `new PlaybackController()` without a trace argument.
   - Playback navigation operations (`play()`, `stepForward()`, `stepBackward()`, `seek()`, `reset()`) throw `INVALID_CONTROLLER_STATE` because no trace is currently loaded.
   - The controller is fully viable and can be initialized by calling `loadTrace(trace)`.
   - `loadTrace()` transactionally validates the candidate trace: if valid, the controller transitions from `IDLE` to `READY` with `currentIndex === -1`. If invalid, `loadTrace()` throws `TRACE_INTEGRITY_VIOLATION` and the controller remains in `IDLE`.

2. **Disposed Controller (`state === IDLE`, `trace === null`, `isDisposed === true`):**
   - Created when `controller.dispose()` is invoked.
   - Immediately cancels active timers, unregisters all subscribers, clears the loaded trace, and resets internal state to `IDLE`.
   - The controller is permanently deactivated. Calling ANY method (`loadTrace()`, `subscribe()`, `play()`, `stepForward()`, `stepBackward()`, `seek()`, `reset()`, `setSpeed()`, `setDelay()`) throws `INVALID_CONTROLLER_STATE` ("Cannot execute '...': PlaybackController has been disposed.").
   - A disposed controller cannot be re-loaded or resurrected under any circumstances.

3. **No-Advancement Guarantee:**
   - No timers or playback steps can advance after `pause()`, `reset()`, `loadTrace()`, or `dispose()`.
   - Scheduled clock callbacks are actively cleared, preventing orphaned callbacks or state corruptions.


---

## 7. Playback Controller State Transitions

The playback controller is a deterministic finite-state machine governing temporal navigation over a precomputed `ExecutionTrace`.

### 7.1 State Definitions
- `IDLE`: Controller initialized without an active trace.
- `READY`: Trace loaded, reset to initial position (-1), ready to play or step.
- `RUNNING`: Timer actively advancing playback step by step.
- `PAUSED`: Playback halted at an intermediate or initial event index.
- `COMPLETED`: Playback has reached the final event (`ALGORITHM_COMPLETE`).
- `ERROR`: An unrecoverable controller fault occurred.

### 7.2 State Transition Matrix
| Current State | Permitted Transitions | Triggers |
|---|---|---|
| `IDLE` | `READY` | `loadTrace(trace)` |
| `READY` | `RUNNING`, `PAUSED`, `COMPLETED` | `play()` $\to$ `RUNNING`<br>`stepForward()` $\to$ `PAUSED` (or `COMPLETED` if 0-step trace)<br>`seek(idx)` $\to$ `PAUSED` (or `COMPLETED` if at end) |
| `RUNNING` | `PAUSED`, `COMPLETED`, `READY` | `pause()` $\to$ `PAUSED`<br>Last step reached $\to$ `COMPLETED`<br>`reset()` $\to$ `READY` |
| `PAUSED` | `RUNNING`, `PAUSED`, `COMPLETED`, `READY` | `play()` $\to$ `RUNNING`<br>`stepForward()` $\to$ `PAUSED` / `COMPLETED`<br>`stepBackward()` $\to$ `PAUSED`<br>`seek(idx)` $\to$ `PAUSED` / `COMPLETED`<br>`reset()` $\to$ `READY` |
| `COMPLETED` | `READY`, `PAUSED` | `reset()` $\to$ `READY`<br>`stepBackward()` $\to$ `PAUSED`<br>`seek(idx < last)` $\to$ `PAUSED` |
| `ERROR` | `READY`, `IDLE` | `loadTrace(trace)` $\to$ `READY`<br>`reset()` $\to$ `IDLE` |

---

## 8. Separation of Algorithm Computation and Playback Timing

A critical design requirement of this simulation engine is the strict decoupling between:
1. **Algorithm Computation:** Pure, synchronous generation of the complete `ExecutionTrace`.
2. **Playback Timing:** Asynchronous progression through the pre-computed trace using configurable delay intervals.

```
┌────────────────────────────────────────────────────────┐
│               1. Algorithm Execution                   │
│   Input: number[] ──► bubbleSort() ──► ExecutionTrace  │
│   (Pure, synchronous, zero timers, zero animation)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               2. Playback Controller                   │
│   ExecutionTrace ──► PlaybackController(trace, clock)  │
│   - Injectable Clock / Scheduler                       │
│   - Step Forward / Step Backward / Seek                │
│   - Play / Pause / Speed Adjustment                    │
└────────────────────────────────────────────────────────┘
```

**Benefits of this separation:**
- Algorithm correctness is 100% testable without timers, promises, or async waiting.
- Playback speed (0.5x, 1x, 2x, 10x) has **zero impact** on algorithmic behavior.
- Instant scrubbing/seeking backwards and forwards is $O(1)$ without re-running the algorithm.
- Unit tests run thousands of operations in milliseconds using a virtual clock.

---

## 9. Public API for Consumers

Consumers (such as React components, UI renderers, or CLI scripts) interact with the simulation engine through the following exported surface from `src/index.js`:

```javascript
// Algorithms
import { bubbleSort, selectionSort } from 'virtual-cse-lab-simulation-engine';

// Core abstractions, models, and validation
import {
  ExecutionTrace,
  validateInputArray,
  validateAlgorithmOptions,
  validateCodeMapping,
  EngineError,
  deepFreeze,
  EventType,
  PlaybackState,
  ErrorCode,
  DEFAULT_CONFIG,
  HARD_LIMITS,
  BUBBLE_SORT_PSEUDOCODE,
  SELECTION_SORT_PSEUDOCODE,
  ALGORITHM_PSEUDOCODE
} from 'virtual-cse-lab-simulation-engine';

// Playback & Timing
import {
  PlaybackController,
  RealClock,
  VirtualClock,
  PlaybackStateMachine
} from 'virtual-cse-lab-simulation-engine';
```

---

## 10. Test Strategy and Known Limitations

### 10.1 Testing Strategy
1. **Validation Tests:** Verify boundary sizes, element types, non-finite values, and non-array types.
2. **Algorithm Correctness:** Test all edge cases (empty, single-element, duplicates, negative values, sorted, reverse-sorted).
3. **Invariance & Property Tests:** Verify that for all valid inputs:
   - Output array is sorted in ascending order.
   - Output array is a permutation of input (multiset equality).
   - Original caller array reference is strictly unmutated.
4. **Deterministic Replay Tests:** Multiple runs with identical inputs produce identical event streams.
5. **Reconstruction Bidirectionality:** Stepping forward and backward restores identical snapshots.
6. **Controller State Machine Tests:** Verify every valid transition, reject illegal transitions, test timer scheduling via `VirtualClock`.

### 10.2 Milestone Status & Test Suite (Milestone 2A)
- **Algorithms Supported:** Bubble Sort (`bubbleSort`) and Selection Sort (`selectionSort`).
- **Event-to-Code Mapping:** Fully supported, 1-based, verified, and deeply immutable across all Bubble Sort and Selection Sort events.
- **Test Suite Verification:** 206 unit and integration tests executing and passing with zero failures.
- **Measured Coverage:** 87.45% Statements, 84.11% Branches, 95.94% Functions, 87.25% Lines.
- **Known Limitations:**
  - Single-Threaded: Execution takes place on the main JS thread; web worker offloading is deferred.
  - In-Memory Trace Storage: All events and snapshots reside in memory, appropriate for $n \le 100$.
  - Additional algorithms (Insertion Sort, Merge Sort, Quick Sort, Binary Search) are scheduled for subsequent milestones.
