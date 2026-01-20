import type { QueuedTask } from '../../types';

interface TaskQueueProps {
  tasks: QueuedTask[];
}

export function TaskQueue({ tasks }: TaskQueueProps) {
  const formatWaitTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const priorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'P1';
      case 2:
        return 'P2';
      case 3:
        return 'P3';
      case 4:
        return 'P4';
      default:
        return '-';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="font-semibold flex items-center gap-2">Task Queue</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Wait Time</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <tr key={task.id} className="border-t border-gray-700/50">
                  <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-2 text-yellow-400 font-mono">
                    {task.identifier}
                  </td>
                  <td className="px-4 py-2 text-white truncate max-w-[200px]">
                    {task.title}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        task.priority === 1
                          ? 'bg-red-500/20 text-red-400'
                          : task.priority === 2
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {formatWaitTime(task.waitingTime)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Queue is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
