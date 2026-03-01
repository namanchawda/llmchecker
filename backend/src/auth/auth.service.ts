import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';

import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  // STEP 1 — REGISTER: save user as unverified, send OTP
  async register(name: string, email: string, password: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing?.emailVerified) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (existing) {
      existing.name = name;
      existing.passwordHash = passwordHash;
      existing.otpCode = otp;
      existing.otpExpiresAt = otpExpiresAt;
      existing.emailVerified = false;
      await this.userRepo.save(existing);
    } else {
      const user = this.userRepo.create({
        name,
        email,
        passwordHash,
        emailVerified: false,
        otpCode: otp,
        otpExpiresAt,
      });
      await this.userRepo.save(user);
    }

    await this.sendOtpEmail(email, name, otp, 'signup');
    return { requiresOtp: true, email };
  }

  // STEP 2 — VERIFY OTP
  async verifyOtp(email: string, code: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) throw new BadRequestException('No pending signup for this email');
    if (user.emailVerified) throw new BadRequestException('Email already verified — please log in');
    if (!user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP found — please sign up again');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired — please sign up again');
    if (user.otpCode !== code.trim()) throw new BadRequestException('Incorrect code — please check your email');

    user.emailVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await this.userRepo.save(user);

    return this.sign(user);
  }

  // RESEND OTP
  async resendOtp(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('No pending signup for this email');
    if (user.emailVerified) throw new BadRequestException('Email already verified');

    const otp = this.generateOtp();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.userRepo.save(user);

    await this.sendOtpEmail(email, user.name, otp, 'signup');
    return { message: 'New code sent' };
  }

  // LOGIN
  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email first. Check your inbox for the code we sent.',
      );
    }

    return this.sign(user);
  }

  // FORGOT PASSWORD — Send OTP to email
  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    
    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    if (!user.emailVerified) {
      throw new BadRequestException('Please verify your email first before resetting password');
    }

    const otp = this.generateOtp();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.userRepo.save(user);

    await this.sendOtpEmail(email, user.name, otp, 'reset');
    return { requiresOtp: true, email };
  }

  // VERIFY RESET OTP
  async verifyResetOtp(email: string, code: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) throw new BadRequestException('No account found with this email');
    if (!user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP found — please request a new reset code');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired — please request a new reset code');
    if (user.otpCode !== code.trim()) throw new BadRequestException('Incorrect code — please check your email');

    // Don't clear OTP yet, we need it for the actual password reset
    return { verified: true, email };
  }

  // RESET PASSWORD — Set new password with verified OTP
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) throw new BadRequestException('No account found with this email');
    if (!user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP found — please request a new reset code');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired — please request a new reset code');
    if (user.otpCode !== code.trim()) throw new BadRequestException('Incorrect code — please check your email');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await this.userRepo.save(user);

    return { message: 'Password reset successful' };
  }

  // RESEND RESET OTP
  async resendResetOtp(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('No account found with this email');
    if (!user.emailVerified) throw new BadRequestException('Please verify your email first');

    const otp = this.generateOtp();
    user.otpCode = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.userRepo.save(user);

    await this.sendOtpEmail(email, user.name, otp, 'reset');
    return { message: 'New code sent' };
  }

  // GOOGLE LOGIN
  async googleLogin(googleUser: { email: string; name: string; googleId: string }) {
    if (!googleUser.email) throw new UnauthorizedException('Google account email missing');

    let user = await this.userRepo.findOne({ where: { email: googleUser.email } });

    if (!user) {
      user = this.userRepo.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        emailVerified: true,
      });
      await this.userRepo.save(user);
    } else {
      let updated = false;
      if (!user.googleId) { user.googleId = googleUser.googleId; updated = true; }
      if (!user.name && googleUser.name) { user.name = googleUser.name; updated = true; }
      if (!user.emailVerified) { user.emailVerified = true; updated = true; }
      if (updated) await this.userRepo.save(user);
    }

    return this.sign(user);
  }

  async findById(id: string) {
    return this.userRepo.findOneBy({ id });
  }

  private sign(user: User) {
    const payload = { sub: user.id, email: user.email };
    const token = this.jwt.sign(payload);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        apiKey: user.apiKey ?? null,
        apiKeyQuota: user.apiKeyQuota,
      },
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtpEmail(to: string, name: string, otp: string, type: 'signup' | 'reset') {
    const { transporter, from } = await this.getMailTransporter();

    const isReset = type === 'reset';
    const title = isReset ? 'Reset your password' : 'Verify your email';
    const greeting = 'Hi ' + name + ',';
    const message = isReset 
      ? 'Use the code below to reset your password. It expires in <strong style="color:#e2e8f0">10 minutes</strong>.'
      : 'Use the code below to complete your signup. It expires in <strong style="color:#e2e8f0">10 minutes</strong>.';
    const footer = isReset
      ? 'If you did not request a password reset, ignore this email.'
      : 'If you did not create an account, ignore this email.';

    // No template literals here — plain string concatenation avoids any escaping bugs
    const html =
      '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1117;color:#e2e8f0;border-radius:12px;overflow:hidden">' +
        '<div style="background:#1e2433;padding:24px 28px;border-bottom:1px solid #334155">' +
          '<h2 style="margin:0;font-size:18px;color:#fff">' + title + '</h2>' +
        '</div>' +
        '<div style="padding:28px">' +
          '<p style="margin:0 0 8px;color:#94a3b8;font-size:14px">' + greeting + '</p>' +
          '<p style="margin:0 0 24px;color:#94a3b8;font-size:14px">' + message + '</p>' +
          '<div style="background:#1e2433;border:1px solid #334155;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">' +
            '<span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#fff;font-family:monospace">' + otp + '</span>' +
          '</div>' +
          '<p style="margin:0;font-size:12px;color:#475569">' + footer + '</p>' +
        '</div>' +
      '</div>';

    const subject = isReset 
      ? otp + ' is your LLM Monitor password reset code'
      : otp + ' is your LLM Monitor verification code';

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    // Dev only: open this URL in your browser to see the email and get the OTP code
    if (!process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n📧 OTP Email Preview (open in browser): ' + previewUrl + '\n');
    }
  }

  private async getMailTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string }> {
    if (process.env.SMTP_HOST) {
      // Production: use real SMTP credentials from .env
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      // Use SMTP_FROM env var, or fall back to SMTP_USER — both are real addresses in prod
      const from = process.env.SMTP_FROM ?? ('LLM Monitor <' + process.env.SMTP_USER + '>');
      return { transporter, from };
    }

    // Dev: Ethereal test account — no config needed, creates a temporary catch-all inbox.
    // THE FIX: use testAccount.user as the from address.
    // The old bug was using process.env.SMTP_USER here, which is undefined in dev,
    // producing "LLM Monitor <undefined>" which Ethereal rejects with 501 Bad sender.
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const from = 'LLM Monitor <' + testAccount.user + '>';
    return { transporter, from };
  }
}