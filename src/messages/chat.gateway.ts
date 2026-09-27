import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.service';
import { FamilyService } from '../family/family.service';
import { SafeUser, UsersService } from '../users/users.service';
import { MessagesService } from './messages.service';

type AuthedSocket = Socket & { data: { user: SafeUser } };

/**
 * Real-time delivery for direct messages. History and the initial thread load go through the
 * plain REST `MessagesController` — this gateway only carries `message:send`/`message:read`
 * so a connected peer sees them instantly, and persists via the same `MessagesService` either
 * way so a message still arrives (just not live) if the recipient is offline.
 *
 * No path/namespace override: Socket.IO listens on its own `/socket.io` path on the same HTTP
 * server, which never collides with Nest's `app.setGlobalPrefix('api')` — that prefix only
 * applies to regular HTTP controllers.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly family: FamilyService,
    private readonly messages: MessagesService,
  ) {}

  /**
   * Authenticates the handshake by hand (there is no HTTP request here for `JwtAuthGuard` to
   * run against) using the same secret and payload shape as the REST JWT strategy, then joins
   * a room named by the user's id — `server.to(userId)` below reaches every device/tab that
   * user has open, not just this one socket.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = readToken(client);
      if (!token) throw new Error('No token on handshake.');

      const secret = this.config.get<string>('JWT_SECRET');
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret });

      const user = await this.users.findSafeById(payload.sub);
      if (!user) throw new Error('Account no longer exists.');

      (client as AuthedSocket).data.user = user;
      await client.join(user.id);
    } catch (error) {
      this.logger.warn(`Rejected socket connection: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { recipientId?: unknown; text?: unknown },
  ) {
    const me = client.data.user;
    const recipientId = typeof body.recipientId === 'string' ? body.recipientId : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!recipientId || !text || text.length > 4000) {
      throw new WsException('A recipient and non-empty text (max 4000 chars) are required.');
    }

    const isFamily = await this.family.areFamily(me.id, recipientId);
    if (!isFamily) {
      throw new WsException('You can only message people in your family list.');
    }

    const message = await this.messages.send(me.id, recipientId, text);

    // Sender's other devices/tabs get the same event so every surface stays in sync; the
    // frontend reconciles by message id against whatever it optimistically appended.
    this.server.to(recipientId).emit('message:new', message);
    this.server.to(me.id).emit('message:new', message);

    return message;
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { peerId?: unknown },
  ) {
    const me = client.data.user;
    const peerId = typeof body.peerId === 'string' ? body.peerId : '';
    if (!peerId) throw new WsException('peerId is required.');

    const changed = await this.messages.markRead(me.id, peerId);
    if (changed > 0) {
      this.server.to(peerId).emit('message:read', { by: me.id });
    }

    return { changed };
  }
}

function readToken(client: Socket): string | null {
  const fromAuth = client.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;

  const fromQuery = client.handshake.query?.token;
  if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery;

  return null;
}
