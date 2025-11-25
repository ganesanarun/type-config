import 'reflect-metadata';
import express from 'express';
import {
  createTypeConfig,
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
} from '@snow-tzu/type-config-express';

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
  const app = express();

  // Initialize Type Config
  const config = await createTypeConfig({
    profile: process.env.NODE_ENV || 'development',
    configDir: './config',
    configClasses: [ServerConfig, DatabaseConfig],
    enableHotReload: true,
  });

  // Add middleware
  app.use(express.json());
  app.use(config.middleware());

  // Routes
  app.get('/', (req, res) => {
    res.json({
      message: 'Type Config Express Example',
      profile: req.config!.getProfile(),
    });
  });

  app.get('/config', (req, res) => {
    const serverConfig = req.container!.get(ServerConfig);
    const dbConfig = req.container!.get(DatabaseConfig);

    res.json({
      server: {
        host: serverConfig.host,
        port: serverConfig.port,
      },
      database: {
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
      },
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Start server
  const serverConfig = config.get(ServerConfig);
  app.listen(serverConfig.port, serverConfig.host, () => {
    console.log(`🚀 Server running on http://${serverConfig.host}:${serverConfig.port}`);
    console.log(`📝 Profile: ${config.getProfile()}`);
  });

  // Listen for config changes
  config.onChange((newConfig) => {
    console.log(newConfig);
    console.log('⚡ Configuration reloaded');
  });
}

bootstrap().catch(console.error);
