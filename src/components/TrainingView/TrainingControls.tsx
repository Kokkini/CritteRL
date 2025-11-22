/**
 * TrainingControls - Training control buttons (start, save brain)
 */

interface TrainingControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onSaveBrain?: () => void;
  canSaveBrain?: boolean;
}

export default function TrainingControls({
  isRunning,
  onStart,
  onSaveBrain,
  canSaveBrain = false,
}: TrainingControlsProps) {
  return (
    <div style={{ marginBottom: '20px' }}>
      {!isRunning && (
        <button onClick={onStart} style={{ padding: '10px 20px', marginRight: '10px' }}>
          Start Training
        </button>
      )}
      {isRunning && canSaveBrain && onSaveBrain && (
        <button 
          onClick={onSaveBrain} 
          style={{ padding: '10px 20px', marginRight: '10px', backgroundColor: '#4a9eff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Save Brain
        </button>
      )}
    </div>
  );
}

