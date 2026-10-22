import React from 'react';
import { PlaybackState } from 'virtual-cse-lab-simulation-engine';
import { Terminal, Activity, CheckCircle2, PauseCircle, PlayCircle, AlertCircle, Cpu } from 'lucide-react';

export function Header({ algorithm, playbackState }) {
  const state = playbackState?.state || PlaybackState.IDLE;

  const stateConfig = {
    [PlaybackState.IDLE]: { label: 'Idle', color: '#64748b', bg: '#f1f5f9', icon: Terminal },
    [PlaybackState.READY]: { label: 'Ready', color: '#0284c7', bg: '#e0f2fe', icon: Activity },
    [PlaybackState.RUNNING]: { label: 'Simulating', color: '#4f46e5', bg: '#eef2ff', icon: PlayCircle },
    [PlaybackState.PAUSED]: { label: 'Paused', color: '#d97706', bg: '#fef3c7', icon: PauseCircle },
    [PlaybackState.COMPLETED]: { label: 'Completed', color: '#059669', bg: '#d1fae5', icon: CheckCircle2 },
    [PlaybackState.ERROR]: { label: 'Error', color: '#dc2626', bg: '#fee2e2', icon: AlertCircle }
  }[state] || { label: state, color: '#64748b', bg: '#f1f5f9', icon: Activity };

  const StateIcon = stateConfig.icon;
  const algorithmDisplayName = algorithm === 'bubbleSort' ? 'Bubble Sort' : 'Selection Sort';

  return (
    <header className="header-bar">
      <div className="header-inner">
        <div className="header-branding">
          <div className="lab-logo">
            <Cpu size={16} />
          </div>
          <div className="lab-title-group">
            <span className="lab-title">Virtual CSE Lab</span>
            <span className="lab-title-divider">/</span>
            <span className="lab-subtitle">Algorithm Simulation Laboratory</span>
          </div>
        </div>

        <div className="header-status">
          <div className="current-algo-pill">
            <span className="algo-label">Algorithm:</span>
            <span className="algo-name">{algorithmDisplayName}</span>
          </div>

          <div
            className="engine-state-pill"
            style={{ backgroundColor: stateConfig.bg, color: stateConfig.color, borderColor: stateConfig.color }}
          >
            <StateIcon size={12} className={state === PlaybackState.RUNNING ? 'spin-slow' : ''} />
            <span>{stateConfig.label}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
