import { ErrorCode, DEFAULT_CONFIG, HARD_LIMITS, ALGORITHM_PSEUDOCODE } from './types.js';
import { EngineError } from './errors.js';
import { deepFreeze } from './freeze.js';

/**
 * Validates algorithm configuration options against boundary limits and hard ceilings.
 *
 * @param {unknown} [options] - Options object containing maxArraySize and/or maxEvents
 * @returns {Readonly<{ maxArraySize: number, maxEvents: number }>} Validated options
 * @throws {EngineError} If options is invalid or exceeds hard resource ceilings
 */
export function validateAlgorithmOptions(options = {}) {
  if (options !== null && typeof options !== 'object' && typeof options !== 'undefined') {
    throw new EngineError(
      ErrorCode.INVALID_INPUT_TYPE,
      `Options argument must be an object if provided. Received: ${typeof options}`,
      { received: options }
    );
  }

  const opts = (options && typeof options === 'object') ? options : {};

  let maxArraySize = DEFAULT_CONFIG.MAX_ARRAY_SIZE;
  if (opts.maxArraySize !== undefined) {
    if (
      typeof opts.maxArraySize !== 'number' ||
      !Number.isFinite(opts.maxArraySize) ||
      !Number.isInteger(opts.maxArraySize) ||
      opts.maxArraySize < 0
    ) {
      throw new EngineError(
        ErrorCode.INVALID_INPUT_TYPE,
        `Option 'maxArraySize' must be a non-negative finite integer. Received: ${opts.maxArraySize}`,
        { maxArraySize: opts.maxArraySize }
      );
    }
    if (opts.maxArraySize > HARD_LIMITS.MAX_ARRAY_SIZE) {
      throw new EngineError(
        ErrorCode.INPUT_SIZE_EXCEEDED,
        `Requested maxArraySize (${opts.maxArraySize}) exceeds engine hard ceiling of ${HARD_LIMITS.MAX_ARRAY_SIZE}.`,
        { maxArraySize: opts.maxArraySize, hardCeiling: HARD_LIMITS.MAX_ARRAY_SIZE }
      );
    }
    maxArraySize = opts.maxArraySize;
  }

  let maxEvents = DEFAULT_CONFIG.MAX_EVENTS;
  if (opts.maxEvents !== undefined) {
    if (
      typeof opts.maxEvents !== 'number' ||
      !Number.isFinite(opts.maxEvents) ||
      !Number.isInteger(opts.maxEvents) ||
      opts.maxEvents <= 0
    ) {
      throw new EngineError(
        ErrorCode.INVALID_INPUT_TYPE,
        `Option 'maxEvents' must be a positive finite integer. Received: ${opts.maxEvents}`,
        { maxEvents: opts.maxEvents }
      );
    }
    if (opts.maxEvents > HARD_LIMITS.MAX_EVENTS) {
      throw new EngineError(
        ErrorCode.EVENT_LIMIT_EXCEEDED,
        `Requested maxEvents (${opts.maxEvents}) exceeds engine hard ceiling of ${HARD_LIMITS.MAX_EVENTS}.`,
        { maxEvents: opts.maxEvents, hardCeiling: HARD_LIMITS.MAX_EVENTS }
      );
    }
    maxEvents = opts.maxEvents;
  }

  return Object.freeze({
    maxArraySize,
    maxEvents
  });
}

/**
 * Validates and freezes an input array for algorithm simulation.
 *
 * @param {unknown} input - Candidate array of finite numbers
 * @param {object} [options]
 * @param {number} [options.maxArraySize=100] - Maximum allowed length
 * @returns {readonly number[]} Frozen defensive copy of the validated array
 * @throws {EngineError} If input fails validation constraints
 */
export function validateInputArray(input, options = {}) {
  const { maxArraySize } = validateAlgorithmOptions(options);

  // 1. Must be a standard JavaScript Array
  if (!Array.isArray(input)) {
    throw new EngineError(
      ErrorCode.INVALID_INPUT_TYPE,
      `Algorithm input must be a JavaScript Array. Received: ${typeof input}`,
      { receivedType: typeof input }
    );
  }

  // 2. Length boundary check
  if (input.length > maxArraySize) {
    throw new EngineError(
      ErrorCode.INPUT_SIZE_EXCEEDED,
      `Input array length (${input.length}) exceeds maximum permitted size of ${maxArraySize} elements.`,
      { length: input.length, maxArraySize }
    );
  }

  // 3. Element-by-element verification
  for (let i = 0; i < input.length; i++) {
    // Detect sparse array holes (e.g. [1, , 3])
    if (!(i in input)) {
      throw new EngineError(
        ErrorCode.INVALID_ELEMENT_VALUE,
        `Array contains an unassigned or sparse slot at index ${i}.`,
        { index: i }
      );
    }

    const val = input[i];

    // Must be a finite numerical primitive (rejects NaN, Infinity, strings, objects, etc.)
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new EngineError(
        ErrorCode.INVALID_ELEMENT_VALUE,
        `Element at index ${i} must be a finite number. Received: ${String(val)} (${typeof val})`,
        { index: i, value: val, type: typeof val }
      );
    }
  }

  // Return deeply frozen defensive copy
  return Object.freeze([...input]);
}

