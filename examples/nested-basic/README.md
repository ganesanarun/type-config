# Nested Configuration Classes Example

This example demonstrates the use of nested configuration classes with full decorator support in Type Config.

## Features Demonstrated

- **Single-level nesting**: Configuration classes containing other configuration classes
- **Multi-level nesting**: Configuration classes nested multiple levels deep
- **@DefaultValue decorator**: Default values on nested class properties
- **@Required decorator**: Required validation on nested class properties
- **@Validate() decorator**: class-validator integration on nested classes
- **Optional @ConfigProperty**: Properties bind without @ConfigProperty when names match
- **Profile-specific configuration**: Different values for development and production

## Configuration Structure

```
AppConfig (root)
├── server: ServerConfig
│   └── ssl: SslConfig (2-level nesting)
├── database: DatabaseConfig
│   └── pool: PoolConfig (2-level nesting)
└── services: ServicesConfig
    ├── api: ApiConfig
    └── cache: CacheConfig
```

## Running the Example

### Development Mode

```bash
# Install dependencies (from workspace root)
yarn install

# Run in development mode
cd examples/nested-basic
yarn dev
```

### Production Mode

```bash
# Build the application
yarn build

# Run in production mode
yarn start:prod
```

## Configuration Files

- `config/application.yml` - Base configuration with defaults
- `config/application-production.yml` - Production overrides

## Key Concepts

### 1. Nested Classes Without @ConfigProperty

When property names match configuration keys, @ConfigProperty is optional:

```typescript
@ConfigurationProperties('app')
class AppConfig {
  server: ServerConfig; // No @ConfigProperty needed!
  database: DatabaseConfig;
}
```

### 2. Decorators Work at All Levels

All decorators (@DefaultValue, @Required, @Validate) work on nested classes:

```typescript
class PoolConfig {
  @DefaultValue(10)
  maxConnections: number; // Default applied even though it's nested
}

class DatabaseConfig {
  pool: PoolConfig; // Nested class with decorators
}
```

### 3. Multi-Level Nesting

Nest as deeply as needed:

```typescript
class SslConfig {
  @DefaultValue(false)
  enabled: boolean;
}

class ServerConfig {
  ssl: SslConfig; // Level 2
}

class AppConfig {
  server: ServerConfig; // Level 1
}
```

### 4. Validation on Nested Classes

Use @Validate() on nested classes for comprehensive validation:

```typescript
@Validate()
class ApiConfig {
  @IsUrl()
  @Required()
  endpoint: string;
  
  @IsNumber()
  @Min(1000)
  @DefaultValue(5000)
  timeout: number;
}
```

## Expected Output

When you run the example, you'll see:

```
🚀 Application Configuration Loaded
📝 Profile: development

=== Server Configuration ===
Host: localhost
Port: 3000
SSL Enabled: false
SSL Cert Path: ./certs/cert.pem

=== Database Configuration ===
Host: localhost
Port: 5432
Username: dev_user
Max Connections: 10
Min Connections: 2

=== Services Configuration ===
API Endpoint: https://api.example.com
API Timeout: 5000ms
Cache Host: localhost
Cache Port: 6379
Cache TTL: 3600s

🚀 Server running on http://localhost:3000
```

## Migration Example

This example also shows how to migrate from plain objects to nested classes:

**Before** (plain object):
```typescript
@ConfigurationProperties('app')
class AppConfig {
  @ConfigProperty('database')
  database: any; // Plain object, no type safety or decorators
}
```

**After** (nested class):
```typescript
class DatabaseConfig {
  @Required()
  host: string;
  
  @DefaultValue(5432)
  port: number;
}

@ConfigurationProperties('app')
class AppConfig {
  database: DatabaseConfig; // Fully typed with decorator support!
}
```

## Learn More

- [Type Config Documentation](../../packages/core/README.md)
- [Configuration File Management](../../packages/core/CONFIG_FILES.md)
