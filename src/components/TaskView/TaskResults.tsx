/**
 * TaskResults - Display test results (score, completion status, distance, time)
 */

import { TaskResult } from '../../utils/types';

interface TaskResultsProps {
  result: TaskResult;
}

export default function TaskResults({ result }: TaskResultsProps) {
  return (
    <div
      style={{
        padding: '15px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: result.completed ? '#e8f5e9' : '#fff3e0',
      }}
    >
      <h3>Test Results</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div>
          <strong>Status:</strong>{' '}
          <span style={{ color: result.completed ? '#4caf50' : '#ff9800' }}>
            {result.completed ? '✓ Completed' : '✗ Failed'}
          </span>
        </div>
        <div>
          <strong>Score:</strong> {result.score.toFixed(2)}
        </div>
        <div>
          <strong>Distance to Target:</strong> {result.distanceToTarget.toFixed(2)}m
        </div>
        {result.timeToComplete !== null && (
          <div>
            <strong>Time to Complete:</strong> {result.timeToComplete.toFixed(2)}s
          </div>
        )}
        <div>
          <strong>Timestamp:</strong>{' '}
          {new Date(result.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