/**
 * Resolves the maximum pseudocode line boundary from contextual metadata.
 * Precedence and consistency rules:
 * 1. Recognized algorithms (e.g. bubbleSort, selectionSort in ALGORITHM_PSEUDOCODE)
 *    are authoritative. Their registered pseudocode length cannot be overridden by maxLines.
 * 2. If maxLines or pseudocode array is provided alongside a recognized algorithm,
 *    it must match the registered length; conflicting values are rejected with EngineError.
 * 3. Generic custom-pseudocode contexts (without a recognized algorithm) allow explicit
 *    maxLines and/or pseudocode array. If both are provided, they must agree.
 *
 * @param {unknown} context
 * @returns {{ maxLines: number | undefined, algorithm: string | undefined }}
 * @throws {EngineError} If contradictory pseudocode boundary configuration is detected
 */
export function resolvePseudocodeBoundary(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return { maxLines: undefined, algorithm: undefined };
  }

  // Validate maxLines if explicitly provided
  if (context.maxLines !== undefined) {
    if (
      typeof context.maxLines !== 'number' ||
      !Number.isFinite(context.maxLines) ||
      !Number.isInteger(context.maxLines) ||
      context.maxLines <= 0
    ) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Context 'maxLines' must be a positive finite integer. Received: ${String(context.maxLines)}`,
        { ...context, maxLines: context.maxLines }
      );
    }
  }

  // Validate pseudocode array if explicitly provided
  if (context.pseudocode !== undefined) {
    if (!Array.isArray(context.pseudocode) || context.pseudocode.length === 0) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Context 'pseudocode' must be a non-empty array if provided. Received: ${typeof context.pseudocode}`,
        { ...context, pseudocode: context.pseudocode }
      );
    }
  }

  // Extract raw algorithm identifier
  const rawAlgo = typeof context.algorithm === 'string'
    ? context.algorithm
    : (typeof context.algorithmName === 'string' ? context.algorithmName : undefined);

  // Check if rawAlgo corresponds to a recognized algorithm
  let recognizedAlgo;
  let registeredPseudocode;

  if (rawAlgo) {
    const trimmed = rawAlgo.trim();
    if (ALGORITHM_PSEUDOCODE[trimmed]) {
      recognizedAlgo = trimmed;
      registeredPseudocode = ALGORITHM_PSEUDOCODE[trimmed];
    } else {
      const lower = trimmed.toLowerCase();
      for (const [key, pseudocode] of Object.entries(ALGORITHM_PSEUDOCODE)) {
        if (key.toLowerCase() === lower) {
          recognizedAlgo = key;
          registeredPseudocode = pseudocode;
          break;
        }
      }
    }
  }

  // Case 1: Recognized algorithm — authoritative registered length
  if (recognizedAlgo && registeredPseudocode) {
    const registeredLength = registeredPseudocode.length;

    // Reject conflicting maxLines
    if (context.maxLines !== undefined && context.maxLines !== registeredLength) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Conflicting pseudocode configuration: algorithm '${recognizedAlgo}' specifies ${registeredLength} lines, but maxLines was configured as ${context.maxLines}.`,
        { ...context, algorithm: recognizedAlgo, registeredLength, maxLines: context.maxLines }
      );
    }

    // Reject conflicting pseudocode array
    if (context.pseudocode !== undefined && context.pseudocode.length !== registeredLength) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Conflicting pseudocode configuration: algorithm '${recognizedAlgo}' specifies ${registeredLength} lines, but pseudocode array has length ${context.pseudocode.length}.`,
        { ...context, algorithm: recognizedAlgo, registeredLength, pseudocodeLength: context.pseudocode.length }
      );
    }

    return { maxLines: registeredLength, algorithm: recognizedAlgo };
  }

  // Case 2: Custom / generic pseudocode context (no recognized algorithm)
  const hasMaxLines = context.maxLines !== undefined;
  const hasPseudocode = context.pseudocode !== undefined;

  if (hasMaxLines && hasPseudocode) {
    if (context.maxLines !== context.pseudocode.length) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Conflicting custom pseudocode configuration: maxLines (${context.maxLines}) does not match pseudocode array length (${context.pseudocode.length}).`,
        { ...context, maxLines: context.maxLines, pseudocodeLength: context.pseudocode.length }
      );
    }
    return { maxLines: context.maxLines, algorithm: rawAlgo };
  }

  if (hasPseudocode) {
    return { maxLines: context.pseudocode.length, algorithm: rawAlgo };
  }

  if (hasMaxLines) {
    return { maxLines: context.maxLines, algorithm: rawAlgo };
  }

  return { maxLines: undefined, algorithm: rawAlgo };
}

/**
 * Validates an event-to-code mapping against the schema contract and algorithm pseudocode bounds.
 * Enforces 1-based line numbering (positive integer), non-empty explanation,
 * algorithm-aware line range checks (1 <= line <= maxLines),
 * optional lines array containing line with all entries in range, and optional variables object.
 *
 * @param {unknown} mapping - Candidate code mapping object
 * @param {object} [context={}] - Contextual debug metadata (e.g. { eventIndex, eventType, algorithm })
 * @returns {Readonly<{ line: number, lines: readonly number[], explanation: string, variables?: Readonly<Record<string, unknown>> }>}
 * @throws {EngineError} If mapping violates schema invariants or pseudocode boundaries
 */
export function validateCodeMapping(mapping, context = {}) {
  const ctx = (typeof context === 'object' && context !== null && !Array.isArray(context))
    ? context
    : { context };

  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    throw new EngineError(
      ErrorCode.INVALID_CODE_MAPPING,
      `Code mapping must be a non-null object. Received: ${typeof mapping}`,
      { ...ctx, mapping }
    );
  }

  const { maxLines, algorithm: resolvedAlgo } = resolvePseudocodeBoundary(ctx);

  // 1. Line validation: 1-based positive finite integer within pseudocode range
  const { line, explanation, lines, variables } = mapping;
  if (
    typeof line !== 'number' ||
    !Number.isFinite(line) ||
    !Number.isInteger(line) ||
    line < 1
  ) {
    throw new EngineError(
      ErrorCode.INVALID_CODE_MAPPING,
      `Code mapping 'line' must be a positive 1-based finite integer (>= 1). Received: ${String(line)}`,
      { ...ctx, line }
    );
  }

  if (maxLines !== undefined && line > maxLines) {
    throw new EngineError(
      ErrorCode.INVALID_CODE_MAPPING,
      `Code mapping 'line' (${line}) exceeds maximum pseudocode line (${maxLines})${resolvedAlgo ? ` for algorithm '${resolvedAlgo}'` : ''}.`,
      { ...ctx, line, maxLines, algorithm: resolvedAlgo }
    );
  }

  // 2. Explanation validation: non-empty string
  if (typeof explanation !== 'string' || explanation.trim().length === 0) {
    throw new EngineError(
      ErrorCode.INVALID_CODE_MAPPING,
      `Code mapping 'explanation' must be a non-empty string. Received: ${typeof explanation}`,
      { ...ctx, explanation }
    );
  }

  // 3. Optional lines array validation
  let validatedLines;
  if (lines !== undefined) {
    if (!Array.isArray(lines)) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Code mapping 'lines' must be an array of positive integers if provided. Received: ${typeof lines}`,
        { ...ctx, lines }
      );
    }
    if (lines.length === 0) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Code mapping 'lines' array cannot be empty if provided.`,
        { ...ctx, lines }
      );
    }
    for (let k = 0; k < lines.length; k++) {
      const l = lines[k];
      if (typeof l !== 'number' || !Number.isFinite(l) || !Number.isInteger(l) || l < 1) {
        throw new EngineError(
          ErrorCode.INVALID_CODE_MAPPING,
          `Code mapping 'lines[${k}]' must be a positive 1-based finite integer (>= 1). Received: ${String(l)}`,
          { ...ctx, lines, invalidElement: l, index: k }
        );
      }
      if (maxLines !== undefined && l > maxLines) {
        throw new EngineError(
          ErrorCode.INVALID_CODE_MAPPING,
          `Code mapping 'lines[${k}]' (${l}) exceeds maximum pseudocode line (${maxLines})${resolvedAlgo ? ` for algorithm '${resolvedAlgo}'` : ''}.`,
          { ...ctx, lines, invalidElement: l, index: k, maxLines, algorithm: resolvedAlgo }
        );
      }
    }
    if (!lines.includes(line)) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Code mapping 'lines' array must contain primary 'line' ${line}. Got: [${lines.join(', ')}]`,
        { ...ctx, line, lines }
      );
    }
    validatedLines = Object.freeze([...lines]);
  } else {
    validatedLines = Object.freeze([line]);
  }

  // 4. Optional variables validation
  let validatedVariables;
  if (variables !== undefined) {
    if (typeof variables !== 'object' || variables === null || Array.isArray(variables)) {
      throw new EngineError(
        ErrorCode.INVALID_CODE_MAPPING,
        `Code mapping 'variables' must be a plain key-value object if provided. Received: ${typeof variables}`,
        { ...ctx, variables }
      );
    }
    validatedVariables = deepFreeze({ ...variables });
  }

  const result = {
    line,
    lines: validatedLines,
    explanation: explanation.trim()
  };

  if (validatedVariables !== undefined) {
    result.variables = validatedVariables;
  }

  return deepFreeze(result);
}



