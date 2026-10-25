import { Body, Controller, Get, HttpCode, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { AgentSaveService, SaveResultDto } from './agent-save.service';
import { AgentMessageDto, AgentService, AgentStreamEvent } from './agent.service';
import { SaveBlockDto } from './dto/save-block.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(
    private readonly agent: AgentService,
    private readonly saver: AgentSaveService,
  ) {}

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

  /** Server-sent events: `meta`, then `text_delta` / `block` as they arrive, then `done`. */
  @Post('stream')
  @HttpCode(200)
  async stream(
    @CurrentUser() user: SafeUser,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    // Stops the model call (and the spend) as soon as the app drops the connection.
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    const events = this.agent.streamMessage(user, dto, abort.signal);

    // Awaiting the first event before writing headers keeps pre-stream failures (404 for an
    // unknown conversation) as ordinary JSON errors rather than a 200 stream carrying an error.
    const first = await events.next();

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Stops nginx-style proxies from buffering the stream into one lump.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      if (!first.done) writeEvent(res, first.value);
      for await (const event of events) {
        if (abort.signal.aborted) break;
        writeEvent(res, event);
      }
    } catch {
      writeEvent(res, {
        event: 'error',
        data: { message: 'The assistant did not reply. Please try again.' },
      });
    } finally {
      res.end();
    }
  }

  @Post('save')
  @HttpCode(200)
  async save(@CurrentUser() user: SafeUser, @Body() dto: SaveBlockDto): Promise<SaveResultDto> {
    return this.saver.save(user, dto);
  }
}

function writeEvent(res: Response, event: AgentStreamEvent): void {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
}
