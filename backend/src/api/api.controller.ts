import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { User } from '../users/user.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('api')
export class ApiController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('buy-key')
  async buyKey(@Req() req) {
    const apiKey = 'llm_' + randomBytes(32).toString('hex');

    await this.userRepo.update(
      { id: req.user.id },
      { apiKey, apiKeyQuota: 100 },
    );

    return { apiKey, apiKeyQuota: 100 };
  }
}
