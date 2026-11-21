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
  namespace: '/quic-relay',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class QuicRelayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(QuicRelayGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`QUIC fallback relay connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`QUIC fallback relay disconnected: ${client.id}`);
  }

  @SubscribeMessage('quic:datagram')
  handleDatagram(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string; frameId: number; keystroke: string },
  ) {
    // Broadcast datagram frame with sub-millisecond overhead
    client.to(payload.battleId).emit('quic:datagram:relay', payload);
  }
}
