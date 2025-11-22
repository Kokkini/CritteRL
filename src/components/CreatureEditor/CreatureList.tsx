/**
 * CreatureList - Display saved creatures and allow loading
 */

import { useState, useEffect } from 'react';
import { CreatureDesign } from '../../utils/types';
import { CreatureService } from '../../services/CreatureService';
import { StorageService } from '../../services/StorageService';

interface CreatureListProps {
  onLoadCreature: (id: string) => void;
}

export default function CreatureList({ onLoadCreature }: CreatureListProps) {
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

  if (loading) {
    return <div>Loading creatures...</div>;
  }

  if (creatures.length === 0) {
    return <div>No saved creatures</div>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {creatures.map((creature) => (
        <li
          key={creature.id}
          style={{
            padding: '10px',
            margin: '10px 0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={() => onLoadCreature(creature.id)}
        >
          <strong>{creature.name || 'Unnamed Creature'}</strong>
          <br />
          <small>
            {creature.bones.length} bones, {creature.joints.length} joints,{' '}
            {creature.muscles.length} muscles
          </small>
        </li>
      ))}
    </ul>
  );
}

