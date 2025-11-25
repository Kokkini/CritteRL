/**
 * TrainingPage - Container for training view
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TrainingView from '../components/TrainingView/TrainingView';
import TaskSelector from '../components/TaskSelector/TaskSelector';
import { GameConstants } from '../utils/constants';

export default function TrainingPage() {
  const [searchParams] = useSearchParams();
  const creatureId = searchParams.get('creatureId') || '';
  const initialTaskId = searchParams.get('taskId') || GameConstants.DEFAULT_RUNNING_TASK_ID;
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId);

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
      <TaskSelector selectedTaskId={selectedTaskId} onTaskSelect={setSelectedTaskId} />
      <TrainingView creatureDesignId={creatureId} taskId={selectedTaskId} />
    </div>
  );
}

