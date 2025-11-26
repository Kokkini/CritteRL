import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import TrainingPage from './pages/TrainingPage';
import TestPage from './pages/TestPage';
import PhysicsTestPage from './pages/PhysicsTestPage';
import CreatureDebugPage from './pages/CreatureDebugPage';
import AquariumPage from './pages/AquariumPage';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/physics-test" element={<PhysicsTestPage />} />
        <Route path="/creature-debug" element={<CreatureDebugPage />} />
        <Route path="/aquarium" element={<AquariumPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

