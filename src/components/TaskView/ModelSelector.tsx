/**
 * ModelSelector - UI for selecting a trained model to test
 */

import { useState, useEffect } from 'react';
import { TrainedModel } from '../../utils/types';
import { TrainingService } from '../../services/TrainingService';

interface ModelSelectorProps {
  creatureDesignId: string;
  selectedModel: TrainedModel | null;
  onModelSelect: (model: TrainedModel) => void;
  trainingService: TrainingService | null;
}

export default function ModelSelector({
  creatureDesignId,
  selectedModel,
  onModelSelect,
  trainingService,
}: ModelSelectorProps) {
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      if (!trainingService) {
        console.log('[ModelSelector] TrainingService not available yet');
        setLoading(false);
        return;
      }

      try {
        console.log('[ModelSelector] Loading models for creature:', creatureDesignId);
        const trainedModels = await trainingService.listTrainedModels(creatureDesignId);
        console.log('[ModelSelector] Loaded models:', trainedModels.length);
        setModels(trainedModels);
      } catch (error) {
        console.error('[ModelSelector] Failed to load models:', error);
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [creatureDesignId, trainingService]);

  if (loading) {
    return <div>Loading models...</div>;
  }

  if (models.length === 0) {
    return (
      <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p>No trained models available for this creature.</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Train a model first before testing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label>
        <strong>Select Model:</strong>
        <select
          value={selectedModel?.id || ''}
          onChange={(e) => {
            const model = models.find((m) => m.id === e.target.value);
            if (model) {
              onModelSelect(model);
            }
          }}
          style={{ marginLeft: '10px', padding: '5px', fontSize: '14px' }}
        >
          <option value="">-- Select Model --</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name || `Model ${model.id.substring(0, 8)}`} ({model.episodes} episodes)
            </option>
          ))}
        </select>
      </label>
      {selectedModel && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          <p>
            Trained: {new Date(selectedModel.trainedAt).toLocaleDateString()}
          </p>
          <p>Episodes: {selectedModel.episodes}</p>
        </div>
      )}
    </div>
  );
}

