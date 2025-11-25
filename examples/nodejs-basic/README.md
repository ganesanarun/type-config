# Vanilla Node.js Basic Example

This example demonstrates how to use Type Config Core with vanilla Node.js (no framework).

## Features

- Profile-based configuration
- Hot reload support
- Type-safe configuration classes with decorators
- No framework dependencies (pure Node.js)
- Built-in HTTP server
- Graceful shutdown handling
- Environment variable substitution

## Setup

```bash
# Install dependencies
yarn install

# Run in development mode
yarn dev
```

## Configuration

The example uses YAML configuration files located in the `config/` directory:

- `application.yml` - Default configuration
- `application-production.yml` - Production profile configuration

Configuration is automatically merged based on the active profile.

## Endpoints

- `GET /` - Welcome message with app info
- `GET /config` - Display bound configuration objects
- `GET /raw-config` - Display raw configuration (all properties)
- `GET /health` - Health check endpoint

## Usage

```bash
# Run with development profile (default)
yarn dev

# Run with production profile
NODE_ENV=production yarn dev

# Build and run compiled version
yarn build
NODE_ENV=production node dist/index.js
```

## Configuration Classes

### ServerConfig

```typescript
@ConfigurationProperties('server')
class ServerConfig {
  @ConfigProperty()
  port: number = 3000;

  @ConfigProperty()
  host: string = 'localhost';
}
```

### DatabaseConfig

```typescript
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
```

### AppConfig

```typescript
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
```

## Using ConfigManager Directly

This example showcases the core ConfigManager API:

```typescript
// Create and initialize
const configManager = new ConfigManager({
  profile: process.env.NODE_ENV || 'development',
  configDir: './config',
  enableHotReload: true,
});

await configManager.load();

// Register configuration classes
configManager.register(ServerConfig);
configManager.register(DatabaseConfig);
configManager.register(AppConfig);

// Bind instances
const serverConfig = configManager.bind(ServerConfig);
const dbConfig = configManager.bind(DatabaseConfig);

// Access properties
console.log(serverConfig.port); // 3000
console.log(dbConfig.host);     // localhost

// Get all config
const allConfig = configManager.getAll();

// Get active profile
const profile = configManager.getProfile();

// Listen for changes
configManager.onChange((newConfig) => {
  console.log('Config changed!', newConfig);
});
```

## Hot Reload

When `enableHotReload` is true, the configuration is automatically reloaded when files in the config directory change. This is useful during development.

To test hot reload:

1. Start the server with `yarn dev`
2. Modify `config/application.yml`
3. Watch the console for the reload message
4. Visit `/config` to see the updated values

## Environment Variables

You can use environment variable substitution in your config files:

```yaml
database:
  password: ${DB_PASSWORD}
```

Then set the environment variable:

```bash
export DB_PASSWORD=my-secret-password
yarn dev
```

## Graceful Shutdown

The example includes graceful shutdown handling for SIGTERM and SIGINT signals, ensuring the server closes cleanly.
