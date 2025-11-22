/**
 * EditorPage - Container for creature editor
 */

import { useSearchParams } from 'react-router-dom';
import CreatureEditor from '../components/CreatureEditor/CreatureEditor';

export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const creatureId = searchParams.get('id');

  return (
    <div style={{ padding: '20px' }}>
      <CreatureEditor initialCreatureId={creatureId || undefined} />
    </div>
  );
}

