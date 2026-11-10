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

interface PlayerState {
  userId: string;
  username: string;
  isReady: boolean;
  socketId: string;
}

interface RoomState {
  battleId: string;
  players: Record<string, PlayerState>;
  currentRound: number;
  totalRounds: number;
  countdownTimer?: NodeJS.Timeout;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/battles',
})
export class BattlesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BattlesGateway.name);
  private rooms: Map<string, RoomState> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to battle socket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Identify which room client was in
    for (const [battleId, room] of this.rooms.entries()) {
      for (const [userId, player] of Object.entries(room.players)) {
        if (player.socketId === client.id) {
          this.logger.warn(`Player ${player.username} (${userId}) disconnected from battle ${battleId}`);

          // Broadcast temporary disconnect notice
          this.server.to(`battle:${battleId}`).emit('player_disconnect_warning', {
            userId,
            username: player.username,
            reconnectWindowSeconds: 30,
          });

          // 30-second grace period before forfeiture
          const timeout = setTimeout(() => {
            delete room.players[userId];
            this.server.to(`battle:${battleId}`).emit('player_forfeit', {
              userId,
              username: player.username,
              message: 'Player failed to reconnect within 30 seconds.',
            });
            this.disconnectTimers.delete(client.id);
          }, 30000);

          this.disconnectTimers.set(client.id, timeout);
          break;
        }
      }
    }
  }

  @SubscribeMessage('player_join')
  handlePlayerJoin(
    @MessageBody() data: { battleId: string; userId: string; username: string },
    @ConnectedSocket() client: Socket
  ) {
    const { battleId, userId, username } = data;
    const roomName = `battle:${battleId}`;

    client.join(roomName);

    if (!this.rooms.has(battleId)) {
      this.rooms.set(battleId, {
        battleId,
        players: {},
        currentRound: 0,
        totalRounds: 5,
      });
    }

    const room = this.rooms.get(battleId)!;

    // Clear any pending disconnect timer if player reconnected
    for (const [socketId, timer] of this.disconnectTimers.entries()) {
      clearTimeout(timer);
      this.disconnectTimers.delete(socketId);
    }

    room.players[userId] = {
      userId,
      username,
      isReady: false,
      socketId: client.id,
    };

    this.logger.log(`User ${username} joined battle room: ${roomName}`);

    // Broadcast updated lobby state
    this.server.to(roomName).emit('lobby_state_update', {
      battleId,
      players: Object.values(room.players),
    });
  }

  @SubscribeMessage('player_ready')
  handlePlayerReady(
    @MessageBody() data: { battleId: string; userId: string },
    @ConnectedSocket() client: Socket
  ) {
    const { battleId, userId } = data;
    const room = this.rooms.get(battleId);
    if (!room || !room.players[userId]) return;

    room.players[userId].isReady = true;
    const roomName = `battle:${battleId}`;

    this.server.to(roomName).emit('player_ready_confirmed', {
      userId,
      players: Object.values(room.players),
    });

    // Check if both players are ready
    const playersList = Object.values(room.players);
    if (playersList.length >= 2 && playersList.every((p) => p.isReady)) {
      this.startCountdown(battleId);
    }
  }

  private startCountdown(battleId: string) {
    const roomName = `battle:${battleId}`;
    let secondsLeft = 3;

    this.server.to(roomName).emit('start_countdown', { count: secondsLeft });

    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        this.server.to(roomName).emit('start_countdown', { count: secondsLeft });
      } else {
        clearInterval(interval);
        this.server.to(roomName).emit('battle_commenced', {
          round: 1,
          metric: 'Commits',
        });
      }
    }, 1000);
  }

  @SubscribeMessage('round_transition')
  handleRoundTransition(
    @MessageBody() data: { battleId: string; nextRound: number; metric: string }
  ) {
    const { battleId, nextRound, metric } = data;
    const room = this.rooms.get(battleId);
    if (room) {
      room.currentRound = nextRound;
      this.server.to(`battle:${battleId}`).emit('round_transition_sync', {
        round: nextRound,
        metric,
      });
    }
  }
}
