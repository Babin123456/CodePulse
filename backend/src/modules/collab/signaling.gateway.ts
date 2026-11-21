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

@WebSocketGateway({
  namespace: '/webrtc-signaling',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SignalingGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Signaling peer connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Signaling peer disconnected: ${client.id}`);
  }

  @SubscribeMessage('signal:join-battle')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { battleId: string }) {
    client.join(payload.battleId);
    client.to(payload.battleId).emit('signal:peer-joined', { peerId: client.id });
  }

  @SubscribeMessage('signal:offer-answer')
  handleSignal(@ConnectedSocket() client: Socket, @MessageBody() payload: { battleId: string; signal: any }) {
    client.to(payload.battleId).emit('signal:offer-answer', {
      senderId: client.id,
      signal: payload.signal,
    });
  }
}
