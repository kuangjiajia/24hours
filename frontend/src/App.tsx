import { useState } from 'react';
import { useTaskMonitor } from './hooks/useTaskMonitor';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { StatusCardsBento } from './components/Dashboard/StatusCardsBento';
import { TaskListPanel } from './components/Dashboard/TaskListPanel';
import { TaskDetailPanel } from './components/Dashboard/TaskDetailPanel';
import type { NavItem, FilterStatus } from './types';

export default function App() {
  const [activeNav, setActiveNav] = useState<NavItem>('tasks');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const {
    isConnected,
    stats,
    allTasks,
    tasksLoading,
    selectedTask,
    selectedTaskComments,
    selectedTaskLoading,
    selectTask,
    getRunningTaskByIdentifier,
    retryTask,
  } = useTaskMonitor();

  const runningTask = selectedTask
    ? getRunningTaskByIdentifier(selectedTask.identifier)
    : null;

  // Wrapper for retryTask to match TaskDetailPanel's onRetry signature
  const handleRetry = async (taskId: string): Promise<void> => {
    await retryTask(taskId);
  };

  return (
    <div className="h-screen bg-bone flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <Header isConnected={isConnected} />

        {/* Content */}
        <main className="flex-1 p-8 overflow-hidden min-h-0">
          <div className="h-full flex flex-col gap-6">
            {/* Status Cards Bento Grid */}
            <StatusCardsBento
              stats={stats}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            {/* Divider */}
            <div className="h-0.5 bg-void/10 rounded-full" />

            {/* Main Content Area - Task List + Detail Panel */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 min-h-0 overflow-hidden">
              {/* Task List Panel */}
              <div className="bg-white rounded-bento border-2 border-void/10 overflow-hidden h-full min-h-0">
                <TaskListPanel
                  tasks={allTasks}
                  selectedTaskId={selectedTask?.id || null}
                  onTaskSelect={selectTask}
                  filter={activeFilter}
                  loading={tasksLoading}
                />
              </div>

              {/* Task Detail Panel */}
              <div className="h-full min-h-0 overflow-hidden">
                <TaskDetailPanel
                  task={selectedTask}
                  comments={selectedTaskComments}
                  runningTask={runningTask}
                  loading={selectedTaskLoading}
                  onRetry={handleRetry}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
