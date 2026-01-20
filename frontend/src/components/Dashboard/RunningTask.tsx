import type { RunningTask as RunningTaskType } from '../../types';

interface RunningTaskProps {
  task: RunningTaskType;
}

export function RunningTask({ task }: RunningTaskProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono text-sm">
              {task.identifier}
            </span>
            <span className="text-white font-medium">{task.title}</span>
          </div>
          <div className="text-gray-400 text-sm mt-1">
            Status: Running ({formatDuration(task.duration)})
          </div>
        </div>
        <a
          href={`https://linear.app/kaitox/issue/${task.identifier}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          View in Linear
        </a>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Progress</span>
          <span className="text-white">{task.progress}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {task.currentStep && (
        <div className="mt-3 text-sm">
          <span className="text-gray-400">Latest: </span>
          <span className="text-green-400">{task.currentStep}</span>
        </div>
      )}
    </div>
  );
}
