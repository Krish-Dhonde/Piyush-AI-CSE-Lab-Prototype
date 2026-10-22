import React from 'react';
import {
  BUBBLE_SORT_PSEUDOCODE,
  SELECTION_SORT_PSEUDOCODE
} from 'virtual-cse-lab-simulation-engine';
import { Code, ArrowRight } from 'lucide-react';

export function PseudocodePanel({ algorithm, currentEvent }) {
  const pseudocodeLines =
    algorithm === 'bubbleSort' ? BUBBLE_SORT_PSEUDOCODE : SELECTION_SORT_PSEUDOCODE;

  const activeLineNumber = currentEvent?.codeMapping?.line ?? null;
  const lineExplanation = currentEvent?.codeMapping?.explanation ?? null;

  return (
    <div className="card pseudocode-card compact-card">
      <div className="compact-card-header">
        <div className="compact-title">
          <Code size={14} />
          <span>Pseudocode</span>
        </div>

        {activeLineNumber && (
          <div className="badge badge-primary compact-badge">
            Line {activeLineNumber}
          </div>
        )}
      </div>

      <div className="pseudocode-viewport compact-viewport">
        <div className="pseudocode-listing">
          {pseudocodeLines.map((item) => {
            const isActive = item.line === activeLineNumber;

            return (
              <div
                key={item.line}
                className={`code-line-row ${isActive ? 'active-code-line' : ''}`}
                title={isActive && lineExplanation ? lineExplanation : undefined}
              >
                <div className="code-line-number">
                  {isActive ? (
                    <ArrowRight size={11} className="active-arrow-indicator" />
                  ) : (
                    <span>{item.line}</span>
                  )}
                </div>
                <div className="code-line-content">
                  <code>{item.text}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {lineExplanation && (
        <div className="active-line-footer compact-line-footer">
          <span className="line-note-label">L{activeLineNumber}:</span>
          <span className="line-note-text">{lineExplanation}</span>
        </div>
      )}
    </div>
  );
}
