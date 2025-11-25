# @snow-tzu/type-config-nestjs

> **Type-safe, multi-source, hot-reloadable configuration for NestJS**

[![npm version](https://img.shields.io/npm/v/@snow-tzu/type-config-nestjs.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-nestjs)
[![license](https://img.shields.io/npm/l/@snow-tzu/type-config-nestjs.svg)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/@snow-tzu/type-config-nestjs.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-nestjs)

---

## Why use this?

- **Type-safe**: Decorator-based config classes with TypeScript
- **Profile support**: Spring-style profiles for dev, prod, etc.
- **Hot reload**: Watch and reload config changes instantly
- **Multi-source**: Merge YAML, JSON, .env, env vars, remote
- **NestJS DI**: Config classes are injectable anywhere
- **Encryption**: Secure secrets with built-in AES-256
- **Validation**: class-validator integration

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Files](#configuration-files)
- [Usage Patterns](#usage-patterns)
- [API Reference](#api-reference)
- [Who is this for?](#who-is-this-for)
- [Comparison](#comparison)
- [License](#license)

## Features

- Native NestJS DI
- Module-scoped configs
- Global or local configuration
- Hot reload support
- Encrypted values
- Validation with class-validator

## Installation

```bash
npm install @snow-tzu/type-config-nestjs reflect-metadata
# or
yarn add @snow-tzu/type-config-nestjs reflect-metadata
```

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { TypeConfigModule, ConfigurationProperties, ConfigProperty, Required } from '@snow-tzu/type-config-nestjs';
import { IsNumber, IsString } from 'class-validator';

@ConfigurationProperties('database')
@Validate()
export class DatabaseConfig {
  @ConfigProperty() @Required() @IsString() host: string;
  @ConfigProperty() @IsNumber() port: number = 5432;
  @ConfigProperty() username: string;
  @ConfigProperty() password: string;
}

@ConfigurationProperties('server')
export class ServerConfig {
  @ConfigProperty() port: number = 3000;
  @ConfigProperty() host: string = 'localhost';
}

@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      configDir: './config',
      isGlobal: true,
    }),
    TypeConfigModule.forFeature([ServerConfig, DatabaseConfig])
  ]
})
export class AppModule {}
```

## Configuration Files

**NestJS deletes the `dist` folder during compilation, which can remove your YAML/JSON configuration files unless properly managed.**

See the [Configuration File Management Guide](../core/CONFIG_FILES.md) for:
- Why configuration files disappear during builds
- Solutions for NestJS, Express, Fastify, and vanilla Node.js
- Configuration directory resolution patterns
- Profile-based loading
- Troubleshooting

### Quick Setup for NestJS

1. **Configure nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "config/*.yml",
        "outDir": "dist/src"
      }
    ]
  }
}
```

2. **Create configuration files**

```
src/
├── config/
│   ├── application.yml              # Base configuration
│   ├── application-development.yml  # Development overrides
│   └── application-production.yml   # Production overrides
```

3. **Configure TypeConfigModule**

```typescript
import * as path from 'path';

TypeConfigModule.forRoot({
  profile: process.env.NODE_ENV || 'development',
  configDir: path.join(__dirname, 'config'),  // Points to dist/src/config
  isGlobal: true,
})
```

**Example configuration files:**

```yaml
# application.yml
server:
  host: localhost
  port: 3000

# application-production.yml
server:
  host: 0.0.0.0
  port: 8080
```

For more, see the [Configuration File Management Guide](../core/CONFIG_FILES.md).

## Usage Patterns

### Global and Module-Scoped Configuration

You can use configuration globally or module-scoped. For most apps, set `isGlobal: true` in `forRoot` and register config classes with `forFeature`.

#### Global Configuration (Recommended for most apps)

```typescript
@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      configDir: path.join(__dirname, 'config'),
      isGlobal: true,
    }),
    TypeConfigModule.forFeature([DatabaseConfig, ServerConfig]),
    UserModule,
    ProductModule,
  ]
})
export class AppModule {}

// user.service.ts
@Injectable()
export class UserService {
  constructor(private readonly dbConfig: DatabaseConfig) {}
}
```

#### Module-Scoped Configuration (for feature modules)

Call `forRoot` once (in AppModule or a dedicated ConfigModule), then use `forFeature` in feature modules to register additional config classes.

```typescript
// config.module.ts
@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      isGlobal: true,
      configDir: path.join(__dirname, 'config'),
    }),
    TypeConfigModule.forFeature([DatabaseConfig, ServerConfig]),
  ],
  exports: [TypeConfigModule], // Export to make configs available elsewhere
})
export class ConfigModule {}

// email/email.module.ts
@Module({
  imports: [
    ConfigModule,
    TypeConfigModule.forFeature([EmailConfig])
  ],
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}
```

**Note:**
- `forRoot()` must be called once to create the ConfigManager.
- `forFeature()` registers config classes with the existing ConfigManager.
- Always export `TypeConfigModule` from your ConfigModule if you want to use configs in other modules (especially for dynamic modules).
- If you forget to export, you’ll get errors like: `Nest can't resolve dependencies of the XxxModule (?, ?). Please make sure that the argument YourConfig at index [0] is available...`

#### When to use each pattern

| Pattern         | Use When                                             |
|----------------|------------------------------------------------------|
| ConfigModule    | Large apps, dynamic modules, better organization     |
| Global         | Small apps, simple config, no dynamic module injection|

### Using Configuration in Providers, Controllers, and Dynamic Modules

- **Constructor injection** is recommended:

```typescript
@Injectable()
export class UserService {
  constructor(private readonly dbConfig: DatabaseConfig) {}
}
```

- **Property injection** is also supported:

```typescript
@Injectable()
export class UserService {
  @Inject(DatabaseConfig)
  private readonly dbConfig: DatabaseConfig;
}
```

- **Controllers** and **Guards** can inject config classes the same way.

- **Dynamic modules** (e.g., LoggerModule, TypeOrmModule) require you to import your ConfigModule and inject config classes in `useFactory`:

```typescript
LoggerModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (loggingConfig: LoggingConfig) => ({
    pinoHttp: { level: loggingConfig.level }
  }),
  inject: [LoggingConfig],
})
```

## API Reference

### Module Methods

#### `TypeConfigModule.forRoot(options)`

Initializes the configuration system. Call once at the application root (AppModule or ConfigModule).

Options:
```typescript
{
  profile?: string;           // Environment profile (default: process.env.NODE_ENV || 'development')
  configDir?: string;         // Directory containing config files (default: './config')
  isGlobal?: boolean;         // Make module global (default: true)
  enableHotReload?: boolean;  // Enable hot reload (default: false)
  encryptionKey?: string;     // Key for decrypting encrypted values
  validateOnBind?: boolean;   // Enable validation (default: true)
}
```

#### `TypeConfigModule.forFeature([ConfigClass, ...])`

Registers configuration classes for dependency injection. Requires `forRoot()` to be called first.

You can call `forFeature` in multiple modules as long as `forRoot` was called somewhere (usually in AppModule or ConfigModule).

### Decorators

- `@ConfigurationProperties(prefix: string)` - Mark a class as a configuration properties class
- `@ConfigProperty(path?: string)` - Bind a property to configuration value
- `@Required()` - Mark a property as required (throws error if missing)
- `@DefaultValue(value: any)` - Provide a default value if configuration is not present
- `@Validate()` - Enable class-validator validation on the config class

### Tokens

- `CONFIG_MANAGER_TOKEN` - Token for injecting ConfigManager directly (advanced usage)

## Who is this for?

- NestJS developers who want type-safe, robust, and maintainable configuration
- Teams migrating from dotenv, node-config, or @nestjs/config
- Projects needing multi-source, profile-based, or encrypted config

## Comparison

| Feature         | type-config/nestjs | @nestjs/config | dotenv | node-config |
|-----------------|:------------------:|:--------------:|:------:|:-----------:|
| Type safety     |  ✅ Decorators, TS  |   ⚠️ Partial   |   ❌    |      ❌      |
| Multi-source    | ✅ YAML, env, etc.  |   ⚠️ Limited   |   ❌    |      ✅      |
| Profile support |   ✅ Spring-style   |       ❌        |   ❌    |      ✅      |
| Hot reload      |     ✅ Built-in     |       ❌        |   ❌    |      ❌      |
| Encryption      |     ✅ Built-in     |       ❌        |   ❌    |      ❌      |
| Validation      | ✅ class-validator  |   ⚠️ Manual    |   ❌    |      ❌      |
| DI integration  |      ✅ Native      |       ✅        |   ❌    |      ❌      |

## License

MIT © Ganesan Arunachalam
