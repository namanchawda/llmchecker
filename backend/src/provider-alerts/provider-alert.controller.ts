import {
  Controller, Get, Post, Body, Param, Req, UseGuards, HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProviderAlertService } from './provider-alert.service';

@Controller('provider-alerts')
@UseGuards(AuthGuard('jwt'))
export class ProviderAlertController {
  constructor(private readonly svc: ProviderAlertService) {}

  @Get()
  getAll(@Req() req: any) {
    return this.svc.getSubscriptions(req.user.id);
  }

  @Get(':providerId')
  getOne(@Param('providerId') providerId: string, @Req() req: any) {
    return this.svc.getSubscription(req.user.id, providerId);
  }

  @Post(':providerId')
  @HttpCode(200)
  setAlert(
    @Param('providerId') providerId: string,
    @Req() req: any,
    @Body() dto: { alertsEnabled: boolean },
  ) {
    return this.svc.setAlert(req.user.id, providerId, dto.alertsEnabled);
  }
}