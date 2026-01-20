import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  fetchDashboard,
  fetchQueue,
  fetchAllTasks,
  fetchIssueWithComments,
  fetchTaskSession,
  pauseExecution,
  resumeExecution,
  retryTask as retryTaskApi,
} from '../services/api';
import type {
  Stats,
  RunningTask,
  QueuedTask,
  Log,
  TaskUpdateEvent,
  StatsEvent,
  LinearTask,
  LinearComment,
} from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useTaskMonitor() {
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState<Stats>({
    todo: 0,
    inProgress: 0,
    inReview: 0,
    done: 0,
    failed: 0,
  });
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<QueuedTask[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [allTasks, setAllTasks] = useState<LinearTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // Selected task state
  const [selectedTask, setSelectedTask] = useState<LinearTask | null>(null);
  const [selectedTaskComments, setSelectedTaskComments] = useState<LinearComment[]>([]);
  const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);
  const selectRequestIdRef = useRef(0);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      const dashboardData = await fetchDashboard();

      setStats(dashboardData.linear);
      setRunningTasks(dashboardData.runningTasks || []);

      const queueData = await fetchQueue();
      setQueuedTasks(queueData);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  }, []);

  // Fetch all tasks from Linear
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const tasks = await fetchAllTasks();
      setAllTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // Select a task and load its details
  const selectTask = useCallback(async (task: LinearTask) => {
    const requestId = ++selectRequestIdRef.current;
    setSelectedTask(task);
    setSelectedTaskLoading(true);
    try {
      // Fetch issue details and session ID in parallel
      const [issueData, sessionData] = await Promise.all([
        fetchIssueWithComments(task.id),
        fetchTaskSession(task.id),
      ]);

      if (selectRequestIdRef.current !== requestId) {
        return;
      }

      if (issueData) {
        // Add sessionId to the task
        setSelectedTask({
          ...issueData.issue,
          sessionId: sessionData.sessionId || undefined,
        });
        setSelectedTaskComments(issueData.comments);
      } else {
        // Still try to set sessionId even if issue fetch failed
        setSelectedTask({
          ...task,
          sessionId: sessionData.sessionId || undefined,
        });
      }
    } catch (error) {
      console.error('Failed to load task details:', error);
    } finally {
      if (selectRequestIdRef.current === requestId) {
        setSelectedTaskLoading(false);
      }
    }
  }, []);

  // Toggle pause/resume
  const togglePause = useCallback(async () => {
    try {
      if (isPaused) {
        await resumeExecution();
        setIsPaused(false);
      } else {
        await pauseExecution();
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Failed to toggle pause:', error);
    }
  }, [isPaused]);

  // Handle task update
  const handleTaskUpdate = useCallback((data: TaskUpdateEvent) => {
    if (data.status === 'running') {
      setRunningTasks((prev) => {
        const existing = prev.find((t) => t.taskId === data.taskId);
        if (existing) {
          return prev.map((t) =>
            t.taskId === data.taskId ? { ...t, ...data, sessionId: data.sessionId || t.sessionId } : t
          );
        }
        return [
          ...prev,
          {
            taskId: data.taskId,
            identifier: data.identifier,
            title: '',
            progress: data.progress || 0,
            currentStep: data.currentStep,
            startedAt: data.startedAt || new Date(),
            duration: data.duration || 0,
            sessionId: data.sessionId,
          },
        ];
      });
    } else if (data.status === 'completed' || data.status === 'failed') {
      setRunningTasks((prev) => prev.filter((t) => t.taskId !== data.taskId));
    }
  }, []);

  // Handle stats update
  const handleStatsUpdate = useCallback((data: StatsEvent) => {
    setStats({
      todo: data.todo,
      inProgress: data.inProgress,
      inReview: data.inReview,
      done: data.done,
      failed: data.failed,
    });
  }, []);

  // Handle new log
  const handleNewLog = useCallback((data: Log) => {
    setLogs((prev) => [...prev.slice(-99), data]); // Keep last 100 logs
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/monitor`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      fetchInitialData();
      fetchTasks();
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('task:update', handleTaskUpdate);
    newSocket.on('stats:update', handleStatsUpdate);
    newSocket.on('log:new', handleNewLog);

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [fetchInitialData, fetchTasks, handleTaskUpdate, handleStatsUpdate, handleNewLog]);

  // Clear logs
  const clearLogs = () => setLogs([]);

  // Get running task by identifier
  const getRunningTaskByIdentifier = useCallback(
    (identifier: string): RunningTask | null => {
      return runningTasks.find((t) => t.identifier === identifier) || null;
    },
    [runningTasks]
  );

  // Retry a failed task
  const retryTask = useCallback(async (taskId: string) => {
    try {
      const result = await retryTaskApi(taskId);
      // Refresh data after retry
      await fetchInitialData();
      await fetchTasks();
      return result;
    } catch (error) {
      console.error('Failed to retry task:', error);
      throw error;
    }
  }, [fetchInitialData, fetchTasks]);

  return {
    isConnected,
    isPaused,
    stats,
    runningTasks,
    queuedTasks,
    logs,
    allTasks,
    tasksLoading,
    selectedTask,
    selectedTaskComments,
    selectedTaskLoading,
    clearLogs,
    refresh: fetchInitialData,
    refreshTasks: fetchTasks,
    selectTask,
    togglePause,
    getRunningTaskByIdentifier,
    retryTask,
  };
}
