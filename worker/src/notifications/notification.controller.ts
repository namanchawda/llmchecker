import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { IntegrationType } from './entities/notification-integration.entity';

// Use plain interfaces — NestJS will deserialise the JSON body correctly
// without needing class-validator, avoiding the undefined assignability issue.
interface CreateDto {
  type: IntegrationType;
  name: string;
  webhookUrl?: string;
  chatId?: string;
  emailAddress?: string;
  alertOnDown?: boolean;
  alertOnRecovery?: boolean;
}

interface UpdateDto {
  name?: string;
  webhookUrl?: string;
  chatId?: string;
  emailAddress?: string;
  alertOnDown?: boolean;
  alertOnRecovery?: boolean;
  isEnabled?: boolean;
}

@Controller('notifications/integrations')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  getAll(@Req() req: any) {
    return this.svc.getForUser(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateDto) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.id);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @Req() req: any) {
    return this.svc.test(id, req.user.id);
  }
}