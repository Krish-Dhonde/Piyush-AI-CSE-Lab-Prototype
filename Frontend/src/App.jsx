import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  bubbleSort,
  selectionSort,
  PlaybackController,
  PlaybackState,
  EngineError
} from 'virtual-cse-lab-simulation-engine';

import { Header } from './components/Header.jsx';
import { AlgorithmSelector } from './components/AlgorithmSelector.jsx';
import { InputPanel } from './components/InputPanel.jsx';
import { VisualizationPanel } from './components/VisualizationPanel.jsx';
import { PseudocodePanel } from './components/PseudocodePanel.jsx';
import { ExplanationPanel } from './components/ExplanationPanel.jsx';
import { PlaybackControls } from './components/PlaybackControls.jsx';
import { AlertCircle } from 'lucide-react';
import './App.css';

const DEFAULT_ARRAY = [29, 10, 14, 37, 13];

export default function App() {
  const [algorithm, setAlgorithm] = useState('bubbleSort');
  const [currentArray, setCurrentArray] = useState(DEFAULT_ARRAY);
  const [playbackState, setPlaybackState] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const controllerRef = useRef(null);
  const speedRef = useRef(1.0);

  // Initialize or re-initialize simulation trace and controller
  const setupSimulation = useCallback((algo, array, preservedSpeed = 1.0) => {
    // 1. Dispose previous controller to clear running timers and unregister subscribers
    if (controllerRef.current) {
      try {
        controllerRef.current.dispose();
      } catch (err) {
        console.error('Error disposing previous controller:', err);
      }
      controllerRef.current = null;
    }

    setErrorMessage(null);

    try {
      // 2. Generate pure immutable execution trace from Engine
      const trace = algo === 'bubbleSort' ? bubbleSort(array) : selectionSort(array);

      // 3. Instantiate fresh PlaybackController
      const controller = new PlaybackController(trace, {
        speedMultiplier: preservedSpeed
      });
      controllerRef.current = controller;
      speedRef.current = preservedSpeed;

      // 4. Subscribe to state changes (subscriber is called immediately with initial state)
      controller.subscribe((newState) => {
        queueMicrotask(() => {
          setPlaybackState(newState);
        });
      });
    } catch (err) {
      console.error('Failed to initialize simulation:', err);
      const message =
        err instanceof EngineError
          ? `Engine Error [${err.code}]: ${err.message}`
          : err.message || 'An unexpected error occurred while setting up simulation.';
      setErrorMessage(message);
    }
  }, []);

  // Synchronize simulation controller with algorithm and array state
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setupSimulation(algorithm, currentArray, speedRef.current);

    return () => {
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
      }
    };
  }, [algorithm, currentArray, setupSimulation]);

  // Handler for algorithm switching
  const handleSelectAlgorithm = (newAlgo) => {
    if (newAlgo === algorithm) return;
    setAlgorithm(newAlgo);
  };

  // Handler for loading new array input
  const handleLoadArray = (newArray) => {
    setCurrentArray(newArray);
  };

  // Controller interaction callbacks
  const handlePlay = () => {
    try {
      controllerRef.current?.play();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handlePause = () => {
    try {
      controllerRef.current?.pause();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleStepForward = () => {
    try {
      controllerRef.current?.stepForward();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleStepBackward = () => {
    try {
      controllerRef.current?.stepBackward();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleReset = () => {
    try {
      controllerRef.current?.reset();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleSeek = (targetIndex) => {
    try {
      controllerRef.current?.seek(targetIndex);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleSetSpeed = (multiplier) => {
    try {
      speedRef.current = multiplier;
      controllerRef.current?.setSpeed(multiplier);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Keyboard shortcut listeners (Space, ArrowLeft, ArrowRight, R)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if student is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (playbackState?.state === PlaybackState.RUNNING) {
          handlePause();
        } else {
          handlePlay();
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepBackward();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState]);

  const isRunning = playbackState?.state === PlaybackState.RUNNING;
  const currentSnapshot = playbackState?.currentSnapshot;
  const currentEvent = playbackState?.currentEvent;

  return (
    <div className="app-container">
      <Header algorithm={algorithm} playbackState={playbackState} />

      <main className="main-content">
        {errorMessage && (
          <div className="global-error-banner" role="alert">
            <AlertCircle size={18} />
            <div className="error-text">
              <strong>Simulation Error:</strong> {errorMessage}
            </div>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Configuration Area: Algorithm & Input */}
        <section className="top-config-section">
          <AlgorithmSelector
            selectedAlgorithm={algorithm}
            onSelectAlgorithm={handleSelectAlgorithm}
            isRunning={isRunning}
          />

          <InputPanel
            onLoadArray={handleLoadArray}
            isRunning={isRunning}
            currentArray={currentArray}
          />
        </section>

        {/* Playback Controls & Timeline */}
        <section className="controls-section">
          <PlaybackControls
            playbackState={playbackState}
            onPlay={handlePlay}
            onPause={handlePause}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onReset={handleReset}
            onSeek={handleSeek}
            onSetSpeed={handleSetSpeed}
          />
        </section>

        {/* Main Interactive Laboratory Grid */}
        <section className="workspace-grid">
          {/* Left Column: Visualization & Natural Language Explanation */}
          <div className="workspace-left-col">
            <VisualizationPanel
              snapshot={currentSnapshot}
              currentEvent={currentEvent}
              algorithm={algorithm}
            />

            <ExplanationPanel
              currentEvent={currentEvent}
              snapshot={currentSnapshot}
            />
          </div>

          {/* Right Column: Code Mapping & Synchronized Pseudocode */}
          <div className="workspace-right-col">
            <PseudocodePanel
              algorithm={algorithm}
              currentEvent={currentEvent}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
