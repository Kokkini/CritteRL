/**
 * HomePage - Main landing page with navigation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatureService } from '../services/CreatureService';
import { StorageService } from '../services/StorageService';
import { AquariumService } from '../services/AquariumService';
import { CreatureDesign } from '../utils/types';
import AquariumCreatureSelector from '../components/Aquarium/AquariumCreatureSelector';

export default function HomePage() {
  const navigate = useNavigate();
  const [creatures, setCreatures] = useState<CreatureDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  useEffect(() => {
    const loadCreatures = async () => {
      try {
        const storageService = new StorageService();
        await storageService.initialize();
        const creatureService = new CreatureService(storageService);
        const list = await creatureService.listCreatures();
        setCreatures(list);
      } catch (error) {
        console.error('Failed to load creatures:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCreatures();
  }, []);

  const handleCreateNew = () => {
    navigate('/editor');
  };

  const handleLoadCreature = (id: string) => {
    navigate(`/editor?id=${id}`);
  };

  const handleTrainCreature = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/training?creatureId=${id}`);
  };

  const handleTestCreature = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/test?creatureId=${id}`);
  };

  const handleAddToAquarium = async (creatureDesignId: string, modelId: string | null, count: number) => {
    try {
      const storageService = new StorageService();
      await storageService.initialize();
      const aquariumService = new AquariumService(storageService);
      await aquariumService.addCreatureToAquarium(creatureDesignId, modelId, count);
    } catch (error) {
      console.error('Failed to add to aquarium:', error);
      throw error;
    }
  };

  const handleRemoveFromAquarium = async (creatureDesignId: string, modelId: string | null) => {
    try {
      const storageService = new StorageService();
      await storageService.initialize();
      const aquariumService = new AquariumService(storageService);
      await aquariumService.removeCreaturesFromAquarium(creatureDesignId, modelId);
    } catch (error) {
      console.error('Failed to remove from aquarium:', error);
      throw error;
    }
  };

  const handleStartEditName = (creature: CreatureDesign, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNameId(creature.id);
    setEditingName(creature.name || '');
  };

  const handleSaveName = async (creatureId: string) => {
    try {
      const storageService = new StorageService();
      await storageService.initialize();
      const creatureService = new CreatureService(storageService);
      
      // Load the creature, update name, and save
      const creature = await creatureService.loadCreature(creatureId);
      if (!creature) {
        alert('Creature not found');
        return;
      }
      
      creature.name = editingName.trim() || 'Unnamed Creature';
      creature.updatedAt = new Date();
      await creatureService.saveCreature(creature);
      
      // Update local state
      setCreatures(creatures.map(c => c.id === creatureId ? creature : c));
      setEditingNameId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to save name:', error);
      alert('Failed to save name: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCancelEditName = () => {
    setEditingNameId(null);
    setEditingName('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>CritteRL</h1>
      <p>Design creatures and watch them learn through reinforcement learning</p>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleCreateNew} style={{ padding: '10px 20px', fontSize: '16px', marginRight: '10px' }}>
          Create New Creature
        </button>
        <button 
          onClick={() => navigate('/aquarium')} 
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#00BCD4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
        >
          View Aquarium
        </button>
        <button 
          onClick={() => navigate('/physics-test')} 
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
        >
          Physics Test (Ball Drop)
        </button>
        <button 
          onClick={() => navigate('/creature-debug')} 
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#FF5722', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Creature Debug (No Actions)
        </button>
      </div>

      <h2>Your Creatures</h2>
      {loading ? (
        <p>Loading...</p>
      ) : creatures.length === 0 ? (
        <p>No creatures yet. Create your first one!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {creatures.map((creature) => (
            <li
              key={creature.id}
              style={{
                padding: '15px',
                margin: '10px 0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleLoadCreature(creature.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editingNameId === creature.id ? (
                      <>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveName(creature.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEditName();
                            }
                          }}
                          onBlur={() => handleSaveName(creature.id)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            border: '1px solid #2196F3',
                            borderRadius: '4px',
                            flex: 1,
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveName(creature.id);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEditName();
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <strong style={{ fontSize: '18px' }}>{creature.name || 'Unnamed Creature'}</strong>
                        <span
                          onClick={(e) => handleStartEditName(creature, e)}
                          style={{
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#666',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Edit name"
                        >
                          🖋️
                        </span>
                      </>
                    )}
                  </div>
                  <br />
                  <small style={{ color: '#666' }}>
                    {creature.bones.length} bones, {creature.joints.length} joints,{' '}
                    {creature.muscles.length} muscles
                  </small>
                  <br />
                  <small style={{ color: '#666' }}>
                    Updated: {new Date(creature.updatedAt).toLocaleDateString()}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                  <button
                    onClick={(e) => handleLoadCreature(creature.id)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleTrainCreature(creature.id, e)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Train
                  </button>
                  <button
                    onClick={(e) => handleTestCreature(creature.id, e)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#FF9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Test
                  </button>
                </div>
              </div>
              <AquariumCreatureSelector
                creatureDesignId={creature.id}
                onAddToAquarium={handleAddToAquarium}
                onRemoveFromAquarium={handleRemoveFromAquarium}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

