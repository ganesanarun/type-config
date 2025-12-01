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
- [Advanced Features](#advanced-features)
    - [Environment Variable Placeholders](#environment-variable-placeholders)
    - [Map-Based Configuration](#map-based-configuration)
    - [Record-Based Configuration](#record-based-configuration)
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
- 🗺️ **Map & Record binding** - Bind configuration to Map or Record types for dynamic key-value structures
- 🔧 **Environment variable placeholders** - Use `${VAR:fallback}` syntax in YAML/JSON with fallback values

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

## Advanced Features

### Environment Variable Placeholders

Use `${VAR_NAME:fallback}` syntax in your YAML/JSON configuration files to reference environment variables with optional fallback values.

#### Basic Syntax

```yaml
database:
  host: ${DB_HOST:localhost}
  port: ${DB_PORT:5432}
  username: ${DB_USER:postgres}
  password: ${DB_PASSWORD}  # No fallback - will be undefined if not set
```

#### How It Works

1. **Environment variable exists**: Uses the environment variable value
   ```bash
   DB_HOST=prod-db.example.com
   # Result: host = "prod-db.example.com"
   ```

2. **Environment variable missing with fallback**: Uses the fallback value
   ```bash
   # DB_HOST not set
   # Result: host = "localhost"
   ```

3. **Environment variable missing without fallback**: Field becomes `undefined`
   ```bash
   # DB_PASSWORD not set
   # Result: password = undefined (validation will fail if @Required)
   ```

#### Advanced Usage

**Multiple placeholders in one value**:
```yaml
api:
  url: ${API_PROTOCOL:https}://${API_HOST:api.example.com}:${API_PORT:443}
  # Result: "https://api.example.com:443"
```

**Escaping placeholders**:
```yaml
message: \${USER} logged in  # Literal "${USER} logged in"
```

#### Precedence Rules

Configuration values are resolved in this order (highest to lowest priority):

1. **Explicit placeholder in profile-specific file** (e.g., `${PROD_VAR:fallback}`)
2. **Explicit placeholder in base file** (e.g., `${BASE_VAR:fallback}`)
3. **Underscore-based ENV variable** (e.g., `DATABASE_HOST` → `database.host`)
4. **Literal value from files**
5. **Default value from @DefaultValue decorator**

**Important**: Explicit placeholders take absolute precedence. If you use `${VAR}` in your config, the underscore-based ENV resolution will NOT be applied to that field, even if the placeholder fails to resolve.

#### Example with Profiles

```yaml
# application.yml
database:
  host: localhost
  username: ${DB_USER:postgres}
  password: ${DB_PASSWORD:defaultpass}

# application-production.yml
database:
  host: prod-db.example.com
  username: ${PROD_DB_USER:postgres}  # Overrides DB_USER
  password: ${PROD_DB_PASSWORD}       # Overrides DB_PASSWORD
```

With `NODE_ENV=production` and `PROD_DB_USER=prod_user`:
```javascript
{
  database: {
    host: 'prod-db.example.com',  // Literal from production profile
    username: 'prod_user',         // From PROD_DB_USER env var
    password: undefined            // PROD_DB_PASSWORD not set, no fallback
  }
}
```

#### Disabling Placeholder Resolution

```typescript
const { configManager } = await new ConfigurationBuilder()
  .withProfile('production')
  .withConfigDir('./config')
  .withOptions({ enablePlaceholderResolution: false })  // Disable
  .build();
```

### Map-Based Configuration

Bind configuration to `Map<string, T>` properties for dynamic key-value structures like multiple database connections or service endpoints.

#### Basic Example

```typescript
import { ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config';

class DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
}

@ConfigurationProperties('databases')
class DatabasesConfig {
  @ConfigProperty('connections')
  connections: Map<string, DatabaseConnection>;
}
```

```yaml
# config/application.yml
databases:
  connections:
    primary:
      host: localhost
      port: 5432
      username: postgres
      password: secret
    analytics:
      host: analytics-db.example.com
      port: 5432
      username: analytics_user
      password: analytics_pass
```

#### Using Map Configuration

```typescript
const dbConfig = container.get(DatabasesConfig);

// Access using Map methods
const primary = dbConfig.connections.get('primary');
console.log(`Primary DB: ${primary.host}:${primary.port}`);

// Check if connection exists
if (dbConfig.connections.has('analytics')) {
  const analytics = dbConfig.connections.get('analytics');
  // Use analytics connection
}

// Iterate over all connections
for (const [name, connection] of dbConfig.connections.entries()) {
  console.log(`${name}: ${connection.host}`);
}
```

#### Accessing Map Values via ConfigManager

```typescript
// Deep path access
const primaryHost = configManager.get<string>('databases.connections.primary.host');
// Result: "localhost"

// Get entire map entry
const primaryConfig = configManager.get('databases.connections.primary');
// Result: { host: 'localhost', port: 5432, ... }

// Get entire map as object
const allConnections = configManager.get('databases.connections');
// Result: { primary: {...}, analytics: {...} }

// With default value
const cacheHost = configManager.get('databases.connections.cache.host', 'localhost');
```

### Record-Based Configuration

Use `Record<string, T>` as an alternative to Map. Records are plain objects with string keys, offering simpler syntax with bracket notation.

#### Basic Example

```typescript
import { ConfigurationProperties, ConfigProperty, Required } from '@snow-tzu/type-config';

class DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
}

@ConfigurationProperties('databases')
class DatabasesRecordConfig {
  @ConfigProperty('connections')
  @Required()
  connections: Record<string, DatabaseConnection>;
}
```

#### Using Record Configuration

```typescript
const dbConfig = container.get(DatabasesRecordConfig);

// Access using bracket notation or dot notation
const primary = dbConfig.connections['primary'];
// or
const primary = dbConfig.connections.primary;
console.log(`Primary DB: ${primary.host}:${primary.port}`);

// Check if connection exists
if ('analytics' in dbConfig.connections) {
  const analytics = dbConfig.connections['analytics'];
  // Use analytics connection
}

// Iterate over all connections
for (const [name, connection] of Object.entries(dbConfig.connections)) {
  console.log(`${name}: ${connection.host}`);
}
```

#### Map vs Record: Choosing Between Them

| Feature | Map<string, T> | Record<string, T> |
|---------|----------------|-------------------|
| **Type** | True Map instance | Plain JavaScript object |
| **Access Syntax** | `map.get('key')` | `record['key']` or `record.key` |
| **Map Methods** | `.get()`, `.set()`, `.has()`, `.delete()` | Standard object operations |
| **Iteration** | `map.entries()`, `map.keys()`, `map.values()` | `Object.entries()`, `Object.keys()`, `Object.values()` |
| **JSON Serialization** | Requires conversion to object | Works directly |
| **Use Case** | Need Map semantics and methods | Prefer plain object syntax |

**Recommendation**: 
- Use **Map** when you need true Map semantics with `.get()`, `.set()`, `.has()` methods
- Use **Record** when you prefer plain object syntax with bracket/dot notation

**Note**: Both Map and Record support the same configuration binding. The choice is purely based on your preferred API style.

#### Complete Example with Placeholders

```yaml
# config/application.yml
databases:
  connections:
    primary:
      host: ${PRIMARY_DB_HOST:localhost}
      port: ${PRIMARY_DB_PORT:5432}
      username: ${PRIMARY_DB_USER:postgres}
      password: ${PRIMARY_DB_PASSWORD:secret}
    analytics:
      host: ${ANALYTICS_DB_HOST:localhost}
      port: 5432
      username: analytics_user
      password: ${ANALYTICS_DB_PASSWORD}
```

This combines both features: Map/Record binding with environment variable placeholders!

#### Complete Working Example

See the [Map and Placeholders Example](../../examples/map-and-placeholders/) for a full working demonstration including:
- Multiple database connections with Map binding
- Service endpoints configuration
- Profile-specific placeholder overrides
- Manual validation patterns
- NestJS integration

### Nested Configuration Classes

Organize complex configuration using nested configuration classes with full decorator support. Decorators like `@DefaultValue`, `@Required`, and `@Validate()` work seamlessly on nested classes, enabling modular, type-safe configuration structures.

#### Why Use Nested Classes?

- **Modularity**: Break complex configuration into logical, reusable components
- **Type Safety**: Full TypeScript support with IntelliSense for nested structures
- **Decorator Support**: `@DefaultValue`, `@Required`, and `@Validate()` work at all nesting levels
- **Validation**: Validate nested structures with class-validator decorators
- **Maintainability**: Easier to understand and maintain than flat configuration objects

#### Basic Example

```typescript
import { 
  ConfigurationProperties, 
  ConfigProperty, 
  DefaultValue, 
  Required,
  Validate 
} from '@snow-tzu/type-config';
import { IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Nested configuration class
@Validate()
class CircuitBreakerOptions {
  @DefaultValue(10000)
  @IsNumber()
  @Min(1000)
  timeout: number;

  @DefaultValue(50)
  @IsNumber()
  @Min(1)
  @Max(100)
  errorThresholdPercentage: number;

  @Required()
  @IsNumber()
  volumeThreshold: number;
}

// Parent configuration class
@ConfigurationProperties('clients.sample')
@Validate()
class SampleClientConfig {
  @Required()
  @ConfigProperty('baseUrl')
  baseURL: string;

  @Required()
  @ValidateNested()  // Required when parent has @Validate()
  @Type(() => CircuitBreakerOptions)  // Required when parent has @Validate()
  circuitBreaker: CircuitBreakerOptions;
}
```

```yaml
# config/application.yml
clients:
  sample:
    baseUrl: https://api.example.com
    circuitBreaker:
      volumeThreshold: 10
      # timeout and errorThresholdPercentage will use defaults
```

```typescript
const clientConfig = container.get(SampleClientConfig);
console.log(clientConfig.circuitBreaker.timeout); // 10000 (default)
console.log(clientConfig.circuitBreaker.volumeThreshold); // 10 (from config)
```

#### Key Features

**1. @ConfigProperty is Optional**

When the property name matches the configuration key, you don't need `@ConfigProperty`:

```typescript
class ServerConfig {
  @Required()
  host: string; // Binds to 'host' automatically
  
  @ConfigProperty('portNumber')
  port: number; // Custom path when names differ
}
```

**2. Decorators Work at All Levels**

All decorators are processed recursively:

```typescript
class PoolConfig {
  @DefaultValue(10)
  maxConnections: number;
  
  @DefaultValue(1)
  minConnections: number;
}

class DatabaseConfig {
  @Required()
  host: string;
  
  @DefaultValue(5432)
  port: number;
  
  pool: PoolConfig; // Nested class with its own decorators
}

@ConfigurationProperties('app')
class AppConfig {
  database: DatabaseConfig; // Multi-level nesting
}
```

**3. Validation with class-validator**

Use `@Validate()` on nested classes for comprehensive validation. **Important**: When using `@Validate()` on a parent class with nested class properties, you must add `@ValidateNested()` and `@Type()` decorators:

```typescript
import { IsUrl, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@Validate()
class ApiConfig {
  @IsUrl()
  @Required()
  endpoint: string;
  
  @IsNumber()
  @Min(1000)
  @Max(30000)
  @DefaultValue(5000)
  timeout: number;
}

@ConfigurationProperties('services')
@Validate()
class ServicesConfig {
  @ValidateNested()  // Required for validation
  @Type(() => ApiConfig)  // Required for validation
  api: ApiConfig;
}
```

**Why these decorators are required:**
- `@ValidateNested()` tells class-validator to validate the nested object
- `@Type(() => ApiConfig)` tells class-transformer what type to instantiate
- Without these, you'll get an error: "an unknown value was passed to the validate function"

If validation fails, you'll get detailed error messages:

```
Validation failed for ApiConfig at path 'services.api':
  - timeout: must be a number conforming to the specified constraints
  - endpoint: must be a URL address
```

**Note**: If you don't use `@Validate()` on the parent class, you don't need `@ValidateNested()` and `@Type()`. The nested class will still be instantiated and bound correctly.

**4. Required Properties in Nested Classes**

`@Required()` works in nested classes with clear error messages:

```typescript
class DatabaseConfig {
  @Required()
  host: string;
  
  @Required()
  password: string;
}

@ConfigurationProperties('app')
class AppConfig {
  database: DatabaseConfig;
}
```

If `password` is missing:
```
Required configuration property 'app.database.password' is missing
```

**5. DefaultValue Satisfies Required**

When both decorators are present, the default value satisfies the required constraint:

```typescript
class CacheConfig {
  @Required()
  @DefaultValue('localhost')
  host: string; // No error even if not in config file
  
  @Required()
  @DefaultValue(6379)
  port: number;
}
```

#### Multi-Level Nesting

Nest as deeply as needed - decorators work at all levels:

```typescript
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@Validate()
class SslConfig {
  @DefaultValue(false)
  enabled: boolean;
  
  @DefaultValue('./certs/cert.pem')
  certPath: string;
}

@Validate()
class ConnectionConfig {
  @Required()
  host: string;
  
  @DefaultValue(5432)
  port: number;
  
  @ValidateNested()
  @Type(() => SslConfig)
  ssl: SslConfig; // Level 3
}

@Validate()
class DatabaseConfig {
  @ValidateNested()
  @Type(() => ConnectionConfig)
  primary: ConnectionConfig; // Level 2
  
  @ValidateNested()
  @Type(() => ConnectionConfig)
  replica: ConnectionConfig;
}

@ConfigurationProperties('app')
@Validate()
class AppConfig {
  @ValidateNested()
  @Type(() => DatabaseConfig)
  database: DatabaseConfig; // Level 1
}
```

```yaml
# config/application.yml
app:
  database:
    primary:
      host: primary-db.example.com
      ssl:
        enabled: true
    replica:
      host: replica-db.example.com
      # Uses defaults for port and ssl
```

#### Mixing Nested Classes with Other Features

Combine nested classes with placeholders, profiles, and Map/Record types:

```typescript
class RetryConfig {
  @DefaultValue(3)
  maxAttempts: number;
  
  @DefaultValue(1000)
  backoffMs: number;
}

@ConfigurationProperties('services')
class ServicesConfig {
  @ConfigProperty('endpoints')
  endpoints: Map<string, string>; // Map binding
  
  retry: RetryConfig; // Nested class
}
```

```yaml
# config/application.yml
services:
  endpoints:
    api: ${API_URL:https://api.example.com}
    auth: ${AUTH_URL:https://auth.example.com}
  retry:
    maxAttempts: ${MAX_RETRIES:5}
```


**Before** (plain objects, no decorator support):

```typescript
@ConfigurationProperties('clients.sample')
class SampleClientConfig {
  @Required()
  @ConfigProperty('baseUrl')
  baseURL: string;

  @Required()
  @ConfigProperty('circuitBreaker')
  circuitBreaker: any; // Plain object - decorators don't work
}
```

**After** (nested classes with full decorator support):

```typescript
// Step 1: Create a class for the nested configuration
@Validate()
class CircuitBreakerOptions {
  @DefaultValue(10000)
  timeout: number;

  @DefaultValue(50)
  errorThresholdPercentage: number;

  @Required()
  volumeThreshold: number;
}

// Step 2: Use the class as the property type
@ConfigurationProperties('clients.sample')
@Validate()
class SampleClientConfig {
  @Required()
  @ConfigProperty('baseUrl')
  baseURL: string;

  @Required()
  circuitBreaker: CircuitBreakerOptions; // Now fully typed with decorators!
}
```

**Benefits of Migration**:
- ✅ Type safety with IntelliSense
- ✅ Default values on nested properties
- ✅ Required validation on nested properties
- ✅ class-validator integration
- ✅ Better code organization and reusability

#### Complete Working Example

See the [Nested Configuration Example](../../examples/nested-basic/) for a full working demonstration including:
- Single-level and multi-level nesting
- All decorator types (`@DefaultValue`, `@Required`, `@Validate()`)
- Profile-specific configuration
- Validation with class-validator
- Integration with Express/NestJS


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
| Map/Record binding |      ✅ Dynamic key-value structures      |      ❌      |   ❌    |       ❌        |
| ENV placeholders  |      ✅ ${VAR:fallback} syntax      |      ❌      |   ⚠️ Basic    |       ❌        |

## License

MIT © Ganesan Arunachalam
