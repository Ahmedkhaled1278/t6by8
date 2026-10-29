import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../database/prisma.service';
import { readSessionToken } from '../../common/session-token';

function corsOrigins(): string | string[] {
  const raw = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const mobile = ['https://localhost', 'http://localhost', 'capacitor://localhost', 'ionic://localhost'];
  return [...new Set([...list, ...mobile])];
}

@WebSocketGateway({
  cors: {
    origin: corsOrigins(),
    credentials: true,
  },
  namespace: '/ws',
})
export class MessagingGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie as string | undefined;
      const authToken =
        typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : undefined;
      const authHeader =
        typeof client.handshake.headers.authorization === 'string'
          ? client.handshake.headers.authorization
          : authToken
            ? `Bearer ${authToken}`
            : undefined;
      const token = readSessionToken(cookieHeader, authHeader);
      const current = await this.auth.current(token);
      (client.data as { userId?: string }).userId = current.user.id;
      await client.join(`user:${current.user.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: string }) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId || !body?.conversationId) return { ok: false };
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: body.conversationId, userId } },
    });
    if (!member) return { ok: false };
    await client.join(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  emitNewMessage(conversationId: string, memberUserIds: string[], message: unknown) {
    this.server.to(`conversation:${conversationId}`).emit('message:new', { conversationId, message });
    for (const uid of memberUserIds) {
      this.server.to(`user:${uid}`).emit('conversation:updated', { conversationId, message });
    }
  }
}
