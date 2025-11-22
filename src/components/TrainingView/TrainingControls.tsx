/**
 * TrainingControls - Training control buttons (start, pause, resume, stop)
 */

interface TrainingControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function TrainingControls({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
}: TrainingControlsProps) {
  return (
    <div style={{ marginBottom: '20px' }}>
      {!isRunning && (
        <button onClick={onStart} style={{ padding: '10px 20px', marginRight: '10px' }}>
          Start Training
        </button>
      )}
      {isRunning && !isPaused && (
        <>
          <button onClick={onPause} style={{ padding: '10px 20px', marginRight: '10px' }}>
            Pause
          </button>
          <button onClick={onStop} style={{ padding: '10px 20px' }}>
            Stop
          </button>
        </>
      )}
      {isRunning && isPaused && (
        <>
          <button onClick={onResume} style={{ padding: '10px 20px', marginRight: '10px' }}>
            Resume
          </button>
          <button onClick={onStop} style={{ padding: '10px 20px' }}>
            Stop
          </button>
        </>
      )}
    </div>
  );
}

