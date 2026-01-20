import type { LinearTask, LinearComment } from '../../types';

interface TaskDetailProps {
  task: LinearTask;
  comments: LinearComment[];
}

export function TaskDetail({ task, comments }: TaskDetailProps) {
  return (
    <div className="p-4">
      {/* Task Info */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-500 font-mono">
            {task.identifier}
          </span>
          {task.priority !== undefined && (
            <span
              className={`px-2 py-0.5 rounded text-xs ${
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
        </div>
        <h2 className="text-lg font-bold mb-3">{task.title}</h2>
        {task.description && (
          <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
            {task.description}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-2">
          Created: {new Date(task.createdAt).toLocaleString()}
        </div>
      </div>

      {/* Comments */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          Comments ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">No comments</div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  {comment.user?.avatarUrl ? (
                    <img
                      src={comment.user.avatarUrl}
                      alt={comment.user.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                      {comment.user?.name?.[0] || '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {comment.user?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap pl-9">
                  {formatCommentBody(comment.body)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatCommentBody(body: string): string {
  // Simple markdown-like formatting: handle code blocks
  return body
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.slice(3, -3).trim();
      return `\n${code}\n`;
    })
    .trim();
}
