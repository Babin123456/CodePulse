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
  namespace: '/voice-assistant',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class VoiceAssistantGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VoiceAssistantGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Voice client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Voice client disconnected: ${client.id}`);
  }

  @SubscribeMessage('voice:query')
  async handleVoiceQuery(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { transcript: string; contextRepo?: string },
  ) {
    const { transcript, contextRepo } = payload;
    this.logger.log(`Processing voice query: "${transcript}" in repo: ${contextRepo || 'global'}`);

    // Simulate RAG vector embedding retrieval & TTS synthesis
    const verbalResponse = `Based on the architecture of ${contextRepo || 'this repository'}, the main module routes requests via NestJS gateways and persists state to PostgreSQL with Prisma ORM.`;

    client.emit('voice:response', {
      verbalResponse,
      referencedFiles: [
        'backend/src/app.module.ts',
        'backend/src/modules/battles/battles.gateway.ts',
        'backend/prisma/schema.prisma',
      ],
      timestamp: Date.now(),
    });
  }
}
