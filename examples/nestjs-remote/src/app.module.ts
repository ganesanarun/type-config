import { Module } from '@nestjs/common';
import { TypeConfigModule } from '@snow-tzu/type-config-nestjs';
import { ConsulSource } from '@snow-tzu/type-config-remote';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServerConfig } from './config/server.config';
import { DatabaseConfig } from './config/database.config';
import { AppConfig } from './config/app.config';

@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      configDir: './config',
      enableHotReload: true,
      isGlobal: true,
      // Configure a remote config source using supported property
      additionalSources: [
        new ConsulSource({
          prefix: 'nestjs-app',
          host: process.env.CONSUL_HOST || 'localhost',
          port: process.env.CONSUL_PORT ? Number(process.env.CONSUL_PORT) : 8500,
          token: process.env.CONSUL_TOKEN,
          // Add other options as needed
        })
      ],
    }),
    TypeConfigModule.forFeature([ServerConfig, DatabaseConfig, AppConfig]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
