/**
 * TrainingPage - Container for training view
 */

import { useSearchParams } from 'react-router-dom';
import TrainingView from '../components/TrainingView/TrainingView';
import { GameConstants } from '../utils/constants';

export default function TrainingPage() {
  const [searchParams] = useSearchParams();
  const creatureId = searchParams.get('creatureId') || '';
  const taskId = searchParams.get('taskId') || GameConstants.DEFAULT_TASK_ID;

  if (!creatureId) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Training</h1>
        <p>Please select a creature to train.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <TrainingView creatureDesignId={creatureId} taskId={taskId} />
    </div>
  );
}

