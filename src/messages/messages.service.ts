import { ForbiddenException, Injectable } from '@nestjs/common';
import { FamilyService } from '../family/family.service';
import { PrismaService } from '../prisma/prisma.service';

export type MessageDto = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
};

export type UnreadSummaryDto = {
  total: number;
  /** Unread count keyed by the sender's user id. */
  byPeer: Record<string, number>;
};

const PAGE_SIZE = 50;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly family: FamilyService,
  ) {}

  /**
   * Most recent page first (so a cold open only pays for the tail of a long history), then
   * reversed to chronological order for the caller — a chat thread reads top-to-bottom.
   * `before` pages further back by an earlier message's id.
   */
  async listThread(userId: string, peerId: string, before?: string): Promise<MessageDto[]> {
    await this.assertFamily(userId, peerId);

    let cursorDate: Date | undefined;
    if (before) {
      const cursor = await this.prisma.message.findUnique({ where: { id: before } });
      cursorDate = cursor?.createdAt;
    }

    const rows = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: peerId },
          { senderId: peerId, recipientId: userId },
        ],
        createdAt: cursorDate ? { lt: cursorDate } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    });

    return rows.reverse().map(toDto);
  }

  async unreadSummary(userId: string): Promise<UnreadSummaryDto> {
    const groups = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: { recipientId: userId, readAt: null },
      _count: { _all: true },
    });
    // Only people still in the friend list count: after an unfriend their old unread
    // messages stay in the table but must not keep the badge lit.
    const friends = new Set((await this.family.list(userId)).map((member) => member.userId));
    const byPeer: Record<string, number> = {};
    let total = 0;
    for (const group of groups) {
      if (!friends.has(group.senderId)) continue;
      byPeer[group.senderId] = group._count._all;
      total += group._count._all;
    }
    return { total, byPeer };
  }

  async send(senderId: string, recipientId: string, text: string): Promise<MessageDto> {
    await this.assertFamily(senderId, recipientId);

    const message = await this.prisma.message.create({
      data: { senderId, recipientId, text },
    });

    return toDto(message);
  }

  /** Bulk marks every unread message from `peerId` to `userId` as read. Returns how many
   * changed, so the caller can skip emitting a read receipt when nothing did. */
  async markRead(userId: string, peerId: string): Promise<number> {
    const result = await this.prisma.message.updateMany({
      where: { senderId: peerId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  private async assertFamily(userId: string, otherId: string): Promise<void> {
    const isFamily = await this.family.areFamily(userId, otherId);
    if (!isFamily) {
      throw new ForbiddenException('You can only message people in your family list.');
    }
  }
}

function toDto(message: {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: Date;
  readAt: Date | null;
}): MessageDto {
  return {
    id: message.id,
    senderId: message.senderId,
    recipientId: message.recipientId,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
  };
}
