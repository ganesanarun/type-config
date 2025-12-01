# Type Config Examples

This directory contains example projects demonstrating how to use Type Config with different frameworks and setups.

## Available Examples

### 1. Express Basic (`express-basic/`)

Basic Express.js application using Type Config.

**Features:**

- Express middleware integration
- Profile-based configuration
- Type-safe configuration classes

**Start:** `cd express-basic && yarn dev`

---

### 2. Fastify Basic (`fastify-basic/`)

Basic Fastify application using Type Config.

**Features:**

- Fastify plugin integration
- Profile-based configuration
- Type-safe configuration classes
- Async/await support

**Start:** `cd fastify-basic && yarn dev`

---

### 3. NestJS Basic (`nestjs-basic/`)

Basic NestJS application using Type Config.

**Features:**

- NestJS module integration
- Dependency injection
- Profile-based configuration
- Type-safe configuration classes

**Start:** `cd nestjs-basic && yarn dev`

---

### 4. NestJS Remote (`nestjs-remote/`)

NestJS application with remote configuration server support.

**Features:**

- Remote Consul integration
- Fallback to local configuration
- Bearer token authentication
- Manual refresh endpoint
- Profile-based configuration

**Start:** `cd nestjs-remote && yarn dev`

**Environment Variables:**

```bash
CONFIG_SERVER_URL=http://localhost:8888
CONFIG_SERVER_TOKEN=your-token # optional
NODE_ENV=production
```

---

### 5. Vanilla Node.js Basic (`nodejs-basic/`)

Pure Node.js application (no framework) using Type Config Core.

**Features:**

- Direct ConfigManager API usage
- Built-in HTTP server
- Profile-based configuration
- Graceful shutdown handling
- No framework dependencies

**Start:** `cd nodejs-basic && yarn dev`

---

### 6. Nested Configuration Classes (`nested-basic/`)

NestJS application demonstrating nested configuration classes with full decorator support.

**Features:**

- **Single-level nesting**: Configuration classes containing other configuration classes
- **Multi-level nesting**: Configuration classes nested multiple levels deep (e.g., `app.server.ssl`)
- **@DefaultValue decorator**: Default values on nested class properties
- **@Required decorator**: Required validation on nested class properties
- **@Validate() decorator**: class-validator integration on nested classes
- **Optional @ConfigProperty**: Properties bind without @ConfigProperty when names match
- **Profile-specific configuration**: Different values for development and production

**Start:** `cd nested-basic && yarn dev`

**Production:** `NODE_ENV=production yarn dev`

**Key Concepts:**
- Nested classes provide modularity and type safety for complex configurations
- All decorators work recursively at all nesting levels
- No @ConfigProperty needed when property names match configuration keys
- Validation errors include full property paths for easy debugging

---

## Quick Start

### Install All Dependencies

From the root directory:

```bash
yarn install
```

### Run an Example

```bash
# Navigate to any example
cd examples/fastify-basic

# Install dependencies (if not already done)
yarn install

# Run in development mode
yarn dev

# Run with production profile
NODE_ENV=production yarn dev
```

### Build an Example

```bash
# Navigate to any example
cd examples/nestjs-basic

# Build TypeScript
yarn build

# Run compiled version
yarn start
```

## Common Features

All examples include:

- **Profile-based configuration**: Separate configs for dev, production, etc.
- **Type-safe configuration**: Use TypeScript decorators for config classes
- **Hot reload**: Automatic config reload during development
- **Environment variables**: Substitute env vars in config files
- **Validation**: Required fields and default values

## Configuration Structure

Each example follows this structure:

```
example-name/
├── config/
│   ├── application.yml           # Default configuration
│   └── application-production.yml # Production profile config
├── src/
│   ├── index.ts or main.ts       # Application entry point
│   └── config/                   # Configuration classes
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration Classes

All examples use decorator-based configuration classes:

```typescript
import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
} from '@snow-tzu/config-*';

@ConfigurationProperties('database')
class DatabaseConfig {
  @ConfigProperty()
  @Required()
  host: string;

  @ConfigProperty()
  @DefaultValue(5432)
  port: number;
}
```

## Available Endpoints

Most examples expose these HTTP endpoints:

- `GET /` - Welcome message with app info
- `GET /config` - View current configuration
- `GET /health` - Health check

Additional endpoints per example:

- **nestjs-remote**: `GET /refresh` - Manually refresh config from remote server
- **nodejs-basic**: `GET /raw-config` - View all raw configuration properties

## Package Mapping

Each example uses a specific package:

| Example       | Package                                                         |
|---------------|-----------------------------------------------------------------|
| express-basic | `@snow-tzu/type-config-express`                                 |
| fastify-basic | `@snow-tzu/type-config-fastify`                                 |
| nestjs-basic  | `@snow-tzu/type-config-nestjs`                                  |
| nestjs-remote | `@snow-tzu/type-config-nestjs` + `@snow-tzu/type-config-remote` |
| nodejs-basic  | `@snow-tzu/type-config`                                         |

## Testing Configuration Changes

### Profile Switching

```bash
# Development (default)
yarn dev

# Production
NODE_ENV=production yarn dev

# Custom profile
NODE_ENV=staging yarn dev
```

### Environment Variable Substitution

In your config file:

```yaml
database:
  password: ${DB_PASSWORD}
```

Then run:

```bash
export DB_PASSWORD=my-secret
yarn dev
```

## Remote Config Server (nestjs-remote example)

The `nestjs-remote` example requires a Spring Cloud Config Server or compatible server.

### Mock Server Response Format

```json
{
  "name": "nestjs-app",
  "profiles": [
    "development"
  ],
  "label": "main",
  "propertySources": [
    {
      "name": "file:///config/application.yml",
      "source": {
        "server.port": 3001,
        "database.host": "remote-db.example.com"
      }
    }
  ]
}
```

## Troubleshooting

### Dependencies not found

```bash
# From root directory
yarn install
```

### TypeScript errors

```bash
# Clean and rebuild
yarn clean
yarn build
```

### Config not loading

- Check file paths are relative to the executable location
- Verify YAML syntax is valid
- Check required fields are provided

### Port already in use

```bash
# Change port in config file or use environment variable
PORT=3001 yarn dev
```

## Next Steps

1. Choose an example that matches your framework
2. Follow the example's README for detailed instructions
3. Customize the configuration classes for your needs
4. Refer to the main project documentation for advanced features

## Contributing

To add a new example:

1. Create a new directory under `examples/`
2. Follow the structure of existing examples
3. Add documentation (README.md)
4. Update this file with your example
