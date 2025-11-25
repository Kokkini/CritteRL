/**
 * AquariumCreatureSelector - UI for adding creatures to aquarium
 */

import { useState, useEffect } from 'react';
import { TrainingService } from '../../services/TrainingService';
import { StorageService } from '../../services/StorageService';
import { AquariumService } from '../../services/AquariumService';
import { TrainedModel } from '../../utils/types';
import { GameConstants } from '../../utils/constants';

export interface AquariumCreatureSelectorProps {
  creatureDesignId: string;
  onAddToAquarium: (creatureDesignId: string, modelId: string | null, count: number) => Promise<void>;
  onRemoveFromAquarium: (creatureDesignId: string, modelId: string | null) => Promise<void>;
}

export default function AquariumCreatureSelector({
  creatureDesignId,
  onAddToAquarium,
  onRemoveFromAquarium,
}: AquariumCreatureSelectorProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [count, setCount] = useState<number>(GameConstants.AQUARIUM_DEFAULT_COUNT);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [aquariumCounts, setAquariumCounts] = useState<Map<string | null, number>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [creatureDesignId]);

  // Load aquarium state after models are loaded
  useEffect(() => {
    if (models.length >= 0) { // Always run, even if no models
      loadAquariumState();
    }
  }, [creatureDesignId, models.length]);

  // Sync checkbox state and count from aquarium storage (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    
    const currentCount = selectedModelId !== null 
      ? aquariumCounts.get(selectedModelId) || 0 
      : aquariumCounts.get(null) || 0;
    
    // Update checkbox based on whether this model is in aquarium
    setIsEnabled(currentCount > 0);
    
    // Sync count to what's in aquarium for this model
    if (currentCount > 0) {
      setCount(currentCount);
    } else if (currentCount === 0 && isEnabled) {
      // If checkbox was checked but count is 0, reset to default
      setCount(GameConstants.AQUARIUM_DEFAULT_COUNT);
    }
  }, [aquariumCounts, selectedModelId, isInitialized]);

  const loadAquariumState = async () => {
    try {
      const storageService = new StorageService();
      await storageService.initialize();
      const aquariumService = new AquariumService(storageService);
      
      const counts = new Map<string | null, number>();
      
      // Check for "No Brain" creatures
      const noBrainCreatures = await aquariumService.getCreaturesInAquarium(creatureDesignId, null);
      if (noBrainCreatures.length > 0) {
        counts.set(null, noBrainCreatures.length);
      }
      
      // Check for each model
      for (const model of models) {
        const modelCreatures = await aquariumService.getCreaturesInAquarium(creatureDesignId, model.id);
        if (modelCreatures.length > 0) {
          counts.set(model.id, modelCreatures.length);
        }
      }
      
      setAquariumCounts(counts);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load aquarium state:', error);
      setIsInitialized(true); // Still mark as initialized to prevent blocking
    }
  };

  const loadModels = async () => {
    setLoading(true);
    try {
      const storageService = new StorageService();
      await storageService.initialize();
      const trainingService = new TrainingService(storageService, {} as any, {} as any);
      const availableModels = await trainingService.listTrainedModels(creatureDesignId);
      setModels(availableModels);
      
      // After models load, check aquarium state to see which model is in aquarium
      const aquariumService = new AquariumService(storageService);
      
      // Check "No Brain" first
      const noBrainCount = (await aquariumService.getCreaturesInAquarium(creatureDesignId, null)).length;
      if (noBrainCount > 0) {
        setSelectedModelId(null);
        setCount(noBrainCount);
        setIsEnabled(true);
      } else {
        // Check each model
        for (const model of availableModels) {
          const modelCount = (await aquariumService.getCreaturesInAquarium(creatureDesignId, model.id)).length;
          if (modelCount > 0) {
            setSelectedModelId(model.id);
            setCount(modelCount);
            setIsEnabled(true);
            break;
          }
        }
        
        // If nothing in aquarium, default to first model or "No Brain"
        if (availableModels.length > 0) {
          setSelectedModelId(availableModels[0].id);
        } else {
          setSelectedModelId(null);
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
      setSelectedModelId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (count < 1 || count > GameConstants.AQUARIUM_MAX_CREATURES) {
      return; // Silently ignore invalid counts
    }

    setAdding(true);
    try {
      // First remove existing instances of this model (if any)
      const currentCount = selectedModelId !== null 
        ? aquariumCounts.get(selectedModelId) || 0 
        : aquariumCounts.get(null) || 0;
      
      if (currentCount > 0) {
        await onRemoveFromAquarium(creatureDesignId, selectedModelId);
      }
      
      // Then add the new count
      await onAddToAquarium(creatureDesignId, selectedModelId, count);
      await loadAquariumState(); // Reload to update counts
    } catch (error) {
      console.error('Failed to update aquarium:', error);
      alert('Failed to update aquarium: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Adding - ensure models are loaded
      setIsEnabled(true);
      if (models.length === 0) {
        await loadModels();
      }
      // Don't auto-add - user needs to click Update button
    } else {
      // Removing - remove all instances of current selection
      setRemoving(true);
      try {
        await onRemoveFromAquarium(creatureDesignId, selectedModelId);
        await loadAquariumState(); // Reload to update counts
      } catch (error) {
        console.error('Failed to remove from aquarium:', error);
        alert('Failed to remove from aquarium: ' + (error instanceof Error ? error.message : String(error)));
        setIsEnabled(true); // Re-enable if removal failed
      } finally {
        setRemoving(false);
      }
    }
  };


  const currentCount = selectedModelId !== null ? aquariumCounts.get(selectedModelId) || 0 : aquariumCounts.get(null) || 0;
  const modelName = selectedModelId 
    ? models.find(m => m.id === selectedModelId)?.name || 'Unknown Model'
    : 'No Brain (Random Actions)';

  if (!isEnabled) {
    return (
      <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={removing}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontWeight: 'bold' }}>Add to Aquarium</span>
        </label>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={removing || adding}
          style={{ marginRight: '8px' }}
        />
        <span style={{ fontWeight: 'bold' }}>Add to Aquarium</span>
      </label>

      {currentCount > 0 && (
        <div style={{ 
          marginBottom: '10px', 
          padding: '8px', 
          backgroundColor: '#e8f5e9', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#2e7d32'
        }}>
          <strong>In aquarium:</strong> {currentCount} × {modelName}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: '12px', color: '#666' }}>Loading models...</div>
      ) : (
        <>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
              Select Brain:
            </label>
            <select
              value={selectedModelId || ''}
              onChange={(e) => {
                const newModelId = e.target.value || null;
                setSelectedModelId(newModelId);
                // Sync count and checkbox to what's in aquarium for the new model
                const newCount = newModelId !== null 
                  ? aquariumCounts.get(newModelId) || 0
                  : aquariumCounts.get(null) || 0;
                setCount(newCount > 0 ? newCount : GameConstants.AQUARIUM_DEFAULT_COUNT);
                setIsEnabled(newCount > 0);
              }}
              disabled={adding || removing}
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                opacity: adding || removing ? 0.6 : 1,
              }}
            >
              <option value="">No Brain (Random Actions)</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.episodes} episodes)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
              Number of Instances:
            </label>
            <input
              type="number"
              min="1"
              max={GameConstants.AQUARIUM_MAX_CREATURES}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(GameConstants.AQUARIUM_MAX_CREATURES, parseInt(e.target.value) || 1)))}
              disabled={adding || removing}
              style={{
                width: '100%',
                padding: '6px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                opacity: adding || removing ? 0.6 : 1,
              }}
            />
            {(adding || removing) && (
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {adding ? 'Updating...' : removing ? 'Removing...' : ''}
              </div>
            )}
          </div>

          <button
            onClick={handleAddOrUpdate}
            disabled={adding || removing || !isEnabled}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '12px',
              backgroundColor: (adding || removing || !isEnabled) ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (adding || removing || !isEnabled) ? 'not-allowed' : 'pointer',
            }}
          >
            {adding ? 'Updating...' : 'Update Aquarium'}
          </button>
        </>
      )}
    </div>
  );
}

