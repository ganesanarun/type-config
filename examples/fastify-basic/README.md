# Fastify Basic Example

This example demonstrates how to use Type Config with Fastify.

## Features

- Profile-based configuration
- Hot reload support
- Type-safe configuration classes
- Dependency injection with decorators
- Fastify plugin integration

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

## Endpoints

- `GET /` - Welcome message with active profile
- `GET /config` - Display current configuration
- `GET /health` - Health check endpoint

## Usage

```bash
# Run with development profile (default)
yarn dev

# Run with production profile
NODE_ENV=production yarn dev
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
