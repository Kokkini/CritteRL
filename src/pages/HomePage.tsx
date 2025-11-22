/**
 * HomePage - Main landing page with navigation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatureService } from '../services/CreatureService';
import { StorageService } from '../services/StorageService';
import { CreatureDesign } from '../utils/types';

export default function HomePage() {
  const navigate = useNavigate();
  const [creatures, setCreatures] = useState<CreatureDesign[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>CritteRL</h1>
      <p>Design creatures and watch them learn through reinforcement learning</p>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleCreateNew} style={{ padding: '10px 20px', fontSize: '16px', marginRight: '10px' }}>
          Create New Creature
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
                  <strong style={{ fontSize: '18px' }}>{creature.name || 'Unnamed Creature'}</strong>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

