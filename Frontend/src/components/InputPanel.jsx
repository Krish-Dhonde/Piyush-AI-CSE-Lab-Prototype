import React, { useState } from 'react';
import { HARD_LIMITS } from 'virtual-cse-lab-simulation-engine';
import { ListOrdered, ArrowRight, AlertTriangle } from 'lucide-react';

export function InputPanel({ onLoadArray, isRunning, currentArray }) {
  const [inputText, setInputText] = useState(
    Array.isArray(currentArray) ? currentArray.join(', ') : '29, 10, 14, 37, 13'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const presets = [
    { label: 'Unsorted', values: [29, 10, 14, 37, 13] },
    { label: 'Reverse', values: [50, 40, 30, 20, 10] },
    { label: 'Sorted', values: [5, 12, 18, 27, 33] },
    { label: 'Duplicates', values: [8, 3, 8, 1, 3] },
    { label: 'Negatives', values: [-4, 7, 0, -9, 2] },
    { label: 'Single', values: [42] },
    { label: 'Empty', values: [] }
  ];

  const handleParseAndLoad = (rawText) => {
    setErrorMessage('');
    const trimmed = rawText.trim();

    if (trimmed === '' || trimmed === '[]') {
      try {
        onLoadArray([]);
      } catch (err) {
        setErrorMessage(err.message || 'Failed to load empty array');
      }
      return;
    }

    const tokens = trimmed.split(/[\s,]+/).filter((t) => t.length > 0);
    const parsedNumbers = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const num = Number(token);

      if (isNaN(num)) {
        setErrorMessage(`Invalid element "${token}" at pos ${i + 1}. Must be an integer.`);
        return;
      }
      if (!Number.isInteger(num)) {
        setErrorMessage(`Invalid element "${token}" at pos ${i + 1}. Integers only.`);
        return;
      }
      parsedNumbers.push(num);
    }

    if (parsedNumbers.length > HARD_LIMITS.MAX_ARRAY_SIZE) {
      setErrorMessage(
        `Array length (${parsedNumbers.length}) exceeds hard limit (${HARD_LIMITS.MAX_ARRAY_SIZE}).`
      );
      return;
    }

    try {
      onLoadArray(parsedNumbers);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load array');
    }
  };

  const handlePresetClick = (values) => {
    const formatted = values.join(', ');
    setInputText(formatted);
    setErrorMessage('');
    try {
      onLoadArray(values);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load preset');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleParseAndLoad(inputText);
  };

  return (
    <div className="card input-panel-card compact-card">
      <div className="compact-card-header">
        <div className="compact-title">
          <ListOrdered size={14} />
          <span>Input Array</span>
        </div>
        <span className="input-limit-hint">Max {HARD_LIMITS.MAX_ARRAY_SIZE} ints</span>
      </div>

      <form onSubmit={handleSubmit} className="compact-input-form">
        <div className="compact-input-row">
          <input
            type="text"
            className={`array-text-input compact-input ${errorMessage ? 'has-error' : ''}`}
            placeholder="e.g. 29, 10, 14, 37, 13"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            disabled={isRunning}
          />

          <button
            type="submit"
            className="btn btn-primary btn-compact"
            disabled={isRunning}
            title="Load array into simulation"
          >
            <span>Load</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {errorMessage && (
          <div className="input-error-banner compact-error" role="alert">
            <AlertTriangle size={13} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="compact-presets-row">
          <span className="compact-presets-label">Presets:</span>
          <div className="compact-preset-chips">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="compact-preset-chip"
                onClick={() => handlePresetClick(preset.values)}
                disabled={isRunning}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
