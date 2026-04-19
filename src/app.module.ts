import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = (configService.get('DATABASE_TYPE') ||
          'sqlite') as string;
        const isSqlite = dbType === 'sqlite';

        if (isSqlite) {
          return {
            type: 'sqlite' as const,
            database: (configService.get('DATABASE_NAME') ||
              'db.sqlite') as string,
            entities: [User, RefreshToken],
            synchronize: true,
          };
        }

        return {
          type: dbType as 'postgres' | 'mysql',
          host: configService.get('DATABASE_HOST') as string,
          port: Number(configService.get('DATABASE_PORT')) as number,
          username: configService.get('DATABASE_USER') as string,
          password: configService.get('DATABASE_PASSWORD') as string,
          database: configService.get('DATABASE_NAME') as string,
          entities: [User, RefreshToken],
          synchronize: true,
        };
      },
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
