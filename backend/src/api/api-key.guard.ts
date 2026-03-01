import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) return false;

    const result = await this.userRepo.query(
      `
      UPDATE users
      SET api_key_quota = api_key_quota - 1
      WHERE api_key = $1 AND api_key_quota > 0
      RETURNING id, api_key_quota
      `,
      [apiKey],
    );

    if (result.length === 0) return false;

    req.user = result[0];
    return true;
  }
}
