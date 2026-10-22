import React from 'react';
import { EventType } from 'virtual-cse-lab-simulation-engine';
import { Info, Activity, Variable, CheckCircle2, ArrowRightLeft, Search, ShieldCheck } from 'lucide-react';

export function ExplanationPanel({ currentEvent, snapshot }) {
  const isInitialState = !currentEvent || snapshot?.eventIndex === -1;
  const metrics = snapshot?.metrics || { comparisons: 0, swaps: 0, passes: 0 };
  const variables = currentEvent?.codeMapping?.variables || null;

  const getEventTypeMeta = (type) => {
    switch (type) {
      case EventType.ALGORITHM_START:
        return { label: 'Start', badgeClass: 'badge-primary', icon: Activity };
      case EventType.PASS_START:
        return { label: 'Pass Start', badgeClass: 'badge-primary', icon: Activity };
      case EventType.COMPARE:
        return { label: 'Comparison', badgeClass: 'badge-comparing', icon: Search };
      case EventType.SWAP:
        return { label: 'Swap', badgeClass: 'badge-swapping', icon: ArrowRightLeft };
      case EventType.NO_SWAP:
        return { label: 'No Swap', badgeClass: 'badge-neutral', icon: ShieldCheck };
      case EventType.CANDIDATE_SELECT:
        return { label: 'Min Candidate', badgeClass: 'badge-candidate', icon: Search };
      case EventType.CANDIDATE_UPDATE:
        return { label: 'New Minimum', badgeClass: 'badge-candidate', icon: Search };
      case EventType.PASS_COMPLETE:
        return { label: 'Pass Complete', badgeClass: 'badge-locked', icon: CheckCircle2 };
      case EventType.ALGORITHM_COMPLETE:
        return { label: 'Completed', badgeClass: 'badge-locked', icon: CheckCircle2 };
      default:
        return { label: type || 'Step', badgeClass: 'badge-neutral', icon: Info };
    }
  };

  const meta = !isInitialState ? getEventTypeMeta(currentEvent?.type) : null;
  const EventIcon = meta?.icon || Info;

  return (
    <div className="card explanation-card compact-card">
      <div className="compact-card-header">
        <div className="compact-title">
          <Info size={14} />
          <span>Step Explanation</span>
        </div>

        {!isInitialState && meta ? (
          <div className={`badge ${meta.badgeClass} compact-badge`}>
            <EventIcon size={11} />
            {meta.label}
          </div>
        ) : (
          <div className="badge badge-neutral compact-badge">Ready</div>
        )}
      </div>

      {/* Main Natural Language Explanation */}
      <div className="explanation-body compact-explanation">
        {isInitialState ? (
          <div className="compact-callout initial-callout">
            <span className="callout-desc">
              Input array loaded. Press <strong>Play</strong> or <strong>Next</strong> to execute step-by-step.
            </span>
          </div>
        ) : (
          <div className="compact-callout event-callout">
            <p className="event-primary-description">{currentEvent.description}</p>
            {currentEvent.codeMapping?.explanation && (
              <p className="event-secondary-explanation">
                <strong>Logic:</strong> {currentEvent.codeMapping.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Active Variables & Cumulative Metrics in a compact row */}
      <div className="diagnostics-compact-row">
        {variables && Object.keys(variables).length > 0 && (
          <div className="compact-variables-group">
            <span className="compact-var-label">
              <Variable size={11} />
              Vars:
            </span>
            <div className="compact-variable-chips">
              {Object.entries(variables).map(([key, val]) => (
                <span key={key} className="compact-var-chip">
                  <span className="var-k">{key}:</span>
                  <span className="var-v">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Inline Cumulative Metrics Counters */}
        <div className="compact-metrics-pills">
          <span className="metric-pill" title="Total comparisons so far">
            <span className="metric-pill-label">C:</span>
            <span className="metric-pill-val">{metrics.comparisons}</span>
          </span>
          <span className="metric-pill" title="Total swaps so far">
            <span className="metric-pill-label">S:</span>
            <span className="metric-pill-val">{metrics.swaps}</span>
          </span>
          <span className="metric-pill" title="Current pass count">
            <span className="metric-pill-label">P:</span>
            <span className="metric-pill-val">{metrics.passes}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
