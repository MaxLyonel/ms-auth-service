import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async login(authCredentials: AuthCredentialsDto, deviceInfo?: string) {
    const { email, password } = authCredentials;
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await this.usersService.validatePassword(user, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.refreshTokenService.revokeAllUserTokens(user.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.refreshTokenService.create(
      user.id,
      tokens.refreshToken,
      7,
      deviceInfo,
    );

    return tokens;
  }

  async refreshTokens(refreshToken: string, deviceInfo?: string) {
    const isValid = await this.refreshTokenService.isValid(refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken =
      await this.refreshTokenService.findByToken(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenService.revoke(refreshToken);

    const tokens = await this.generateTokens(
      storedToken.userId,
      storedToken.user.email,
      storedToken.user.role,
    );

    await this.refreshTokenService.create(
      storedToken.userId,
      tokens.refreshToken,
      7,
      deviceInfo,
    );

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    await this.refreshTokenService.revoke(refreshToken);
  }

  async logoutAll(userId: string) {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.configService.get('JWT_SECRET') as string,
          expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET') as string,
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
