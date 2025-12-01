import { Module } from '@nestjs/common';
import { TypeConfigModule } from '@snow-tzu/type-config-nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServerConfig } from './config/server.config';
import { DatabaseConfig } from './config/database.config';

@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      configDir: './config',
      isGlobal: true,
    }),
    TypeConfigModule.forFeature([ServerConfig, DatabaseConfig]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
