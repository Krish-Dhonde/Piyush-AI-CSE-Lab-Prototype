import React, { useState } from 'react';
import { EventType } from 'virtual-cse-lab-simulation-engine';
import { BarChart3, LayoutGrid, ArrowRightLeft, Search, Lock } from 'lucide-react';

export function VisualizationPanel({ snapshot, currentEvent, algorithm }) {
  const [viewMode, setViewMode] = useState('both'); // 'bars' | 'cells' | 'both'

  const array = snapshot?.array || [];
  const lockedIndices = snapshot?.lockedIndices || [];
  const activeIndices = currentEvent?.activeIndices || [];

  if (array.length === 0) {
    return (
      <div className="card visualization-card compact-card">
        <div className="compact-card-header">
          <div className="compact-title">
            <BarChart3 size={15} />
            <span>Array Visualization</span>
          </div>
        </div>
        <div className="empty-array-state compact-empty">
          <p className="empty-array-title">Array is Empty (0 elements)</p>
          <p className="empty-array-desc">
            Simulation completes immediately with 0 comparisons and 0 swaps.
          </p>
        </div>
      </div>
    );
  }

  // Calculate element status and metadata
  const getElementMetadata = (val, idx) => {
    const isLocked = lockedIndices.includes(idx);
    const isActive = activeIndices.includes(idx);
    const eventType = currentEvent?.type;
    const payload = currentEvent?.payload || {};

    if (eventType === EventType.SWAP && isActive) {
      return {
        status: 'swapping',
        badge: 'Swap',
        icon: ArrowRightLeft,
        className: 'item-swapping',
        roleDescription: 'Element is exchanging positions'
      };
    }

    if (algorithm === 'selectionSort') {
      const isCandidate =
        payload.candidateIndex === idx ||
        payload.newMinIndex === idx ||
        payload.minIndex === idx;

      if ((eventType === EventType.CANDIDATE_SELECT || eventType === EventType.CANDIDATE_UPDATE) && isActive) {
        return {
          status: 'candidate',
          badge: 'Min Cand',
          icon: Search,
          className: 'item-candidate',
          roleDescription: 'Current minimum candidate for this pass'
        };
      }

      if (eventType === EventType.COMPARE && isCandidate) {
        return {
          status: 'candidate',
          badge: 'Min Cand',
          icon: Search,
          className: 'item-candidate',
          roleDescription: 'Current minimum candidate being compared'
        };
      }
    }

    if (eventType === EventType.COMPARE && isActive) {
      return {
        status: 'comparing',
        badge: 'Compare',
        icon: Search,
        className: 'item-comparing',
        roleDescription: 'Element is currently being compared'
      };
    }

    if (isLocked) {
      return {
        status: 'locked',
        badge: 'Sorted',
        icon: Lock,
        className: 'item-locked',
        roleDescription: 'Element is permanently placed in its sorted position'
      };
    }

    return {
      status: 'default',
      badge: 'Unsorted',
      icon: null,
      className: 'item-default',
      roleDescription: 'Unsorted element'
    };
  };

  // Height calculations supporting both positive and negative values
  const minVal = Math.min(...array, 0);
  const maxVal = Math.max(...array, 0);
  const range = maxVal - minVal || 1;
  const zeroBaselinePct = ((0 - minVal) / range) * 100;
  const hasNegativeValues = minVal < 0;

  return (
    <div className="card visualization-card compact-card">
      <div className="compact-card-header">
        <div className="compact-title">
          <BarChart3 size={15} />
          <span>Array State ({array.length} items)</span>
        </div>

        <div className="view-toggle-group compact-toggle-group">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'both' ? 'active' : ''}`}
            onClick={() => setViewMode('both')}
            title="Show both views"
          >
            All
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'bars' ? 'active' : ''}`}
            onClick={() => setViewMode('bars')}
            title="Show bars only"
          >
            <BarChart3 size={12} />
            Bars
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'cells' ? 'active' : ''}`}
            onClick={() => setViewMode('cells')}
            title="Show cells only"
          >
            <LayoutGrid size={12} />
            Cells
          </button>
        </div>
      </div>

      {/* Visual Bars Container */}
      {(viewMode === 'bars' || viewMode === 'both') && (
        <div className="bars-container compact-bars" style={{ height: hasNegativeValues ? '190px' : '160px' }}>
          {hasNegativeValues && (
            <div
              className="zero-baseline-line"
              style={{ bottom: `${zeroBaselinePct}%` }}
              title="Zero Value Baseline"
            >
              <span className="zero-baseline-label">0</span>
            </div>
          )}

          <div className="bars-track">
            {array.map((val, idx) => {
              const meta = getElementMetadata(val, idx);

              let barHeightStyle = {};
              if (!hasNegativeValues) {
                const heightPct = Math.max(10, (val / range) * 90);
                barHeightStyle = {
                  height: `${heightPct}%`,
                  bottom: '0%'
                };
              } else {
                if (val >= 0) {
                  const heightPct = Math.max(4, (val / range) * 100);
                  barHeightStyle = {
                    height: `${heightPct}%`,
                    bottom: `${zeroBaselinePct}%`
                  };
                } else {
                  const heightPct = Math.max(4, (Math.abs(val) / range) * 100);
                  barHeightStyle = {
                    height: `${heightPct}%`,
                    top: `${100 - zeroBaselinePct}%`
                  };
                }
              }

              return (
                <div key={idx} className="bar-column">
                  <div className="bar-slot">
                    <div
                      className={`bar-fill ${meta.className}`}
                      style={barHeightStyle}
                      title={`[${idx}]: ${val} (${meta.badge})`}
                    >
                      <span className="bar-number-label">{val}</span>
                    </div>
                  </div>
                  <div className="bar-index-label">
                    <span className="idx-number">[{idx}]</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Array Cells / Values Grid */}
      {(viewMode === 'cells' || viewMode === 'both') && (
        <div className="cells-container compact-cells">
          <div className="cells-grid">
            {array.map((val, idx) => {
              const meta = getElementMetadata(val, idx);
              const MetaIcon = meta.icon;

              return (
                <div
                  key={idx}
                  className={`array-cell ${meta.className}`}
                  title={`Index ${idx}: ${val} — ${meta.roleDescription}`}
                >
                  <div className="cell-header">
                    <span className="cell-index">idx {idx}</span>
                    {MetaIcon && <MetaIcon size={11} className="cell-meta-icon" />}
                  </div>
                  <div className="cell-value">{val}</div>
                  <div className="cell-status-tag">{meta.badge}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Semantics Legend */}
      <div className="visual-legend compact-legend">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-swatch legend-comparing" />
            <span>Comparing</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch legend-swapping" />
            <span>Swapping</span>
          </div>
          {algorithm === 'selectionSort' && (
            <div className="legend-item">
              <span className="legend-swatch legend-candidate" />
              <span>Min Candidate</span>
            </div>
          )}
          <div className="legend-item">
            <span className="legend-swatch legend-locked" />
            <span>Sorted</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch legend-default" />
            <span>Unsorted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
