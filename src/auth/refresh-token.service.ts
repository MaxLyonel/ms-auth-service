import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async create(
    userId: string,
    token: string,
    expiresInDays: number = 7,
    deviceInfo?: string,
  ): Promise<RefreshToken> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      expiresAt,
      deviceInfo: deviceInfo || null,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  async revoke(token: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token },
      { revokedAt: new Date() },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  async isValid(token: string): Promise<boolean> {
    const refreshToken = await this.findByToken(token);
    if (!refreshToken) return false;
    if (refreshToken.revokedAt) return false;
    if (new Date() > refreshToken.expiresAt) return false;
    return true;
  }
}
