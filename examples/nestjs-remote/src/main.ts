import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigManager, CONFIG_MANAGER_TOKEN } from '@snow-tzu/type-config-nestjs';
import { ServerConfig } from './config/server.config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Get ConfigManager from the DI container
    const configManager = app.get<ConfigManager>(CONFIG_MANAGER_TOKEN);

    // Bind ServerConfig to get port and host
    const serverConfig = configManager.bind(ServerConfig);

    // Start the application with a configured host and port
    await app.listen(serverConfig.port, serverConfig.host);

    // Log a startup message with server URL and active profile
    console.log(`🚀 Server running on http://${serverConfig.host}:${serverConfig.port}`);
    console.log(`📝 Profile: ${configManager.getProfile()}`);
    console.log(`🌐 Remote config enabled`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().then(_r => {
  console.log('Application started successfully');
});
