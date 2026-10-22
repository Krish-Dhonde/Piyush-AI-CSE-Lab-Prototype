import React from 'react';
import { Layers } from 'lucide-react';

export function AlgorithmSelector({ selectedAlgorithm, onSelectAlgorithm, isRunning }) {
  const algorithms = [
    {
      id: 'bubbleSort',
      name: 'Bubble Sort',
      time: 'O(N²)',
      space: 'O(1)',
      method: 'Exchanges'
    },
    {
      id: 'selectionSort',
      name: 'Selection Sort',
      time: 'O(N²)',
      space: 'O(1)',
      method: 'Selection'
    }
  ];

  return (
    <div className="card algo-selector-card compact-card">
      <div className="compact-card-header">
        <div className="compact-title">
          <Layers size={14} />
          <span>Algorithm</span>
        </div>
      </div>

      <div className="algo-segmented-control">
        {algorithms.map((algo) => {
          const isSelected = selectedAlgorithm === algo.id;
          return (
            <button
              key={algo.id}
              type="button"
              className={`algo-segment-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectAlgorithm(algo.id)}
              disabled={isRunning}
              title={isRunning ? 'Pause or stop playback before switching' : `Switch to ${algo.name}`}
            >
              <span className="algo-segment-name">{algo.name}</span>
              <span className="algo-complexity-tag">{algo.time}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
