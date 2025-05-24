import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsAuthGuard } from '../auth/ws-auth.guard';
import { Role } from '../common/constants';
import { Roles } from '../common/roles.decorator';
import { WsRolesGuard } from '../guards/ws-roles.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EventsGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(@MessageBody() data: string): string {
    this.server.emit('receiveMessage', `Server received: ${data}`);
    return 'Message received by server';
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  @SubscribeMessage('adminBroadcast')
  handleAdminBroadcast(@MessageBody() data: { event: string; payload: any }) {
    this.logger.log(`Admin broadcast received: ${data.event}`);
    this.server.emit(data.event, data.payload);
    return 'Broadcast sent';
  }

  emitToAll(event: string, payload: any) {
    this.server.emit(event, payload);
  }

  emitToRole(role: Role, event: string, payload: any) {
    this.server.emit(event, payload);
    this.logger.log(`Emitting ${event} to all for role ${role}`);
  }
}
