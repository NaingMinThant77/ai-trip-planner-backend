import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { AgentMessageDto, AgentReplyDto, AgentService } from './agent.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get('conversations')
  async listConversations(@CurrentUser() user: SafeUser) {
    return this.agent.listConversations(user.id);
  }

  @Get('conversations/:id/messages')
  async listMessages(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<AgentMessageDto[]> {
    return this.agent.listMessages(id, user.id);
  }

  @Post('messages')
  async sendMessage(
    @CurrentUser() user: SafeUser,
    @Body() dto: SendMessageDto,
  ): Promise<AgentReplyDto> {
    return this.agent.sendMessage(user, dto);
  }
}
