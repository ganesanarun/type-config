import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigManager, CONFIG_MANAGER_TOKEN } from '@snow-tzu/type-config-nestjs';
import { ServerConfig } from './config/server.config';
import { DatabaseConfig } from './config/database.config';
import { AppConfig } from './config/app.config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(CONFIG_MANAGER_TOKEN) private readonly configManager: ConfigManager,
  ) {}

  @Get()
  getHello(): object {
    return {
      message: this.appService.getHello(),
      profile: this.configManager.getProfile(),
      remoteEnabled: true,
    };
  }

  @Get('config')
  getConfig() {
    const serverConfig = this.configManager.bind(ServerConfig);
    const dbConfig = this.configManager.bind(DatabaseConfig);
    const appConfig = this.configManager.bind(AppConfig);

    return {
      server: {
        host: serverConfig.host,
        port: serverConfig.port,
      },
      database: {
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
      },
      app: {
        name: appConfig.name,
        version: appConfig.version,
        environment: appConfig.environment,
        features: appConfig.features,
      },
    };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('refresh')
  async refreshConfig() {
    // Manual refresh is not supported; just return a message
    return {
      message: 'Manual refresh is not supported in this config setup.',
      timestamp: new Date().toISOString(),
    };
  }
}
