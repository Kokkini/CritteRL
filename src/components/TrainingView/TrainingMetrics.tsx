/**
 * TrainingMetrics - Display training metrics (episode rewards, completion rate, average distance)
 */

import { TrainingMetrics, TrainingProgress } from '../../utils/types';
import { GameConstants } from '../../utils/constants';

interface TrainingMetricsDisplayProps {
  metrics: TrainingMetrics;
  progress: TrainingProgress | null;
}

export default function TrainingMetricsDisplay({
  metrics,
  progress,
}: TrainingMetricsDisplayProps) {
  // Calculate average episode length of last 50 episodes (in seconds)
  const last50Episodes = metrics.episodeLengths.slice(-50);
  const avgEpisodeLengthSteps = last50Episodes.length > 0
    ? last50Episodes.reduce((sum, len) => sum + len, 0) / last50Episodes.length
    : 0;
  // Convert steps to seconds using rollout delta time
  const avgEpisodeLengthSeconds = avgEpisodeLengthSteps * GameConstants.RL_ROLLOUT_DELTA_TIME;

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h3>Training Metrics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div>
          <strong>Average Reward:</strong> {metrics.averageReward.toFixed(2)}
        </div>
        <div>
          <strong>Best Reward:</strong> {metrics.bestReward.toFixed(2)}
        </div>
        <div>
          <strong>Completion Rate:</strong> {(metrics.completionRate * 100).toFixed(1)}%
        </div>
        <div>
          <strong>Avg Episode Length (last 50):</strong> {avgEpisodeLengthSeconds.toFixed(2)}s
        </div>
        {progress && (
          <div>
            <strong>Current Episode:</strong> {progress.currentEpisode}
          </div>
        )}
      </div>
      {metrics.episodeRewards.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <strong>Recent Episode Rewards:</strong>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {metrics.episodeRewards.slice(-10).map((reward, idx) => (
              <span key={idx} style={{ marginRight: '10px' }}>
                {reward.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

