import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['profile', 'email'],
    });
  }

  async validate(
  accessToken: string,
  refreshToken: string,
  profile: Profile,
) {
  if (!profile.emails || !profile.emails.length) {
    throw new Error('Google account has no email');
  }

  return {
    googleId: profile.id,
    email: profile.emails[0].value,
    name: profile.displayName,
  };
}
}