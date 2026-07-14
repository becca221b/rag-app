import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { GenerationService } from '../generation/generation.service';
import { MessageRole } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private retrievalService: RetrievalService,
    private generationService: GenerationService,
  ) {}

  async query(userId: string, query: string, sessionId?: string) {
    const relevantChunks = await this.retrievalService.retrieveRelevantChunks(query, 5);
    const context = relevantChunks.map((chunk) => chunk.content);

    const response = await this.generationService.generateResponse(query, context);

    let session;
    if (sessionId) {
      session = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
      if (!session || session.userId !== userId) {
        throw new Error('Invalid session');
      }
    } else {
      session = await this.prisma.chatSession.create({
        data: {
          userId,
          title: query.substring(0, 50),
        },
      });
    }

    await this.prisma.message.createMany({
      data: [
        {
          chatSessionId: session.id,
          role: MessageRole.USER,
          content: query,
        },
        {
          chatSessionId: session.id,
          role: MessageRole.ASSISTANT,
          content: response,
          sources: relevantChunks,
        },
      ],
    });

    return {
      response,
      sources: relevantChunks.map((chunk) => ({
        content: chunk.content,
        documentId: chunk.documentId,
        score: chunk.score,
      })),
      sessionId: session.id,
    };
  }

  async createSession(userId: string) {
    return this.prisma.chatSession.create({
      data: {
        userId,
      },
    });
  }

  async getUserSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session || session.userId !== userId) {
      throw new Error('Session not found');
    }

    return session;
  }
}
