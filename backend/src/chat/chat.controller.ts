import { Controller, Post, UseGuards, Body, Get, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { User } from '../common/decorators/user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('query')
  async query(@Body('query') query: string, @User('id') userId: string) {
    return this.chatService.query(userId, query);
  }

  @Post('sessions')
  async createSession(@User('id') userId: string) {
    return this.chatService.createSession(userId);
  }

  @Get('sessions')
  async getSessions(@User('id') userId: string) {
    return this.chatService.getUserSessions(userId);
  }

  @Get('sessions/:id')
  async getSession(@Param('id') sessionId: string, @User('id') userId: string) {
    return this.chatService.getSession(sessionId, userId);
  }
}
