import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ApiKeyService } from './api-key.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  // ── Email/password signup — sends OTP, does NOT return a token yet ─────────
  @Post('register')
  register(@Body() body: { name: string; email: string; password: string }) {
    return this.authService.register(body.name, body.email, body.password);
    // returns: { requiresOtp: true, email }
  }

  // ── Verify OTP — returns token + user if correct ───────────────────────────
  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; code: string }) {
    return this.authService.verifyOtp(body.email, body.code);
    // returns: { token, user } — same shape as login
  }

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  @Post('resend-otp')
  resendOtp(@Body() body: { email: string }) {
    return this.authService.resendOtp(body.email);
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // ── Forgot Password — Send OTP ─────────────────────────────────────────────
  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
    // returns: { requiresOtp: true, email }
  }

  // ── Verify Reset OTP ───────────────────────────────────────────────────────
  @Post('verify-reset-otp')
  verifyResetOtp(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetOtp(body.email, body.code);
    // returns: { verified: true, email }
  }

  // ── Reset Password — Set new password ──────────────────────────────────────
  @Post('reset-password')
  resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
    // returns: { message: 'Password reset successful' }
  }

  // ── Resend Reset OTP ───────────────────────────────────────────────────────
  @Post('resend-reset-otp')
  resendResetOtp(@Body() body: { email: string }) {
    return this.authService.resendResetOtp(body.email);
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // NestJS redirects automatically
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const { token } = await this.authService.googleLogin(req.user);
    return res.redirect(`http://localhost:3000/login/success?token=${token}`);
  }

  // ── Protected ──────────────────────────────────────────────────────────────
  @Post('api-key/buy')
  @UseGuards(AuthGuard('jwt'))
  buyApiKey(@Req() req: any) {
    return this.apiKeyService.buyApiKey(req.user.id);
  }

  @Post('api-key/use')
  @UseGuards(AuthGuard('jwt'))
  useApiKey(@Req() req: any) {
    return this.apiKeyService.useApiKey(req.user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException();
    const user = await this.authService.findById(req.user.id);
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      apiKey: user.apiKey,
      apiKeyQuota: user.apiKeyQuota,
    };
  }
}