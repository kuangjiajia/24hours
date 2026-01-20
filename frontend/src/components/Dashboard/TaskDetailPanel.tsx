import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type {
  LinearTask,
  LinearComment,
  RunningTask,
  StatusType,
  PriorityType,
} from '../../types';
import { PRIORITY_MAP, PRIORITY_LABELS, STATUS_MAP } from '../../types';
import { SessionViewerModal } from '../UI/SessionViewerModal';
import { TaskDetailExpandedModal } from './TaskDetailExpandedModal';

interface TaskDetailPanelProps {
  task: LinearTask | null;
  comments: LinearComment[];
  runningTask: RunningTask | null;
  loading: boolean;
  onRetry?: (taskId: string) => Promise<void>;
}

interface TaskDetailContentProps extends TaskDetailPanelProps {
  onExpand?: () => void;
  headerClassName?: string;
}

function getTaskStatus(t: LinearTask): StatusType {
  const stateName = t.state?.name?.toLowerCase() || '';
  if (stateName.includes('done') || stateName.includes('complete'))
    return 'done';
  if (stateName.includes('progress') || stateName.includes('start'))
    return 'inProgress';
  if (stateName.includes('review')) return 'inReview';
  if (stateName.includes('fail') || stateName.includes('cancel'))
    return 'failed';
  return 'todo';
}

function getPriorityType(priority?: number): PriorityType {
  return PRIORITY_MAP[priority ?? 0] || 'none';
}

