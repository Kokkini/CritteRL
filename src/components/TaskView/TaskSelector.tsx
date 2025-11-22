/**
 * TaskSelector - UI for selecting a task to test
 */

import { useState, useEffect } from 'react';
import { Task } from '../../utils/types';
import { TaskService } from '../../services/TaskService';

interface TaskSelectorProps {
  selectedTask: Task | null;
  onTaskSelect: (task: Task) => void;
  taskService: TaskService | null;
}

export default function TaskSelector({
  selectedTask,
  onTaskSelect,
  taskService,
}: TaskSelectorProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      if (!taskService) return;

      try {
        const availableTasks = await taskService.getAvailableTasks();
        setTasks(availableTasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [taskService]);

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div>
      <label>
        <strong>Select Task:</strong>
        <select
          value={selectedTask?.id || ''}
          onChange={(e) => {
            const task = tasks.find((t) => t.id === e.target.value);
            if (task) {
              onTaskSelect(task);
            }
          }}
          style={{ marginLeft: '10px', padding: '5px', fontSize: '14px' }}
        >
          <option value="">-- Select Task --</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </label>
      {selectedTask && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          {selectedTask.description}
        </div>
      )}
    </div>
  );
}

