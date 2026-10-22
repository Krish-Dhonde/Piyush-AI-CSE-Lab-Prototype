import React from 'react';
import { PlaybackState } from 'virtual-cse-lab-simulation-engine';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw
} from 'lucide-react';

export function PlaybackControls({
  playbackState,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSeek,
  onSetSpeed
}) {
  const isRunning = playbackState?.state === PlaybackState.RUNNING;
  const isCompleted = playbackState?.state === PlaybackState.COMPLETED;
  const isAtStart = playbackState?.isAtStart ?? true;
  const isAtEnd = playbackState?.isAtEnd ?? false;
  const totalEvents = playbackState?.totalEvents || 0;
  const currentEventIndex = playbackState?.eventIndex ?? -1;
  const speed = playbackState?.speedMultiplier || 1.0;

  const speedOptions = [0.5, 1.0, 2.0, 4.0];

  const handleSliderChange = (e) => {
    const targetIdx = Number(e.target.value);
    onSeek(targetIdx);
  };

  const progressPercent = Math.round((playbackState?.progress || 0) * 100);

  return (
    <div className="card playback-toolbar-card">
      <div className="playback-toolbar-inner">
        {/* Left: Transport Action Buttons */}
        <div className="transport-btn-group">
          <button
            type="button"
            className="btn btn-transport btn-transport-secondary"
            onClick={onReset}
            disabled={isAtStart || isRunning}
            title="Reset to start [R]"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="btn btn-transport btn-transport-secondary"
            onClick={onStepBackward}
            disabled={isAtStart || isRunning}
            title="Step backward [Left Arrow]"
          >
            <SkipBack size={14} />
            <span>Back</span>
          </button>

          {isRunning ? (
            <button
              type="button"
              className="btn btn-transport btn-transport-pause"
              onClick={onPause}
              title="Pause playback [Space]"
            >
              <Pause size={14} />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-transport btn-transport-play"
              onClick={onPlay}
              disabled={totalEvents === 0}
              title={isCompleted ? 'Restart and play [Space]' : 'Start playback [Space]'}
            >
              <Play size={14} />
              <span>{isCompleted ? 'Replay' : 'Play'}</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-transport btn-transport-secondary"
            onClick={onStepForward}
            disabled={isAtEnd || isRunning}
            title="Step forward [Right Arrow]"
          >
            <span>Next</span>
            <SkipForward size={14} />
          </button>
        </div>

        {/* Middle: Compact Scrub Slider & Step Counter */}
        <div className="timeline-scrub-section">
          <div className="compact-step-tag">
            <span className="step-pos">
              {currentEventIndex === -1 ? 'Initial' : `${currentEventIndex + 1}`}
            </span>
            <span className="step-divider">/</span>
            <span className="step-total">{totalEvents}</span>
            <span className="step-pct">({progressPercent}%)</span>
          </div>

          <div className="slider-track-box">
            <input
              type="range"
              min={-1}
              max={Math.max(-1, totalEvents - 1)}
              value={currentEventIndex}
              onChange={handleSliderChange}
              disabled={isRunning || totalEvents === 0}
              className="compact-seek-slider"
              title={isRunning ? 'Pause to scrub' : 'Drag to scrub timeline'}
            />
          </div>
        </div>

        {/* Right: Compact Speed Selector */}
        <div className="compact-speed-box">
          <span className="speed-tag-label">Speed:</span>
          <div className="compact-speed-pills">
            {speedOptions.map((s) => (
              <button
                key={s}
                type="button"
                className={`compact-speed-btn ${Math.abs(speed - s) < 0.01 ? 'active' : ''}`}
                onClick={() => onSetSpeed(s)}
                title={`${s}x speed`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
