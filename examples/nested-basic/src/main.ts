import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigManager, CONFIG_MANAGER_TOKEN } from '@snow-tzu/type-config-nestjs';
import { AppConfig } from './config/app.config';
import { AppService } from './app.service';

async function bootstrap() {
  try {
    console.log('🚀 Application Configuration Loaded');
    
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn'],
    });

    // Get ConfigManager and AppConfig from DI container
    const configManager = app.get<ConfigManager>(CONFIG_MANAGER_TOKEN);
    const appService = app.get<AppService>(AppService);

    console.log(`📝 Profile: ${configManager.getProfile()}`);

    // Print configuration to demonstrate nested class binding
    appService.printConfiguration();

    // Get server config for startup
    const appConfig = configManager.bind(AppConfig);

    // Start the application
    await app.listen(appConfig.server.port, appConfig.server.host);

    console.log(`\n🚀 Server running on http://${appConfig.server.host}:${appConfig.server.port}`);
    console.log(`📊 GET / - View configuration summary`);
    console.log(`💚 GET /health - Health check`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
