import { Injectable } from '@nestjs/common';
import { ConfigManager, InjectConfigManager } from '@snow-tzu/type-config-nestjs';
import { ServerConfig } from './config/server.config';
import { DatabaseConfig } from './config/database.config';

@Injectable()
export class AppService {
  constructor(
    private readonly serverConfig: ServerConfig,
    private readonly dbConfig: DatabaseConfig,
    @InjectConfigManager()
    private readonly configManager: ConfigManager,
  ) {}

  getAppInfo() {
    return {
      message: 'Type Config NestJS Example',
      profile: this.configManager.getProfile(),
    };
  }

  getConfig() {
    return {
      server: {
        host: this.serverConfig.host,
        port: this.serverConfig.port,
      },
      database: {
        host: this.dbConfig.host,
        port: this.dbConfig.port,
        username: this.dbConfig.username,
      },
    };
  }

  getHealth() {
    return { status: 'ok' };
  }
}
