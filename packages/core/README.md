# @snow-tzu/type-config

> **Type-safe, blazing-fast, multi-source configuration for Node.js & TypeScript**

[![npm version](https://img.shields.io/npm/v/@snow-tzu/type-config.svg)](https://www.npmjs.com/package/@snow-tzu/type-config)
[![license](https://img.shields.io/npm/l/@snow-tzu/type-config.svg)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/@snow-tzu/type-config.svg)](https://www.npmjs.com/package/@snow-tzu/type-config))

---

## Why use type-config?

- **Type-safe**: Decorator-based config classes with full TypeScript support
- **Multi-source**: Merge YAML, JSON, .env, environment variables, and remote sources
- **Profile support**: Spring-style profiles for dev, prod, staging, etc.
- **Hot reload**: Watch and reload config changes instantly
- **Encryption**: Secure secrets with built-in AES-256 encryption
- **Validation**: class-validator integration for robust config
- **Lightning fast**: See benchmarks below
- **Framework-agnostic**: Use with Express, Fastify, NestJS, or vanilla Node.js

---

## Benchmarks

| Operation        | Performance         | Assessment              |
|------------------|---------------------|-------------------------|
| Config Loading   | 2.7k–8.8k ops/sec   | Sub-millisecond typical |
| Value Retrieval  | >3.6M ops/sec       | Negligible overhead     |
| Container Access | >6.3M ops/sec       | Fastest (recommended)   |
| Memory Usage     | 1–5 MB per instance | Efficient & predictable |
| Hot Reload       | File watching       | Minimal impact          |

> **Run benchmarks:**
> ```bash
> cd packages/core
> yarn benchmark
> ```

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Files](#configuration-files)
- [API](#api)
    - [Decorators](#decorators)
    - [ConfigurationBuilder](#configurationbuilder)
    - [ConfigManager](#configmanager)
- [Encryption](#encryption)
- [Who is this for?](#who-is-this-for)
- [Comparison](#comparison)
- [License](#license)

## Features

- 🎯 **Type-safe configuration** - Decorator-based config binding with TypeScript support
- 📁 **Multi-source loading** - JSON, YAML, .env files, and environment variables
- 🔄 **Profile support** - Environment-based configuration profiles
- 🔥 **Hot reload** - Watch and reload configuration changes
- 🔐 **Encryption** - Built-in support for encrypted values
- ✅ **Validation** - Integration with class-validator
- 💉 **DI Container** - Simple dependency injection system

## Installation

```bash
npm install @snow-tzu/type-config reflect-metadata
# or
yarn add @snow-tzu/type-config reflect-metadata
```

## Quick Start

```typescript
import 'reflect-metadata';
import {
  ConfigurationBuilder,
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue
} from '@snow-tzu/type-config'; // or 'type-config'

// Define configuration class
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

// Build and use configuration
const { configManager, container } = await new ConfigurationBuilder()
  .withProfile('production')
  .withConfigDir('./config')
  .registerConfig(DatabaseConfig)
  .build();

const dbConfig = container.get(DatabaseConfig);
console.log(`Connecting to ${dbConfig.host}:${dbConfig.port}`);
```

## Configuration Files

### ⚠️ CRITICAL: Configuration File Management

**TypeScript compilation doesn't copy YAML/JSON files to the output directory.** Your application will fail at runtime if configuration files are not properly managed.

📖 **[Read the Complete Configuration File Management Guide](./CONFIG_FILES.md)**

This comprehensive guide is **essential reading** and covers:
- **Why configuration files disappear** during builds
- **Solutions for all frameworks** (NestJS, Express, Fastify, vanilla Node.js)
- **Configuration directory resolution** patterns
- **Profile-based loading** mechanics
- **Complete troubleshooting guide** with common errors and solutions

### Quick Example

Create `config/application.yml`:

```yaml
database:
  host: localhost
  port: 5432
  username: dev_user
  password: dev_pass
```

Create `config/application-production.yml`:

```yaml
database:
  host: prod-db.example.com
  username: prod_user
  password: ENC(iv:encrypted-password)
```

**Important**: Ensure these files are copied to your `dist/` folder during build. See the [Configuration File Management Guide](./CONFIG_FILES.md) for details.

## API

### Decorators

- `@ConfigurationProperties(prefix: string)` - Mark a class as a configuration properties class.
- `@ConfigProperty(path?: string)` - Bind a property to configuration value.
- `@Required()` - Mark a property as required - will throw error if missing.
- `@DefaultValue(value: any)` - Provide a default value if configuration is not present.
- `@Validate()` - Enable class-validator validation on the config class.

### ConfigurationBuilder

Fluent API for building configuration:

```typescript
const builder = new ConfigurationBuilder()
  .withProfile('production')
  .withConfigDir('./config')
  .withEnvPrefix('APP_')
  .withHotReload(true)
  .withEncryption('your-32-character-secret-key!!')
  .registerConfig(DatabaseConfig)
  .registerConfig(ServerConfig);

const { configManager, container } = await builder.build();
```

### ConfigManager

Main configuration manager instance:

```typescript
// Get value by path
const port = configManager.get<number>('server.port', 3000);

// Get all config
const allConfig = configManager.getAll();

// Get active profile
const profile = configManager.getProfile();

// Listen for changes (with hot reload)
const unsubscribe = configManager.onChange((newConfig) => {
  console.log('Config changed:', newConfig);
});
```

## Encryption

Encrypt sensitive values:

```typescript
import { EncryptionHelper } from '@snow-tzu/type-config';

const encryptor = new EncryptionHelper('your-32-character-secret-key!!');
const encrypted = encryptor.encrypt('my-secret-password');
// Output: ENC(iv:encrypted-value)
```

Use in config files:

```yaml
database:
  password: ENC(iv:encrypted-value)
```

## Who is this for?

- Node.js/TypeScript developers who want type-safe, robust, and maintainable configuration
- Teams migrating from dotenv, node-config, or @nestjs/config
- Projects need multi-source, profile-based, or encrypted config
- Anyone who wants is Spring Boot-style config in Node.js

## Comparison

| Feature           | type-config (@snow-tzu/type-config) | node-config | dotenv | @nestjs/config |
|-------------------|:-----------------------------------:|:-----------:|:------:|:--------------:|
| Type safety       |      ✅ Decorators, TS classes       |      ❌      |   ❌    |   ⚠️ Partial   |
| Multi-source      |      ✅ YAML, env, remote, etc.      |      ✅      |   ❌    |   ⚠️ Limited   |
| Profile support   |           ✅ Spring-style            |      ✅      |   ❌    |       ❌        |
| Hot reload        |             ✅ Built-in              |      ❌      |   ❌    |       ❌        |
| Encryption        |         ✅ Built-in AES-256          |      ❌      |   ❌    |       ❌        |
| Validation        |          ✅ class-validator          |      ❌      |   ❌    |   ⚠️ Manual    |
| DI integration    |          ✅ All frameworks           |      ❌      |   ❌    |   ✅ (NestJS)   |
| Remote sources    |         ✅ AWS, Consul, etcd         |      ❌      |   ❌    |       ❌        |
| Framework support |     ✅ Express, Fastify, NestJS      |      ❌      |   ❌    |   ✅ (NestJS)   |

## License

MIT © Ganesan Arunachalam
