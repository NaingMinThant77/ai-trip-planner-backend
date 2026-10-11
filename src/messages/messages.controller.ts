import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { MessageDto, MessagesService, UnreadSummaryDto } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /** Declared before `:peerId` so "unread" is not captured as a peer id. */
  @Get('unread/summary')
  async unread(@CurrentUser() user: SafeUser): Promise<UnreadSummaryDto> {
    return this.messages.unreadSummary(user.id);
  }

  /** History only — sending happens over the socket connection (`chat.gateway.ts`) so it can
   * be delivered live, not through this REST route. */
  @Get(':peerId')
  async listThread(
    @CurrentUser() user: SafeUser,
    @Param('peerId') peerId: string,
    @Query('before') before?: string,
  ): Promise<MessageDto[]> {
    return this.messages.listThread(user.id, peerId, before);
  }
}
