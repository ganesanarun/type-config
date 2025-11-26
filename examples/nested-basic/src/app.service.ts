import { Injectable } from '@nestjs/common';
import { AppConfig } from './config/app.config';

@Injectable()
export class AppService {
  constructor(private readonly appConfig: AppConfig) {}

  getConfigSummary(): any {
    console.log(this.appConfig)
    return {
      server: {
        host: this.appConfig.server.host,
        port: this.appConfig.server.port,
        ssl: {
          enabled: this.appConfig.server.ssl.enabled,
          certPath: this.appConfig.server.ssl.certPath,
        },
      },
      database: {
        host: this.appConfig.database.host,
        port: this.appConfig.database.port,
        username: this.appConfig.database.username,
        pool: {
          maxConnections: this.appConfig.database.pool.maxConnections,
          minConnections: this.appConfig.database.pool.minConnections,
        },
      },
      services: {
        api: {
          endpoint: this.appConfig.services.api.endpoint,
          timeout: this.appConfig.services.api.timeout,
        },
        cache: {
          host: this.appConfig.services.cache.host,
          port: this.appConfig.services.cache.port,
          ttl: this.appConfig.services.cache.ttl,
        },
      },
    };
  }

  printConfiguration(): void {
    console.log('\n=== Server Configuration ===');
    console.log(this.appConfig)

    console.log(`Host: ${this.appConfig.server.host}`);
    console.log(`Port: ${this.appConfig.server.port}`);
    console.log(`SSL Enabled: ${this.appConfig.server.ssl.enabled}`);
    console.log(`SSL Cert Path: ${this.appConfig.server.ssl.certPath}`);

    console.log('\n=== Database Configuration ===');
    console.log(`Host: ${this.appConfig.database.host}`);
    console.log(`Port: ${this.appConfig.database.port}`);
    console.log(`Username: ${this.appConfig.database.username}`);
    console.log(`Max Connections: ${this.appConfig.database.pool.maxConnections}`);
    console.log(`Min Connections: ${this.appConfig.database.pool.minConnections}`);

    console.log('\n=== Services Configuration ===');
    console.log(`API Endpoint: ${this.appConfig.services.api.endpoint}`);
    console.log(`API Timeout: ${this.appConfig.services.api.timeout}ms`);
    console.log(`Cache Host: ${this.appConfig.services.cache.host}`);
    console.log(`Cache Port: ${this.appConfig.services.cache.port}`);
    console.log(`Cache TTL: ${this.appConfig.services.cache.ttl}s`);
  }
}
