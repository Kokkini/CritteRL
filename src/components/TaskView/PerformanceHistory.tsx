/**
 * PerformanceHistory - Display past test results
 */

import { TaskResult } from '../../utils/types';

interface PerformanceHistoryProps {
  history: TaskResult[];
}

export default function PerformanceHistory({ history }: PerformanceHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  // Calculate statistics
  const completedCount = history.filter((r) => r.completed).length;
  const averageScore = history.reduce((sum, r) => sum + r.score, 0) / history.length;
  const averageDistance = history.reduce((sum, r) => sum + r.distanceToTarget, 0) / history.length;
  const bestScore = Math.max(...history.map((r) => r.score));

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Performance History</h3>
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div>
            <strong>Total Tests:</strong> {history.length}
          </div>
          <div>
            <strong>Completed:</strong> {completedCount} ({((completedCount / history.length) * 100).toFixed(1)}%)
          </div>
          <div>
            <strong>Average Score:</strong> {averageScore.toFixed(2)}
          </div>
          <div>
            <strong>Best Score:</strong> {bestScore.toFixed(2)}
          </div>
          <div>
            <strong>Average Distance:</strong> {averageDistance.toFixed(2)}m
          </div>
        </div>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Status</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Score</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Distance</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {history.map((result, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {new Date(result.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  <span style={{ color: result.completed ? '#4caf50' : '#ff9800' }}>
                    {result.completed ? '✓' : '✗'}
                  </span>
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {result.score.toFixed(2)}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {result.distanceToTarget.toFixed(2)}m
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {result.timeToComplete !== null ? `${result.timeToComplete.toFixed(2)}s` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

