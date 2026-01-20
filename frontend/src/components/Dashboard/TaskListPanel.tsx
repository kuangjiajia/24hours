import { useState } from 'react';
import type { LinearTask, FilterStatus, StatusType, PriorityType } from '../../types';
import { PRIORITY_MAP, PRIORITY_LABELS, STATUS_MAP } from '../../types';

interface TaskListPanelProps {
  tasks: LinearTask[];
  selectedTaskId: string | null;
  onTaskSelect: (task: LinearTask) => void;
  filter: FilterStatus;
  loading: boolean;
}

export function TaskListPanel({
  tasks,
  selectedTaskId,
  onTaskSelect,
  filter,
  loading,
}: TaskListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.identifier.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'all') return matchesSearch;

    const taskStatus = getTaskStatus(task);
    return matchesSearch && taskStatus === filter;
  });

  function getTaskStatus(task: LinearTask): StatusType {
    const stateName = task.state?.name?.toLowerCase() || '';
    if (stateName.includes('done') || stateName.includes('complete'))
      return 'done';
    if (stateName.includes('progress') || stateName.includes('start'))
      return 'inProgress';
    if (stateName.includes('review')) return 'inReview';
    if (stateName.includes('fail') || stateName.includes('cancel'))
      return 'failed';
    return 'todo';
  }

  function getPriorityLabel(priority?: number): PriorityType {
    return PRIORITY_MAP[priority ?? 0] || 'none';
  }

  function getPriorityColor(priority?: number): string {
    const p = priority ?? 0;
    if (p === 1) return 'bg-red-500 text-white';
    if (p === 2) return 'bg-orange-500 text-white';
    if (p === 3) return 'bg-yellow-500 text-void';
    if (p === 4) return 'bg-blue-500 text-white';
    return 'bg-light-gray text-void';
  }

  function getStatusColor(status: StatusType): string {
    switch (status) {
      case 'inProgress':
        return 'text-genz-yellow';
      case 'inReview':
        return 'text-orange-500';
      case 'done':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Controls */}
      <div className="p-4 border-b-2 border-void/10">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tasks"
            className="w-full bg-light-gray/80 border-2 border-void/20 rounded-full px-6 py-3 font-body text-sm shadow-[0_1px_0_0_rgba(15,15,15,0.12)] placeholder-void/40 transition-[border-color,box-shadow,background-color,transform] duration-200 ease-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-genz-yellow/30 focus:border-void/40 focus:bg-white focus:shadow-[0_6px_16px_rgba(15,15,15,0.10)] focus:-translate-y-0.5"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-10 h-10 border-4 border-genz-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-void/40">
            <div className="text-4xl mb-2">📭</div>
            <div className="font-body">No tasks found</div>
          </div>
        ) : (
          filteredTasks.map((task, index) => {
            const status = getTaskStatus(task);
            const isSelected = task.id === selectedTaskId;
            const priority = getPriorityLabel(task.priority);

            return (
              <button
                key={task.id}
                onClick={() => onTaskSelect(task)}
                style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                className={`
                  w-full text-left p-4 rounded-2xl transition-all duration-200 animate-fade-up
                  ${
                    isSelected
                      ? 'bg-void text-white shadow-lg'
                      : 'bg-white hover:bg-light-gray border-2 border-void/10'
                  }
                `}
              >
                <div className="flex gap-3">
                  {/* Left Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`font-mono text-sm ${isSelected ? 'text-genz-yellow' : 'text-void/60'}`}
                      >
                        [{task.identifier}]
                      </span>
                      <span
                        className={`
                          text-xs px-2 py-0.5 rounded-full font-bold
                          ${getPriorityColor(task.priority)}
                        `}
                      >
                        {PRIORITY_LABELS[priority]}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-genz-yellow font-medium">◀ SELECTED</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className={`font-body font-medium text-sm leading-snug mb-1 line-clamp-1 ${isSelected ? 'text-white' : 'text-void'}`}
                    >
                      {task.title}
                    </h3>

                    {/* Description */}
                    {task.description && (
                      <p
                        className={`text-xs leading-relaxed line-clamp-2 ${isSelected ? 'text-white/70' : 'text-void/50'}`}
                      >
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Right Status */}
                  <div className="flex-shrink-0 flex flex-col items-end justify-center">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        status === 'done'
                          ? 'bg-green-500/20 text-green-500'
                          : status === 'inProgress'
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : status === 'inReview'
                              ? 'bg-orange-500/20 text-orange-500'
                              : status === 'failed'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {STATUS_MAP[status] || status}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
