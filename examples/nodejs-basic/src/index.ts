import 'reflect-metadata';
import { createServer } from 'http';
import {
  ConfigManager,
  ConfigProperty,
  ConfigurationProperties,
  DefaultValue,
  Required,
} from '@snow-tzu/type-config';

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

@ConfigurationProperties('app')
class AppConfig {
  @ConfigProperty()
  @DefaultValue('Node.js App')
  name: string;

  @ConfigProperty()
  @DefaultValue('1.0.0')
  version: string;

  @ConfigProperty()
  environment: string;

  @ConfigProperty()
  debug: boolean;
}

async function bootstrap() {
  try {
    // Initialize ConfigManager
    const configManager = new ConfigManager({
      profile: process.env.NODE_ENV || 'development',
      configDir: './config',
    });

    // Initialize configuration (replaces load/register)
    await configManager.initialize();

    // Bind configuration instances
    const serverConfig = configManager.bind(ServerConfig);
    const dbConfig = configManager.bind(DatabaseConfig);
    const appConfig = configManager.bind(AppConfig);

    // Create an HTTP server
    const server = createServer((req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);

      res.setHeader('Content-Type', 'application/json');

      switch (url.pathname) {
        case '/':
          res.writeHead(200);
          res.end(
            JSON.stringify(
              {
                message: 'Type Config Vanilla Node.js Example',
                app: appConfig.name,
                version: appConfig.version,
                profile: configManager.getProfile(),
              },
              null,
              2
            )
          );
          break;

        case '/config':
          res.writeHead(200);
          res.end(
            JSON.stringify(
              {
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
                  debug: appConfig.debug,
                },
              },
              null,
              2
            )
          );
          break;

        case '/health':
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok' }, null, 2));
          break;

        case '/raw-config':
          res.writeHead(200);
          res.end(JSON.stringify(configManager.getAll(), null, 2));
          break;

        default:
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not Found' }, null, 2));
      }
    });

    // Start server
    server.listen(serverConfig.port, serverConfig.host, () => {
      console.log(`🚀 Server running on http://${serverConfig.host}:${serverConfig.port}`);
      console.log(`📝 Profile: ${configManager.getProfile()}`);
      console.log(`🔧 App: ${appConfig.name} v${appConfig.version}`);
      console.log(`🐛 Debug mode: ${appConfig.debug}`);
      console.log();
      console.log('Available endpoints:');
      console.log('  GET /          - Welcome message');
      console.log('  GET /config    - View bound configuration');
      console.log('  GET /raw-config - View raw configuration');
      console.log('  GET /health    - Health check');
    });

    // Handle a graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().then(_r => {
  console.log('Application started successfully');
});
