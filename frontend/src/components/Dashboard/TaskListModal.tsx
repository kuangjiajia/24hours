import { useState, useEffect } from 'react';
import type { LinearTask, LinearComment, StatusType } from '../../types';
import { fetchTasksByStatus, fetchIssueWithComments } from '../../services/api';
import { TaskDetail } from './TaskDetail';

interface TaskListModalProps {
  status: StatusType;
  statusLabel: string;
  statusName: string;
  onClose: () => void;
}

export function TaskListModal({
  status,
  statusLabel,
  statusName,
  onClose,
}: TaskListModalProps) {
  const [tasks, setTasks] = useState<LinearTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<{
    task: LinearTask;
    comments: LinearComment[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [statusName]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchTasksByStatus(statusName);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = async (task: LinearTask) => {
    setLoadingDetail(true);
    try {
      const data = await fetchIssueWithComments(task.id);
      if (data) {
        setSelectedTask({ task: data.issue, comments: data.comments });
      }
    } catch (error) {
      console.error('Failed to load task detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const colorMap: Record<StatusType, string> = {
    todo: 'blue',
    inProgress: 'yellow',
    inReview: 'orange',
    done: 'green',
    failed: 'red',
  };

  const color = colorMap[status];
  const borderColor = `border-${color}-500`;
  const textColor = `text-${color}-400`;
  const bgColor = `bg-${color}-500/10`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden border ${borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-700 ${bgColor}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${textColor}`}>
              {statusLabel} - {statusName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[60vh]">
          {/* Task List */}
          <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                No tasks
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={`p-4 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      selectedTask?.task.id === task.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-gray-500 font-mono">
                        {task.identifier}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-400 truncate mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          {task.priority !== undefined && (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                task.priority === 1
                                  ? 'bg-red-500/20 text-red-400'
                                  : task.priority === 2
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : task.priority === 3
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              P{task.priority}
                            </span>
                          )}
                          <span>
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Task Detail */}
          <div className="w-1/2 overflow-y-auto">
            {loadingDetail ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : selectedTask ? (
              <TaskDetail
                task={selectedTask.task}
                comments={selectedTask.comments}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Click a task to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
