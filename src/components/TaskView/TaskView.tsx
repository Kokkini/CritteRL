/**
 * TaskView - Component for testing trained creatures on tasks
 */

import { useState, useEffect, useRef } from 'react';
import { TaskResult, TrainedModel, CreatureDesign, Task } from '../../utils/types';
import { TaskService } from '../../services/TaskService';
import { TrainingService } from '../../services/TrainingService';
import { CreatureService } from '../../services/CreatureService';
import { StorageService } from '../../services/StorageService';
import TaskSelector from './TaskSelector';
import ModelSelector from './ModelSelector';
import TaskResults from './TaskResults';
import PerformanceHistory from './PerformanceHistory';

interface TaskViewProps {
  creatureDesignId: string;
  onTestComplete?: (result: TaskResult) => void;
}

export default function TaskView({ creatureDesignId, onTestComplete }: TaskViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedModel, setSelectedModel] = useState<TrainedModel | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TaskResult | null>(null);
  const [history, setHistory] = useState<TaskResult[]>([]);
  const [creatureDesign, setCreatureDesign] = useState<CreatureDesign | null>(null);

  const taskServiceRef = useRef<TaskService | null>(null);
  const trainingServiceRef = useRef<TrainingService | null>(null);
  const creatureServiceRef = useRef<CreatureService | null>(null);

  useEffect(() => {
    const init = async () => {
      const storage = new StorageService();
      await storage.initialize();
      taskServiceRef.current = new TaskService(storage);
      trainingServiceRef.current = new TrainingService(storage, taskServiceRef.current);
      creatureServiceRef.current = new CreatureService(storage);

      // Load creature design
      const design = await creatureServiceRef.current.loadCreature(creatureDesignId);
      if (design) {
        setCreatureDesign(design);
      }

      // Load default task
      const defaultTask = taskServiceRef.current.getDefaultTask();
      setSelectedTask(defaultTask);

      // Load history
      if (defaultTask) {
        const taskHistory = await taskServiceRef.current.getTaskHistory(
          creatureDesignId,
          defaultTask.id
        );
        setHistory(taskHistory);
      }
    };
    init();
  }, [creatureDesignId]);

  const handleStartTest = async () => {
    if (!selectedTask || !selectedModel || !creatureDesign || !taskServiceRef.current) {
      alert('Please select a task and model');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await taskServiceRef.current.testCreature(
        creatureDesign,
        selectedModel,
        selectedTask.id
      );

      setTestResult(result);
      setHistory([result, ...history]);

      if (onTestComplete) {
        onTestComplete(result);
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsTesting(false);
    }
  };

  const handleTaskChange = async (task: Task) => {
    setSelectedTask(task);
    setTestResult(null);

    // Load history for new task
    if (taskServiceRef.current) {
      const taskHistory = await taskServiceRef.current.getTaskHistory(
        creatureDesignId,
        task.id
      );
      setHistory(taskHistory);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Test Creature</h2>

      {creatureDesign && (
        <div style={{ marginBottom: '20px' }}>
          <p>
            <strong>Creature:</strong> {creatureDesign.name || 'Unnamed'}
          </p>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <TaskSelector
          selectedTask={selectedTask}
          onTaskSelect={handleTaskChange}
          taskService={taskServiceRef.current}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <ModelSelector
          creatureDesignId={creatureDesignId}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          trainingService={trainingServiceRef.current}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleStartTest}
          disabled={!selectedTask || !selectedModel || isTesting}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          {isTesting ? 'Testing...' : 'Start Test'}
        </button>
      </div>

      {testResult && (
        <div style={{ marginBottom: '20px' }}>
          <TaskResults result={testResult} />
        </div>
      )}

      {history.length > 0 && (
        <div>
          <PerformanceHistory history={history} />
        </div>
      )}
    </div>
  );
}

