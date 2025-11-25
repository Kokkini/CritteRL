/**
 * TaskSelector - Component for selecting a task before training
 */

import { useState, useEffect } from 'react';
import { TaskService } from '../../services/TaskService';
import { Task } from '../../utils/types';

export interface TaskSelectorProps {
  selectedTaskId: string;
  onTaskSelect: (taskId: string) => void;
}

export default function TaskSelector({ selectedTaskId, onTaskSelect }: TaskSelectorProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const taskService = new TaskService();
        const availableTasks = await taskService.getAvailableTasks();
        setTasks(availableTasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <label htmlFor="task-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
        Select Task:
      </label>
      <select
        id="task-select"
        value={selectedTaskId}
        onChange={(e) => onTaskSelect(e.target.value)}
        style={{
          padding: '8px 12px',
          fontSize: '14px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          minWidth: '200px',
        }}
      >
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.name}
          </option>
        ))}
      </select>
      {tasks.find(t => t.id === selectedTaskId) && (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
          {tasks.find(t => t.id === selectedTaskId)?.description}
        </p>
      )}
    </div>
  );
}

