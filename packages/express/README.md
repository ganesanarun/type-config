# @snow-tzu/type-config-express

> **Type-safe, multi-source, hot-reloadable configuration for Express.js**

[![npm version](https://img.shields.io/npm/v/@snow-tzu/type-config-express.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-express)
[![license](https://img.shields.io/npm/l/@snow-tzu/type-config-express.svg)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/@snow-tzu/type-config-express.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-express)

---

## Why use this?

- **Type-safe**: Decorator-based config classes with TypeScript
- **Profile support**: Spring-style profiles for dev, prod, etc.
- **Hot reload**: Watch and reload config changes instantly
- **Multi-source**: Merge YAML, JSON, .env, env vars, remote
- **Express middleware**: Config and DI in every request
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

- Express middleware integration
- Profile-based configuration
- Hot reload support
- Type-safe configuration classes
- Encrypted values
- Validation with class-validator

## Installation

```bash
npm install @snow-tzu/type-config-express reflect-metadata
# or
yarn add @snow-tzu/type-config-express reflect-metadata
```

## Quick Start

```typescript
import express from 'express';
import { createTypeConfig, ConfigurationProperties, ConfigProperty } from '@snow-tzu/config-express';

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

const app = express();

const config = await createTypeConfig({
  profile: process.env.NODE_ENV || 'development',
  configDir: './config',
  configClasses: [ServerConfig, DatabaseConfig]
});

app.use(config.middleware());

app.get('/api/info', (req, res) => {
  const serverConfig = req.container!.get(ServerConfig);
  res.json({
    server: `${serverConfig.host}:${serverConfig.port}`,
    environment: req.config!.getProfile()
  });
});

const serverConfig = config.get(ServerConfig);
app.listen(serverConfig.port, () => {
  console.log(`Server running on ${serverConfig.host}:${serverConfig.port}`);
});
```

## Configuration Files

### ⚠️ CRITICAL: Configuration File Management

**TypeScript compilation doesn't copy YAML/JSON files**, which means your configuration files will be lost unless properly configured.

📖 **[Read the Complete Configuration File Management Guide](../core/CONFIG_FILES.md)**

This comprehensive guide covers:
- Why configuration files disappear during builds
- Solutions for Express, NestJS, Fastify, and vanilla Node.js
- Configuration directory resolution patterns
- Profile-based loading
- Complete troubleshooting guide

### Quick Setup for Express

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

const config = await createTypeConfig({
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

## API

- `createTypeConfig(options)` - Create a new Express config instance
- `middleware()` - Get Express middleware
- `get<T>(ConfigClass)` - Get config class instance
- `onChange(listener)` - Listen for config changes

## Who is this for?

- Express.js developers who want type-safe, robust, and maintainable configuration
- Teams migrating from dotenv, node-config, or @nestjs/config
- Projects needing multi-source, profile-based, or encrypted config

## Comparison

| Feature         | type-config/express | express-config | dotenv | node-config |
|-----------------|:-------------------:|:--------------:|:------:|:-----------:|
| Type safety     |  ✅ Decorators, TS   |       ❌        |   ❌    |      ❌      |
| Multi-source    |  ✅ YAML, env, etc.  |   ⚠️ Partial   |   ❌    |      ✅      |
| Profile support |   ✅ Spring-style    |       ❌        |   ❌    |      ✅      |
| Hot reload      |     ✅ Built-in      |       ❌        |   ❌    |      ❌      |
| Encryption      |     ✅ Built-in      |       ❌        |   ❌    |      ❌      |
| Validation      |  ✅ class-validator  |       ❌        |   ❌    |      ❌      |
| DI integration  |    ✅ Per-request    |       ❌        |   ❌    |      ❌      |

## License

MIT © Ganesan Arunachalam
