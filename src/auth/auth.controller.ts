import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() authCredentials: AuthCredentialsDto,
    @Headers('x-device-info') deviceInfo?: string,
  ) {
    return this.authService.login(authCredentials, deviceInfo);
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(
    @Request() req: any,
    @Headers('authorization') authorization?: string,
    @Headers('x-device-info') deviceInfo?: string,
  ) {
    const refreshToken = this.extractRefreshToken(authorization) || '';
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    return this.authService.refreshTokens(refreshToken, deviceInfo);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  async logout(
    @Request() req: any,
    @Headers('authorization') authorization?: string,
  ) {
    const refreshToken = this.extractRefreshToken(authorization) || '';
    await this.authService.logout(req.user.id, refreshToken);
    return { message: 'Logged out successfully' };
  }

  private extractRefreshToken(authorization?: string): string | null {
    if (!authorization) return null;
    return authorization.replace('Bearer ', '');
  }
}
