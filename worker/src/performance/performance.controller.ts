import { Controller, Get, Post, Body } from '@nestjs/common';
import { PerformanceService } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // 📜 Historical performance
  @Get('runs')
  async getRecentRuns() {
    return this.service.getRecentRuns();
  }

  // ⚡ LIVE performance (1 row per provider)
  @Get('live')
  async getLiveRuns() {
    return this.service.getLiveRuns();
  }

  // 🔒 Admin/system
  @Post('prompts')
  async createPrompt(
    @Body() body: { name: string; content: string }
  ) {
    return this.service.createPrompt(body.name, body.content);
  }

  // 🔓 Public
  @Get('prompts')
  async getActivePrompts() {
    return this.service.getActivePrompts();
  }
}
