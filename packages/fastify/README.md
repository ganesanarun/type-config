# @snow-tzu/type-config-fastify

> **Type-safe, multi-source, configuration for Fastify**

[![npm version](https://img.shields.io/npm/v/@snow-tzu/type-config-fastify.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-fastify)
[![license](https://img.shields.io/npm/l/@snow-tzu/type-config-fastify.svg)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/@snow-tzu/type-config-fastify.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-fastify)

---

## Why use this?

- **Type-safe**: Decorator-based config classes with TypeScript
- **Profile support**: Spring-style profiles for dev, prod, etc.
- **Multi-source**: Merge YAML, JSON, .env, env vars, remote
- **Fastify plugin**: Config and DI in every request
- **Encryption**: Secure secrets with built-in AES-256
- **Validation**: class-validator integration

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Files](#configuration-files)
- [API](#api)
- [Who is this for?](#who-is-this-for)
- [Comparison](#comparison)
- [License](#license)

## Features

- Fastify plugin integration
- Profile-based configuration
- Hot reload support
- Type-safe configuration classes
- Encrypted values
- Validation with class-validator
- Map & Record binding for dynamic key-value structures
- Environment variable placeholders with `${VAR:fallback}` syntax

## Installation

```bash
npm install @snow-tzu/type-config-fastify reflect-metadata
# or
yarn add @snow-tzu/type-config-fastify reflect-metadata
```

## Quick Start

```typescript
import Fastify from 'fastify';
import { fastifyTypeConfig, ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config-fastify';

@ConfigurationProperties('server')
class ServerConfig {
  @ConfigProperty() port: number = 3000;
  @ConfigProperty() host: string = 'localhost';
}

@ConfigurationProperties('database')
class DatabaseConfig {
  @ConfigProperty() host: string;
  @ConfigProperty() port: number = 5432;
}

const fastify = Fastify();

// Register plugin
await fastify.register(fastifyTypeConfig, {
  profile: process.env.NODE_ENV || 'development',
  configDir: './config',
  configClasses: [ServerConfig, DatabaseConfig]
});

// Use config in routes
fastify.get('/api/info', async (request, reply) => {
  const serverConfig = request.container.get(ServerConfig);
  return {
    server: `${serverConfig.host}:${serverConfig.port}`,
    environment: request.config.getProfile()
  };
});

// Access config from fastify instance
const serverConfig = fastify.container.get(ServerConfig);
await fastify.listen({ port: serverConfig.port, host: serverConfig.host });
```

## Configuration Files

### ⚠️ CRITICAL: Configuration File Management

**TypeScript compilation doesn't copy YAML/JSON files**, which means your configuration files will be lost unless
properly configured.

📖 *
*[Read the Complete Configuration File Management Guide](https://github.com/ganesanarun/type-config/blob/main/packages/core/CONFIG_FILES.md)
**

This comprehensive guide covers:

- Why configuration files disappear during builds
- Solutions for Fastify, Express, NestJS, and vanilla Node.js
- Configuration directory resolution patterns
- Profile-based loading
- Complete troubleshooting guide

### Quick Setup for Fastify

**1. Add copy script to package.json**

```json
{
  "scripts": {
    "copy:config": "mkdir -p dist/config && cp config/*.{yml,json} dist/config/",
    "build": "tsc && npm run copy:config",
    "start": "npm run copy:config && node dist/index.js",
    "dev": "npm run copy:config && ts-node src/index.ts"
  }
}
```

**2. Create configuration files**

```
config/
├── application.yml              # Base configuration
├── application-development.yml  # Development overrides
└── application-production.yml   # Production overrides
```

**3. Use proper path resolution**

```typescript
import * as path from 'path';

await fastify.register(fastifyTypeConfig, {
  profile: process.env.NODE_ENV || 'development',
  configDir: path.join(__dirname, '../config'),  // Relative to dist/
  configClasses: [ServerConfig, DatabaseConfig]
});
```

**Example configuration:**

```yaml
# config/application.yml
server:
  host: localhost
  port: 3000

database:
  host: localhost
  port: 5432
```

**config/application-production.yml**

```yaml
server:
  host: 0.0.0.0
  port: 8080

database:
  host: prod-db.example.com
```

## Advanced Features

### Environment Variable Placeholders

Use `${VAR:fallback}` syntax in your YAML/JSON files:

```yaml
# config/application.yml
server:
  host: ${SERVER_HOST:localhost}
  port: ${SERVER_PORT:3000}

database:
  host: ${DB_HOST:localhost}
  port: ${DB_PORT:5432}
  username: ${DB_USER:postgres}
  password: ${DB_PASSWORD}  # No fallback - required
```

See the [core package documentation](../core/README.md#environment-variable-placeholders) for complete details.

### Map-Based Configuration

Bind configuration to `Map<string, T>` for dynamic collections:

```typescript
class ServiceEndpoint {
  url: string;
  timeout: number;
  retries: number;
}

@ConfigurationProperties('services')
class ServicesConfig {
  @ConfigProperty('endpoints')
  endpoints: Map<string, ServiceEndpoint>;
}
```

```yaml
# config/application.yml
services:
  endpoints:
    auth:
      url: http://localhost:8001
      timeout: 5000
      retries: 3
    payment:
      url: http://localhost:8002
      timeout: 10000
      retries: 5
```

**Usage in routes:**

```typescript
fastify.get('/api/services/:name', async (request, reply) => {
  const servicesConfig = request.container.get(ServicesConfig);
  const endpoint = servicesConfig.endpoints.get(request.params.name);

  if (!endpoint) {
    return reply.code(404).send({ error: 'Service not found' });
  }

  return endpoint;
});
```

**Alternative: Record type** for plain object syntax:

```typescript

@ConfigurationProperties('services')
class ServicesConfig {
  @ConfigProperty('endpoints')
  endpoints: Record<string, ServiceEndpoint>;
}

// Access with bracket notation
const auth = servicesConfig.endpoints['auth'];
```

See the [core package documentation](../core/README.md#map-based-configuration) for complete details.

## API

- `fastifyTypeConfig(options)` - Register Fastify plugin
- `get<T>(ConfigClass)` - Get config class instance
- `onChange(listener)` - Listen for config changes

## Who is this for?

- Fastify developers who want type-safe, robust, and maintainable configuration
- Teams migrating from dotenv, node-config, or @nestjs/config
- Projects need multi-source, profile-based, or encrypted config

## Comparison

| Feature            | type-config/fastify  | fastify-config |  dotenv  | node-config |
|--------------------|:--------------------:|:--------------:|:--------:|:-----------:|
| Type safety        |   ✅ Decorators, TS   |       ❌        |    ❌     |      ❌      |
| Multi-source       |  ✅ YAML, env, etc.   |   ⚠️ Partial   |    ❌     |      ✅      |
| Profile support    |    ✅ Spring-style    |       ❌        |    ❌     |      ✅      |
| Hot reload         |      ✅ Built-in      |       ❌        |    ❌     |      ❌      |
| Encryption         |      ✅ Built-in      |       ❌        |    ❌     |      ❌      |
| Validation         |  ✅ class-validator   |       ❌        |    ❌     |      ❌      |
| DI integration     |    ✅ Per-request     |       ❌        |    ❌     |      ❌      |
| Map/Record binding | ✅ Dynamic structures |       ❌        |    ❌     |      ❌      |
| ENV placeholders   |  ✅ ${VAR:fallback}   |       ❌        | ⚠️ Basic |      ❌      |

## License

MIT © Ganesan Arunachalam
