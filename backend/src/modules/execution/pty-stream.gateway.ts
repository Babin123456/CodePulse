import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface TerminalSession {
  sessionId: string;
  socketId: string;
  userId: string;
  containerId: string;
  startedAt: number;
  lastActiveAt: number;
}

@WebSocketGateway({
  namespace: '/pty',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PtyStreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PtyStreamGateway.name);
  private sessions: Map<string, TerminalSession> = new Map();

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`PTY Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`PTY Client disconnected: ${client.id}`);
    const session = Array.from(this.sessions.values()).find((s) => s.socketId === client.id);
    if (session) {
      this.sessions.delete(session.sessionId);
      this.logger.log(`Terminated ephemeral container session for ${session.sessionId}`);
    }
  }

  @SubscribeMessage('pty:init')
  handleInit(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; sessionId?: string },
  ) {
    const sessionId = payload.sessionId || `pty-sess-${Math.random().toString(36).substring(2, 9)}`;
    const session: TerminalSession = {
      sessionId,
      socketId: client.id,
      userId: payload.userId,
      containerId: `ephemeral-box-${Math.random().toString(36).substring(2, 8)}`,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    client.emit('pty:ready', {
      sessionId,
      containerId: session.containerId,
      banner: 'Connected to CodePulse Ephemeral PTY Sandbox (xterm.js WebGL)\r\n$ ',
    });
  }

  @SubscribeMessage('pty:input')
  handleInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string; data: string },
  ) {
    const session = this.sessions.get(payload.sessionId);
    if (!session) return;
    session.lastActiveAt = Date.now();

    // Echo input back with simple carriage return execution demonstration
    if (payload.data === '\r') {
      client.emit('pty:output', { sessionId: payload.sessionId, data: '\r\n$ ' });
    } else {
      client.emit('pty:output', { sessionId: payload.sessionId, data: payload.data });
    }
  }

  @SubscribeMessage('pty:resize')
  handleResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string; cols: number; rows: number },
  ) {
    this.logger.debug(`Terminal resized: ${payload.cols}x${payload.rows}`);
  }
}
