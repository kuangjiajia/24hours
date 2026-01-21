import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface TaskUpdateEvent {
  taskId: string;
  identifier: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  currentStep?: string;
  startedAt?: Date;
  duration?: number;
  sessionId?: string;
}

export interface LogEvent {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  taskId?: string;
  message: string;
}

export interface StatsEvent {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  failed: number;
  queueLength: number;
}

export interface SessionMessageEvent {
  sessionId: string;
  message: unknown;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/monitor',
})
export class MonitorGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MonitorGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcast task status update
   */
  broadcastTaskUpdate(data: TaskUpdateEvent) {
    this.server.emit('task:update', data);
  }

  /**
   * Broadcast new log
   */
  broadcastLog(data: LogEvent) {
    this.server.emit('log:new', data);
  }

  /**
   * Broadcast stats update
   */
  broadcastStats(data: StatsEvent) {
    this.server.emit('stats:update', data);
  }

  @SubscribeMessage('subscribe:task')
  handleSubscribeTask(client: Socket, taskId: string) {
    client.join(`task:${taskId}`);
    this.logger.log(`Client ${client.id} subscribed to task ${taskId}`);
  }

  @SubscribeMessage('unsubscribe:task')
  handleUnsubscribeTask(client: Socket, taskId: string) {
    client.leave(`task:${taskId}`);
  }

  /**
   * Subscribe to session messages for real-time streaming
   */
  @SubscribeMessage('subscribe:session')
  handleSubscribeSession(client: Socket, sessionId: string) {
    client.join(`session:${sessionId}`);
    this.logger.log(`Client ${client.id} subscribed to session ${sessionId}`);
  }

  /**
   * Unsubscribe from session messages
   */
  @SubscribeMessage('unsubscribe:session')
  handleUnsubscribeSession(client: Socket, sessionId: string) {
    client.leave(`session:${sessionId}`);
    this.logger.log(`Client ${client.id} unsubscribed from session ${sessionId}`);
  }

  /**
   * Broadcast session message to subscribers
   */
  broadcastSessionMessage(data: SessionMessageEvent) {
    this.server.to(`session:${data.sessionId}`).emit('session:message', data);
  }

  /**
   * Broadcast session completion
   */
  broadcastSessionComplete(sessionId: string, success: boolean) {
    this.server.to(`session:${sessionId}`).emit('session:complete', {
      sessionId,
      success,
      timestamp: new Date(),
    });
  }
}
