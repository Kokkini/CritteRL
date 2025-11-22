/**
 * TestPage - Container for task testing view
 */

import { useSearchParams } from 'react-router-dom';
import TaskView from '../components/TaskView/TaskView';

export default function TestPage() {
  const [searchParams] = useSearchParams();
  const creatureId = searchParams.get('creatureId') || '';

  if (!creatureId) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Test Creature</h1>
        <p>Please select a creature to test.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <TaskView creatureDesignId={creatureId} />
    </div>
  );
}

