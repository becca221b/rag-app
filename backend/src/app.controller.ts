import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { OpenSearchService } from './opensearch/opensearch.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly openSearchService: OpenSearchService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('reset-index')
  async resetIndex(): Promise<{ message: string }> {
    await this.openSearchService.deleteIndex();
    return { message: 'Index deleted. Restart the backend to recreate it with the new dimension.' };
  }
}
