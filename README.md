# Type Config

Spring Boot-inspired configuration management for Node.js with full TypeScript support. Bring the power of Spring's
configuration philosophy to your Node.js applications with type-safe, decorator-based configuration management.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Packages](#packages)
- [Complete Examples](#complete-examples)
- [Key Features](#key-features)
    - [Profile-Based Configuration](#profile-based-configuration)
    - [Type-Safe Configuration](#type-safe-configuration)
    - [Encryption](#encryption)
    - [Remote Configuration](#remote-configuration)
    - [Environment Variable Mapping](#environment-variable-mapping)
- [Performance](#performance)
- [Documentation](#documentation)
- [Why Type Config?](#why-type-config)
    - [vs. @nestjs/config](#vs-nestjsconfig)
    - [vs. node-config](#vs-node-config)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

✨ **Multi-source configuration** - JSON, YAML, .env files, environment variables, and remote sources  
🎯 **Type-safe bindings** - Decorator-based configuration with full TypeScript support  
🔄 **Profile support** - Environment-based profiles (development, production, etc.)  
💉 **Dependency injection** - Built-in DI container with framework-native integrations  
🔐 **Encryption support** - Secure sensitive configuration values with AES-256-CBC  
✅ **Validation** - Integration with class-validator for config validation  
🌐 **Remote sources** - AWS Parameter Store, Consul, etcd support  
🚀 **Framework adapters** - Native integrations for Express, Fastify, and NestJS  
📦 **Monorepo architecture** - Modular packages for flexible usage

## Packages

| Package                                                 | Description                                                         | NPM                                                                                                                               |
|---------------------------------------------------------|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **[@snow-tzu/type-config](./packages/core)**            | Core configuration system with multi-source loading, and encryption | [![npm](https://img.shields.io/npm/v/@snow-tzu/type-config)](https://www.npmjs.com/package/@snow-tzu/type-config)                 |
| **[@snow-tzu/type-config-express](./packages/express)** | Express.js middleware integration                                   | [![npm](https://img.shields.io/npm/v/@snow-tzu/type-config-express)](https://www.npmjs.com/package/@snow-tzu/type-config-express) |
| **[@snow-tzu/type-config-fastify](./packages/fastify)** | Fastify plugin for configuration                                    | [![npm](https://img.shields.io/npm/v/@snow-tzu/type-config-fastify)](https://www.npmjs.com/package/@snow-tzu/type-config-fastify) |
| **[@snow-tzu/type-config-nestjs](./packages/nestjs)**   | NestJS module with native DI integration                            | [![npm](https://img.shields.io/npm/v/@snow-tzu/type-config-nestjs)](https://www.npmjs.com/package/@snow-tzu/type-config-nestjs)   |
| **[@snow-tzu/type-config-remote](./packages/remote)**   | Remote configuration sources (AWS, Consul, etcd)                    | [![npm](https://img.shields.io/npm/v/@snow-tzu/type-config-remote)](https://www.npmjs.com/package/@snow-tzu/type-config-remote)   |
| **[@snow-tzu/type-config-testing](./packages/testing)** | Testing utilities and mocks                                         | [![npm](https://img.shields.io/npm/v/@snow-tzu/type-config-testing)](https://www.npmjs.com/package/@snow-tzu/type-config-testing) |

## Quick Start

### 1. Installation

Choose the package for your framework:

```bash
# For Express
npm install @snow-tzu/type-config-express reflect-metadata

# For Fastify
npm install @snow-tzu/type-config-fastify reflect-metadata

# For NestJS
npm install @snow-tzu/type-config-nestjs reflect-metadata

# Core only (no framework)
npm install @snow-tzu/type-config reflect-metadata
```

### 2. Define Configuration Classes

```typescript
import 'reflect-metadata';
import { ConfigurationProperties, ConfigProperty, Required } from '@snow-tzu/type-config';

@ConfigurationProperties('server')
class ServerConfig {
  @ConfigProperty() port: number = 3000;
  @ConfigProperty() host: string = 'localhost';
}

@ConfigurationProperties('database')
class DatabaseConfig {
  @ConfigProperty() @Required() host: string;
  @ConfigProperty() port: number = 5432;
  @ConfigProperty() username: string;
  @ConfigProperty() password: string;
}
```

### 3. Create Configuration Files

**config/application.yml** (default profile)

```yaml
server:
  host: localhost
  port: 3000

database:
  host: localhost
  port: 5432
  username: dev_user
  password: dev_pass
```

**config/application-production.yml** (production profile)

```yaml
server:
  host: 0.0.0.0
  port: 8080

database:
  host: prod-db.example.com
  username: prod_user
  password: ENC(iv:encrypted-value)  # Encrypted password
```

### 4. Framework Integration

#### Express

```typescript
import express from 'express';
import { createTypeConfig } from '@snow-tzu/type-config-express';

const app = express();

// Initialize configuration
const config = await createTypeConfig({
  profile: process.env.NODE_ENV || 'development',
  configDir: './config',
  configClasses: [ServerConfig, DatabaseConfig]
});

// Add middleware
app.use(config.middleware());

// Access config in routes
app.get('/api/info', (req, res) => {
  const serverConfig = req.container!.get(ServerConfig);
  res.json({
    host: serverConfig.host,
    port: serverConfig.port
  });
});

// Start server with config
const serverConfig = config.get(ServerConfig);
app.listen(serverConfig.port, () => {
  console.log(`Server running on ${serverConfig.host}:${serverConfig.port}`);
});
```

**👉 [See full Express example](./examples/express-basic)**

#### Fastify

```typescript
import Fastify from 'fastify';
import { fastifyTypeConfig } from '@snow-tzu/type-config-fastify';

const fastify = Fastify();

// Register as plugin
await fastify.register(fastifyTypeConfig, {
  profile: process.env.NODE_ENV || 'development',
  configDir: './config',
  configClasses: [ServerConfig, DatabaseConfig]
});

// Access config in routes
fastify.get('/api/info', async (request, reply) => {
  const serverConfig = request.container.get(ServerConfig);
  return {
    host: serverConfig.host,
    port: serverConfig.port
  };
});

// Start with config
const serverConfig = fastify.container.get(ServerConfig);
await fastify.listen({
  port: serverConfig.port,
  host: serverConfig.host
});
```

**👉 [See the full Fastify example](./examples/fastify-basic)**

#### NestJS

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeConfigModule } from '@snow-tzu/type-config-nestjs';
import { DatabaseConfig, ServerConfig } from './config';

@Module({
  imports: [
    // Global configuration setup
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      configDir: './config',
      isGlobal: true,
    }),
    // Register config classes
    TypeConfigModule.forFeature([ServerConfig, DatabaseConfig])
  ]
})
export class AppModule {
}

// user.service.ts - Inject configuration
import { Injectable } from '@nestjs/common';
import { DatabaseConfig } from './config';

@Injectable()
export class UserService {
  constructor(
    // Automatically injected via NestJS DI!
    private readonly dbConfig: DatabaseConfig
  ) {
  }

  async connect() {
    console.log(`Connecting to ${this.dbConfig.host}:${this.dbConfig.port}`);
  }
}
```

**👉 [See the full NestJS example](./examples/nestjs-basic)**

#### Vanilla Node.js (Core)

```typescript
import { ConfigurationBuilder } from '@snow-tzu/type-config';

const { configManager, container } = await new ConfigurationBuilder()
  .withProfile('production')
  .withConfigDir('./config')
  .registerConfig(ServerConfig)
  .registerConfig(DatabaseConfig)
  .build();

// Get config instances
const serverConfig = container.get(ServerConfig);
const dbConfig = container.get(DatabaseConfig);

// Or get raw values
const port = configManager.get('server.port', 3000);
```

**👉 [See full Node.js example](./examples/nodejs-basic)**

## Complete Examples

Check out the [examples directory](./examples) for fully working projects:

- **[express-basic](./examples/express-basic)** - Express.js with profiles
- **[fastify-basic](./examples/fastify-basic)** - Fastify with plugin integration
- **[nestjs-basic](./examples/nestjs-basic)** - NestJS with dependency injection
- **[nestjs-remote](./examples/nestjs-remote)** - NestJS with remote config server
- **[nodejs-basic](./examples/nodejs-basic)** - Vanilla Node.js without frameworks

Each example includes:

- Complete TypeScript setup
- Configuration files for multiple profiles
- Environment variable support
- Docker setup (where applicable)

## Key Features

### Profile-Based Configuration

Load different configs based on the environment:

```bash
# Development (default)
NODE_ENV=development npm start

# Production
NODE_ENV=production npm start

# Custom profile
NODE_ENV=staging npm start
```

Files are merged in priority order:

1. `application.yml` (base config)
2. `application-{profile}.yml` (profile-specific)
3. Environment variables (the highest priority)

### Type-Safe Configuration

Full TypeScript support with decorators:

```typescript
import { ConfigurationProperties, ConfigProperty, Required, DefaultValue } from '@snow-tzu/type-config';
import { IsUrl, IsNumber, Min, Max } from 'class-validator';

@ConfigurationProperties('api')
@Validate() // Enable validation
class ApiConfig {
  @ConfigProperty()
  @Required() // Must be provided
  @IsUrl() // Validate as URL
  baseUrl: string;

  @ConfigProperty()
  @DefaultValue(5000) // Default value
  @IsNumber()
  @Min(1000)
  @Max(30000)
  timeout: number;

  @ConfigProperty()
  @DefaultValue(3) // Complex defaults
  maxRetries: number;
}
```

### Encryption

Secure sensitive values with AES-256-CBC encryption:

```typescript
import { EncryptionHelper } from '@snow-tzu/type-config';

// Encrypt a value
const encryptor = new EncryptionHelper('your-32-character-secret-key!!');
const encrypted = encryptor.encrypt('my-secret-password');
console.log(encrypted); // ENC(iv:encrypted-value)

// Use in config file
// config/application-production.yml
// database:
//   password: ENC(iv:encrypted-value)

// Enable decryption
const config = await createTypeConfig({
  encryptionKey: process.env.ENCRYPTION_KEY,
  configClasses: [DatabaseConfig]
});
```

### Remote Configuration

Load configuration from remote sources:

```typescript
import { AWSParameterStoreSource, ConsulSource, EtcdSource } from '@snow-tzu/type-config-remote';

// AWS Parameter Store
const config = await createTypeConfig({
  additionalSources: [
    new AWSParameterStoreSource({
      path: '/myapp/production',
      region: 'us-east-1',
      priority: 300 // Higher priority than file sources
    })
  ]
});

// Multiple sources
const config = await new ConfigurationBuilder()
  .addSource(new ConsulSource({ prefix: 'myapp/shared', priority: 250 }))
  .addSource(new AWSParameterStoreSource({ path: '/myapp/prod', priority: 350 }))
  .build();
```

**👉 [See remote config example](./examples/nestjs-remote)**

### Environment Variable Mapping

Environment variables automatically map to nested config:

```bash
# These environment variables...
DATABASE_HOST=my-host
DATABASE_PORT=3306
SERVER_PORT=8080

# ...map to this config structure:
# database:
#   host: my-host
#   port: 3306
# server:
#   port: 8080
```

## Performance

Type Config is designed for production use with minimal overhead:

### Performance Metrics

| Operation               | Performance         | Assessment                          |
|-------------------------|---------------------|-------------------------------------|
| ⚡ **Config Loading**    | 1.6k-6.2k ops/sec   | Sub-millisecond for typical configs |
| 🚀 **Value Retrieval**  | >3.2M ops/sec       | Negligible overhead                 |
| 🎯 **Container Access** | >5.9M ops/sec       | **Recommended** (fastest)           |
| 💾 **Memory Usage**     | 1-5 MB per instance | Efficient & predictable             |

### Running Benchmarks

The core package includes performance benchmarks:

```bash
cd packages/core

# Run all benchmarks
yarn benchmark

# Run specific benchmarks
yarn benchmark:loading   # Configuration loading performance
yarn benchmark:memory    # Memory usage analysis
```

## Documentation

### Package Documentation

- **[Core Package](./packages/core/README.md)** - Core configuration system, decorators, and encryption
- **[Express Package](./packages/express/README.md)** - Express middleware and integration
- **[Fastify Package](./packages/fastify/README.md)** - Fastify plugin and decorators
- **[NestJS Package](./packages/nestjs/README.md)** - NestJS module and DI integration
- **[Remote Package](./packages/remote/README.md)** - AWS, Consul, and etcd sources
- **[Testing Package](./packages/testing/README.md)** - Mock utilities for tests

### Guides

- **[Quick Start](./QUICKSTART.md)** - Get started in 5 minutes
- **[Project Summary](./PROJECT_SUMMARY.md)** - Architecture and design decisions
- **[Examples README](./examples/README.md)** - Detailed example documentation
- **[Contributing](./CONTRIBUTING.md)** - How to contribute

## Why Type Config?

### vs. @nestjs/config

| Feature                  | Type Config                | @nestjs/config   |
|--------------------------|----------------------------|------------------|
| Type-safe config classes | ✅ Decorator-based          | ❌ Manual typing  |
| Native DI injection      | ✅ Automatic                | ⚠️ Manual setup  |
| Profile support          | ✅ Built-in                 | ❌ Manual         |
| Encryption               | ✅ Built-in AES-256         | ❌ Manual         |
| Multi-source merging     | ✅ Priority-based           | ⚠️ Limited       |
| Remote sources           | ✅ AWS, Consul, etcd        | ❌ Manual         |
| YAML support             | ✅ Native                   | ⚠️ Plugin needed |
| Framework support        | ✅ Express, Fastify, NestJS | ❌ NestJS only    |

### vs. node-config

| Feature         | Type Config       | node-config     |
|-----------------|-------------------|-----------------|
| Type safety     | ✅ Full TypeScript | ❌ No types      |
| Validation      | ✅ class-validator | ❌ No validation |
| Encryption      | ✅ Built-in        | ❌ No support    |
| DI integration  | ✅ All frameworks  | ❌ None          |
| Profile support | ✅ Spring-style    | ✅ Basic         |

## Requirements

- Node.js >= 16.0.0
- TypeScript >= 5.0.0 (for TypeScript projects)
- reflect-metadata

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © Ganesan Arunachalam

## Support

- 📚 [Documentation](./packages/core/README.md)
- 💬 [GitHub Issues](https://github.com/ganesanarun/type-config/issues)
- 📧 [Email Support](mailto:support@example.com)
- 💡 [Examples](./examples)
