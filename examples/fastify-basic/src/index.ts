import 'reflect-metadata';
import Fastify from 'fastify';
import {
  fastifyTypeConfig,
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
  createFastifyConfig,
} from '@snow-tzu/type-config-fastify';

// Configuration classes
@ConfigurationProperties('server')
class ServerConfig {
  @ConfigProperty()
  port: number = 3000;

  @ConfigProperty()
  host: string = 'localhost';
}

@ConfigurationProperties('database')
class DatabaseConfig {
  @ConfigProperty()
  @Required()
  host: string;

  @ConfigProperty()
  @DefaultValue(5432)
  port: number;

  @ConfigProperty()
  username: string;

  @ConfigProperty()
  password: string;
}

async function bootstrap() {
  const fastify = Fastify({
    logger: true,
  });

  // Initialize Type Config
  const { configManager } = await createFastifyConfig({
    profile: process.env.NODE_ENV || 'development',
    configDir: './config',
    configClasses: [ServerConfig, DatabaseConfig],
  });

  // Register config plugin
  await fastify.register(fastifyTypeConfig, {
    profile: process.env.NODE_ENV || 'development',
    configDir: './config',
    configClasses: [ServerConfig, DatabaseConfig],
  });

  // Routes
  fastify.get('/', async (request) => {
    return {
      message: 'Type Config Fastify Example',
      profile: request.config!.getProfile(),
    };
  });

  fastify.get('/config', async (request) => {
    const serverConfig = request.container!.get(ServerConfig);
    const dbConfig = request.container!.get(DatabaseConfig);

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
    };
  });

  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // Start server
  const serverConfig = fastify.container.get(ServerConfig);
  try {
    await fastify.listen({
      port: serverConfig.port,
      host: serverConfig.host,
    });
    console.log(`🚀 Server running on http://${serverConfig.host}:${serverConfig.port}`);
    console.log(`📝 Profile: ${configManager.getProfile()}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch(console.error);
