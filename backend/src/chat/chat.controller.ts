import { Controller, Post, UseGuards, Body, Get, Param, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { User } from '../common/decorators/user.decorator';
import { ChatQueryDto } from './dto/query.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private chatService: ChatService) {}

  @Post('query')
  async query(@Body() queryDto: ChatQueryDto, @User('id') userId: string) {
    this.logger.log(`[query] Received query request - UserID: ${userId}, Query: ${queryDto.query}, SessionID: ${queryDto.sessionId || 'none'}`);
    this.logger.log(`[query] Calling chatService.query()`);
    return this.chatService.query(userId, queryDto.query, queryDto.sessionId);
  }

  @Post('sessions')
  async createSession(@User('id') userId: string) {
    this.logger.log(`[createSession] Creating session - UserID: ${userId}`);
    return this.chatService.createSession(userId);
  }

  @Get('sessions')
  async getSessions(@User('id') userId: string) {
    this.logger.log(`[getSessions] Getting sessions - UserID: ${userId}`);
    return this.chatService.getUserSessions(userId);
  }

  @Get('sessions/:id')
  async getSession(@Param('id') sessionId: string, @User('id') userId: string) {
    this.logger.log(`[getSession] Getting session - SessionID: ${sessionId}, UserID: ${userId}`);
    return this.chatService.getSession(sessionId, userId);
  }
}
