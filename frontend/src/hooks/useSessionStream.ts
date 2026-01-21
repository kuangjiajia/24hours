import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, SessionMessageEvent, SDKMessage } from '../types/session';
import { parseSDKMessage, updateToolState } from '../utils/sessionMessageParser';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseSessionStreamOptions {
  sessionId: string;
  enabled?: boolean;
}

interface UseSessionStreamResult {
  messages: ChatMessage[];
  isLoading: boolean;
  isLive: boolean;
  isComplete: boolean;
  error: string | null;
}

export function useSessionStream({
  sessionId,
  enabled = true,
}: UseSessionStreamOptions): UseSessionStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef(sessionId);

  // Keep sessionId ref updated
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/claude/sessions/${sessionId}/messages`);
      if (!res.ok) {
        throw new Error(`Failed to load session: ${res.status}`);
      }

      const data: ChatMessage[] = await res.json();
      setMessages(data);

      // Check if session has a result message (completed)
      const hasResult = data.some((msg) => msg.type === 'result');
      setIsComplete(hasResult);
      setIsLive(!hasResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Handle incoming WebSocket message
  const handleSessionMessage = useCallback((event: SessionMessageEvent) => {
    if (event.sessionId !== sessionIdRef.current) return;

    const parsed = parseSDKMessage(event.message as SDKMessage);
    if (!parsed) return;

    const newMessages = Array.isArray(parsed) ? parsed : [parsed];

    setMessages((prev) => {
      let updated = [...prev];

      for (const msg of newMessages) {
        // Check for tool result in user messages to update tool state
        if (msg.type === 'user') {
          // User messages may contain tool results - handled separately
        }

        // Add new message
        updated.push(msg);
      }

      return updated;
    });
  }, []);

  // Handle tool result from user message
  const handleToolResult = useCallback(
    (toolUseId: string, result: unknown, isError: boolean) => {
      setMessages((prev) => updateToolState(prev, toolUseId, result, isError));
    },
    []
  );

  // Handle session completion
  const handleSessionComplete = useCallback(
    (data: { sessionId: string; success: boolean }) => {
      if (data.sessionId !== sessionIdRef.current) return;
      setIsLive(false);
      setIsComplete(true);
    },
    []
  );

  // Setup WebSocket connection
  useEffect(() => {
    if (!enabled || !sessionId) return;

    // Fetch initial messages
    fetchMessages();

    // Connect to WebSocket
    const socket = io(`${SOCKET_URL}/monitor`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Session stream connected');
      // Subscribe to session updates
      socket.emit('subscribe:session', sessionId);
      // Note: Don't set isLive here - let fetchMessages determine the initial state
      // isLive will be set based on whether the session has a result message
    });

    socket.on('disconnect', () => {
      console.log('Session stream disconnected');
      setIsLive(false);
    });

    socket.on('session:message', handleSessionMessage);
    socket.on('session:complete', handleSessionComplete);

    return () => {
      if (socket.connected) {
        socket.emit('unsubscribe:session', sessionId);
      }
      socket.close();
      socketRef.current = null;
    };
  }, [sessionId, enabled, fetchMessages, handleSessionMessage, handleSessionComplete]);

  return {
    messages,
    isLoading,
    isLive,
    isComplete,
    error,
  };
}
