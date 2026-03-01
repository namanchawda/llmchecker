import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Get,
  Patch,
  Delete
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MonitoringService } from './monitoring.service';
import { MonitoringRunnerService } from './monitoring-runner.service';
import { CreateMonitorJobDto } from '../monitoring/dto/create-monitor-job.dto';

@Controller('monitor')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly runnerService: MonitoringRunnerService,
  ) {}

  @Post('jobs')
  @UseGuards(AuthGuard('jwt'))
  createJob(@Req() req: any, @Body() dto: CreateMonitorJobDto) {
    return this.monitoringService.createJob(req.user, dto);
  }

  @Get('jobs/:id/runs')
  @UseGuards(AuthGuard('jwt'))
  async getRuns(@Param('id') jobId: string, @Req() req: any) {
    return this.monitoringService.getRunsForJob(jobId, req.user.id);
  }

  @Post('jobs/:id/run-once')
  @UseGuards(AuthGuard('jwt'))
  async runOnce(@Param('id') id: string, @Req() req) {
    const job = await this.monitoringService.findJobForUser(id, req.user.id);
    return this.runnerService.runOnce(job);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('jobs')
  getMyJobs(@Req() req: any) {
    return this.monitoringService.getJobsForUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('jobs/:id/runs/latest')
  getLatestRun(@Param('id') jobId: string, @Req() req: any) {
    return this.monitoringService.getLatestRun(jobId, req.user.id);
  }

  @Post('jobs/:id/enable')
  @UseGuards(AuthGuard('jwt'))
  enable(@Param('id') id: string, @Req() req: any) {
    return this.monitoringService.setJobActive(id, req.user.id, true);
  }

  @Post('jobs/:id/disable')
  @UseGuards(AuthGuard('jwt'))
  disable(@Param('id') id: string, @Req() req: any) {
    return this.monitoringService.setJobActive(id, req.user.id, false);
  }

  // ✅ Fixed: was @Patch(':id/alerts'), now @Patch('jobs/:id/alerts')
  @Patch('jobs/:id/alerts')
  @UseGuards(AuthGuard('jwt'))
  toggleAlerts(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { alertsEnabled: boolean },
  ) {
    return this.monitoringService.toggleAlerts(id, req.user.id, body.alertsEnabled);
  }

  @Get('jobs/:id/status')
  @UseGuards(AuthGuard('jwt'))
  getStatus(@Param('id') id: string, @Req() req: any) {
    return this.monitoringService.getStatusForJob(id, req.user.id);
  }

  @Get('/api/v1/status')
  async getPublicStatus(@Req() req: any) {
    const apiKey = req.headers['api-key'];
    return this.monitoringService.getStatusesByApiKey(apiKey);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('jobs/:id/incidents')
  getIncidents(@Param('id') id: string, @Req() req: any) {
    return this.monitoringService.getIncidentTimeline(id, req.user.id);
  }

  @Patch('jobs/:id')
  @UseGuards(AuthGuard('jwt'))
  updateJob(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateMonitorJobDto,
  ) {
    return this.monitoringService.updateJob(id, req.user.id, dto);
  }

  @Delete('jobs/:id')
  @UseGuards(AuthGuard('jwt'))
  deleteJob(@Param('id') id: string, @Req() req: any) {
    return this.monitoringService.deleteJob(id, req.user.id);
  }
}