function getPriorityColor(priority?: number): string {
  const p = priority ?? 0;
  if (p === 1) return 'bg-red-500 text-white';
  if (p === 2) return 'bg-orange-500 text-white';
  if (p === 3) return 'bg-genz-yellow text-void';
  if (p === 4) return 'bg-blue-500 text-white';
  return 'bg-gray-400 text-white';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function TaskDetailContent({
  task,
  comments,
  runningTask,
  loading,
  onRetry,
  onExpand,
  headerClassName,
}: TaskDetailContentProps) {
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionViewerOpen, setSessionViewerOpen] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRetry = async () => {
    if (!task || !onRetry || retrying) return;

    setRetrying(true);
    setRetryMessage(null);

    try {
      await onRetry(task.id);
      setRetryMessage({ type: 'success', text: 'Task queued for retry!' });
      setTimeout(() => setRetryMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry task';
      setRetryMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setRetryMessage(null), 5000);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-light-gray rounded-bento animate-fade-in">
        <div className="w-10 h-10 border-4 border-genz-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-light-gray rounded-bento text-void/40 animate-fade-in">
        <div className="text-6xl mb-4">👈</div>
        <div className="font-heading text-xl">SELECT A TASK</div>
        <div className="font-body text-sm mt-2">
          Click on a task to view details
        </div>
      </div>
    );
  }

  const status = getTaskStatus(task);
  const priorityType = getPriorityType(task.priority);
  const progress = runningTask?.progress ?? 0;
  const isRunning = runningTask !== null;
  const sessionId = runningTask?.sessionId || task.sessionId;
  const sectionTitleClassName =
    'font-heading text-xs tracking-wider uppercase text-void/60';

  return (
    <>
      {/* Header */}
      <div className={`p-6 border-b-2 border-void/10 ${headerClassName ?? ''}`}>
        <div className="flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 text-xs text-void/60">
                <span className="font-mono text-void/70">
                  [{task.identifier}]
                </span>
                <span
                  className={`
                    px-2 py-1 rounded-full text-[11px] font-bold
                    ${getPriorityColor(task.priority)}
                  `}
                >
                  {PRIORITY_LABELS[priorityType]}
                </span>
                <span className="font-body">{formatDate(task.createdAt)}</span>
              </div>
              <h2 className="font-heading text-2xl text-void leading-tight mt-2">
                {task.title}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              {onExpand && (
                <button
                  onClick={onExpand}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-2xl text-void/70 hover:text-void/80 hover:bg-void/5 transition-all duration-200 ease-out hover:scale-105"
                  aria-label="Expand task detail"
                  title="Expand detail"
                >
                  ⤢
                </button>
              )}
              <div
                className="font-mono text-[10px] text-void/40 max-w-[220px] truncate"
                title={task.id}
              >
                ID: {task.id}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status badge */}
            <span
              className={`
                sticker text-xs
                ${status === 'inProgress' ? 'sticker-yellow' : ''}
              `}
            >
              {STATUS_MAP[status]}
            </span>

            {/* Retry button - only show for failed tasks */}
            {status === 'failed' && onRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className={`
                  px-4 py-2 rounded-xl font-bold text-xs
                  transition-all duration-200
                  ${retrying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105'
                  }
                `}
              >
                {retrying ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Retrying...
                  </span>
                ) : (
                  '🔄 Retry Task'
                )}
              </button>
            )}

            {/* Assignee */}
            {task.assignee && (
              <div className="flex items-center gap-2">
                {task.assignee.avatarUrl ? (
                  <img
                    src={task.assignee.avatarUrl}
                    alt={task.assignee.name}
                    className="w-6 h-6 rounded-full border-2 border-void"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-void text-white flex items-center justify-center text-xs font-bold">
                    {task.assignee.name[0]}
                  </div>
                )}
                <span className="font-body text-sm text-void/80">
                  {task.assignee.name}
                </span>
              </div>
            )}
          </div>

          {/* Retry message */}
          {retryMessage && (
            <div
              className={`
                px-4 py-2 rounded-xl text-sm font-medium
                ${retryMessage.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                }
              `}
            >
              {retryMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="space-y-2">
            <div className={sectionTitleClassName}>LABELS</div>
            <div className="flex flex-wrap gap-2">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="px-3 py-1 rounded-full bg-void text-white text-xs font-medium"
                  style={
                    label.color
                      ? { backgroundColor: label.color }
                      : undefined
                  }
                >
                  #{label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Context / Description */}
        {task.description && (
          <div className="space-y-2">
            <div className={sectionTitleClassName}>CONTEXT</div>
            <div className="bg-light-gray rounded-2xl p-4 border-2 border-void/10">
              <p className="font-body text-sm text-void leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          </div>
        )}

        {/* Progress (if running) */}
        {isRunning && (
          <div className="bg-genz-yellow/20 rounded-2xl p-4 border-2 border-genz-yellow/30">
            <div className={sectionTitleClassName}>
              OPTIMIZATION IN PROGRESS
            </div>
            <div className="mt-3 relative h-6 bg-void/10 rounded-full overflow-hidden">
              <div
                className="progress-bar h-full rounded-full"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-void">
                {progress}%
              </div>
            </div>
            {runningTask?.currentStep && (
              <div className="mt-2 font-body text-xs text-void/60">
                {runningTask.currentStep}
              </div>
            )}
          </div>
        )}

        {/* Session ID */}
        {sessionId && (
          <div className="space-y-2">
            <div className={sectionTitleClassName}>CLAUDE CODE SESSION</div>
            <div className="bg-purple-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 min-w-[200px] font-mono text-xs bg-white/50 rounded-lg px-3 py-2 text-void/80 truncate">
                  {sessionId}
                </code>
                <button
                  onClick={() => copyToClipboard(sessionId)}
                  className="px-3 py-2 bg-void text-white text-xs font-bold rounded-lg hover:bg-void/80 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setSessionViewerOpen(true)}
                  className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  View Source
                </button>
              </div>
              <div className="mt-2 font-body text-xs text-void/50">
                Use this ID to view execution logs in Claude Code
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        {comments.length > 0 && (
          <div className="space-y-2">
            <div className={sectionTitleClassName}>
              COMMENTS ({comments.length})
            </div>
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-light-gray rounded-xl p-3 border-2 border-void/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {comment.user?.avatarUrl ? (
                      <img
                        src={comment.user.avatarUrl}
                        alt={comment.user.name}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-void text-white flex items-center justify-center text-xs">
                        {comment.user?.name?.[0] || '?'}
                      </div>
                    )}
                    <span className="font-body text-xs font-medium">
                      {comment.user?.name || 'Unknown'}
                    </span>
                    <span className="font-body text-xs text-void/40">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className="font-body text-sm text-void/80 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:bg-void prose-pre:text-white prose-code:text-pink-600 prose-code:before:content-none prose-code:after:content-none">
                    <ReactMarkdown>{comment.body}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session Viewer Modal */}
      {sessionId && (
        <SessionViewerModal
          isOpen={sessionViewerOpen}
          onClose={() => setSessionViewerOpen(false)}
          sessionId={sessionId}
        />
      )}
    </>
  );
}

export function TaskDetailPanel({
  task,
  comments,
  runningTask,
  loading,
  onRetry,
}: TaskDetailPanelProps) {
  const [detailExpandedOpen, setDetailExpandedOpen] = useState(false);
  const showCardFrame = !loading && task !== null;

  const panelContent = (
    <TaskDetailContent
      task={task}
      comments={comments}
      runningTask={runningTask}
      loading={loading}
      onRetry={onRetry}
      onExpand={() => setDetailExpandedOpen(true)}
    />
  );

  return (
    <>
      {showCardFrame ? (
        <div className="h-full flex flex-col bg-white rounded-bento overflow-hidden border-2 border-void/10 animate-fade-in">
          {panelContent}
        </div>
      ) : (
        panelContent
      )}
      <TaskDetailExpandedModal
        isOpen={detailExpandedOpen}
        onClose={() => setDetailExpandedOpen(false)}
      >
        <TaskDetailContent
          task={task}
          comments={comments}
          runningTask={runningTask}
          loading={loading}
          onRetry={onRetry}
          headerClassName="pr-14"
        />
      </TaskDetailExpandedModal>
    </>
  );
}
