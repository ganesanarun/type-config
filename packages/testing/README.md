# @snow-tzu/type-config-testing

Testing utilities and mocks for @snow-tzu/type-config. Simplify your tests with in-memory configuration and mock config classes.

## Installation

```bash
npm install --save-dev @snow-tzu/type-config-testing
```

## Features

- 🎯 **In-memory configuration** - No file I/O during tests
- 🔧 **Mock config classes** - Easily create mock configuration instances
- ⚡ **Fast test execution** - No file watching or async loading delays
- 🧪 **Jest/Vitest compatible** - Works with popular testing frameworks
- 🔄 **Type-safe mocks** - Full TypeScript support

## Quick Start

### Basic Mock Configuration

```typescript
import { createMockConfig } from '@snow-tzu/type-config-testing';

describe('UserService', () => {
  it('should connect to database', () => {
    const config = createMockConfig({
      'database.host': 'localhost',
      'database.port': 5432,
      'database.username': 'test_user'
    });

    const host = config.get('database.host');
    expect(host).toBe('localhost');
  });
});
```

### Mock Configuration with Classes

```typescript
import { createMockConfigWithClasses } from '@snow-tzu/type-config-testing';
import { ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config';

@ConfigurationProperties('database')
class DatabaseConfig {
  @ConfigProperty() host: string;
  @ConfigProperty() port: number;
  @ConfigProperty() username: string;
}

describe('UserService', () => {
  it('should use config class', () => {
    const { configManager, container } = createMockConfigWithClasses(
      {
        'database.host': 'test-host',
        'database.port': 3306,
        'database.username': 'test_user'
      },
      [DatabaseConfig]
    );

    const dbConfig = container.get(DatabaseConfig);
    expect(dbConfig.host).toBe('test-host');
    expect(dbConfig.port).toBe(3306);
  });
});
```

### Mock Individual Config Class

```typescript
import { mockConfigClass } from '@snow-tzu/type-config-testing';

describe('DatabaseService', () => {
  it('should connect with mock config', () => {
    const mockDb = mockConfigClass(DatabaseConfig, {
      host: 'mock-host',
      port: 5432,
      username: 'mock_user',
      password: 'mock_pass'
    });

    const service = new DatabaseService(mockDb);
    expect(service.getConnectionString()).toContain('mock-host');
  });
});
```

## API

### `createMockConfig(values)`

Create a mock ConfigManager with in-memory values.

**Parameters:**
- `values: Record<string, any>` - Configuration values in dot notation

**Returns:**
- `ConfigManager` - Mock configuration manager instance

**Example:**
```typescript
const config = createMockConfig({
  'server.port': 3000,
  'server.host': 'localhost',
  'database.host': 'db.example.com',
  'database.pool.min': 2,
  'database.pool.max': 10
});

console.log(config.get('server.port')); // 3000
console.log(config.get('database.pool.max')); // 10
console.log(config.getAll()); // { server: {...}, database: {...} }
```

### `createMockConfigWithClasses(values, configClasses)`

Create a mock ConfigManager with config classes registered.

**Parameters:**
- `values: Record<string, any>` - Configuration values in dot notation
- `configClasses: Constructor[]` - Array of configuration class constructors

**Returns:**
- `{ configManager: ConfigManager, container: Container }` - Mock manager and DI container

**Example:**
```typescript
const { configManager, container } = createMockConfigWithClasses(
  {
    'server.port': 8080,
    'server.host': '0.0.0.0',
    'database.host': 'prod-db',
    'database.port': 5432
  },
  [ServerConfig, DatabaseConfig]
);

const serverConfig = container.get(ServerConfig);
const dbConfig = container.get(DatabaseConfig);
```

### `mockConfigClass(ConfigClass, values)`

Create a mock instance of a configuration class with provided values.

**Parameters:**
- `ConfigClass: Constructor` - Configuration class constructor
- `values: Partial<T>` - Values to populate the instance

**Returns:**
- `T` - Instance of the configuration class with values set

**Example:**
```typescript
@ConfigurationProperties('cache')
class CacheConfig {
  @ConfigProperty() host: string;
  @ConfigProperty() port: number;
  @ConfigProperty() ttl: number;
}

const mockCache = mockConfigClass(CacheConfig, {
  host: 'redis-mock',
  port: 6379,
  ttl: 3600
});

expect(mockCache.host).toBe('redis-mock');
expect(mockCache instanceof CacheConfig).toBe(true);
```

## Testing Patterns

### Testing Services with Injected Config

**Service:**
```typescript
// user.service.ts
export class UserService {
  constructor(private readonly dbConfig: DatabaseConfig) {}

  async findUser(id: string) {
    const connection = await connect(this.dbConfig.host, this.dbConfig.port);
    // ...
  }
}
```

**Test:**
```typescript
// user.service.spec.ts
import { mockConfigClass } from '@snow-tzu/config-testing';

describe('UserService', () => {
  let service: UserService;
  let mockDbConfig: DatabaseConfig;

  beforeEach(() => {
    mockDbConfig = mockConfigClass(DatabaseConfig, {
      host: 'test-db',
      port: 5432,
      username: 'test',
      password: 'test'
    });
    service = new UserService(mockDbConfig);
  });

  it('should connect to test database', async () => {
    // Test with mock config
    await service.findUser('123');
    expect(mockDbConfig.host).toBe('test-db');
  });
});
```

### Testing Express Middleware

```typescript
import { createMockConfigWithClasses } from '@snow-tzu/config-testing';
import { createTypeConfig } from '@snow-tzu/config-express';
import request from 'supertest';
import express from 'express';

describe('Express App', () => {
  it('should use mock config', async () => {
    const { configManager, container } = createMockConfigWithClasses(
      { 'server.port': 3000 },
      [ServerConfig]
    );

    const app = express();
    app.use((req, res, next) => {
      req.container = container;
      req.config = configManager;
      next();
    });

    app.get('/config', (req, res) => {
      const config = req.container!.get(ServerConfig);
      res.json({ port: config.port });
    });

    const response = await request(app).get('/config');
    expect(response.body.port).toBe(3000);
  });
});
```

### Testing NestJS Services

```typescript
import { Test } from '@nestjs/testing';
import { mockConfigClass } from '@snow-tzu/config-testing';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const mockServerConfig = mockConfigClass(ServerConfig, {
      port: 3000,
      host: 'localhost'
    });

    const mockDbConfig = mockConfigClass(DatabaseConfig, {
      host: 'test-db',
      port: 5432
    });

    const module = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: ServerConfig, useValue: mockServerConfig },
        { provide: DatabaseConfig, useValue: mockDbConfig }
      ]
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should use mock config', () => {
    const config = service.getConfig();
    expect(config.server.port).toBe(3000);
    expect(config.database.host).toBe('test-db');
  });
});
```

### Testing with Multiple Profiles

```typescript
describe('Config Profiles', () => {
  it('should use development config', () => {
    const devConfig = createMockConfig({
      'database.host': 'localhost',
      'database.pool.max': 5,
      'debug.enabled': true
    });

    expect(devConfig.get('debug.enabled')).toBe(true);
  });

  it('should use production config', () => {
    const prodConfig = createMockConfig({
      'database.host': 'prod-db.example.com',
      'database.pool.max': 50,
      'debug.enabled': false
    });

    expect(prodConfig.get('debug.enabled')).toBe(false);
    expect(prodConfig.get('database.pool.max')).toBe(50);
  });
});
```

### Testing Environment Variable Overrides

```typescript
describe('Environment Variables', () => {
  it('should override with env vars', () => {
    const config = createMockConfig({
      'database.host': 'default-host',
      'DATABASE_HOST': 'env-host' // Simulates env var
    });

    // In real scenarios, env vars would be loaded by ConfigManager
    const host = config.get('DATABASE_HOST') || config.get('database.host');
    expect(host).toBe('env-host');
  });
});
```

### Testing Validation

```typescript
import { validate } from 'class-validator';

describe('Config Validation', () => {
  it('should fail validation for invalid config', async () => {
    @ConfigurationProperties('api')
    @Validate()
    class ApiConfig {
      @ConfigProperty() @IsUrl() baseUrl: string;
      @ConfigProperty() @Min(1000) @Max(30000) timeout: number;
    }

    const invalidConfig = mockConfigClass(ApiConfig, {
      baseUrl: 'not-a-url',
      timeout: 50 // Too low
    });

    const errors = await validate(invalidConfig);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

## Integration with Testing Frameworks

### Jest

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@snow-tzu/config-testing$': '<rootDir>/node_modules/@snow-tzu/config-testing'
  }
};

// test/setup.ts
import 'reflect-metadata';

// test/user.service.spec.ts
import { createMockConfigWithClasses } from '@snow-tzu/config-testing';

describe('UserService', () => {
  // tests...
});
```

### Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts']
  }
});

// test/setup.ts
import 'reflect-metadata';
```

## Best Practices

1. **Use type-safe mocks** - Always prefer `mockConfigClass()` over plain objects
2. **Mock at the right level** - Mock ConfigManager for integration tests, mock config classes for unit tests
3. **Keep mocks simple** - Only provide values needed for the specific test
4. **Test validation separately** - Use dedicated tests for configuration validation logic
5. **Use beforeEach** - Reset mocks between tests to avoid state leakage

## Complete Example

Here's a full example testing a service with configuration:

```typescript
import { Test } from '@nestjs/testing';
import { mockConfigClass } from '@snow-tzu/config-testing';
import { DatabaseConfig } from './config/database.config';
import { CacheConfig } from './config/cache.config';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let dbConfig: DatabaseConfig;
  let cacheConfig: CacheConfig;

  beforeEach(async () => {
    // Create mock configs
    dbConfig = mockConfigClass(DatabaseConfig, {
      host: 'test-db',
      port: 5432,
      username: 'test_user',
      password: 'test_pass',
      database: 'test_db'
    });

    cacheConfig = mockConfigClass(CacheConfig, {
      host: 'test-redis',
      port: 6379,
      ttl: 3600
    });

    // Create testing module
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: DatabaseConfig, useValue: dbConfig },
        { provide: CacheConfig, useValue: cacheConfig }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should use database config', async () => {
    const result = await service.findUser('123');
    expect(result).toBeDefined();
    // Verify it used the test database
  });

  it('should use cache config', async () => {
    await service.cacheUser('123', { name: 'Test' });
    // Verify caching worked with test redis
  });

  it('should handle connection errors', async () => {
    // Test error handling with mock config
    dbConfig.host = 'invalid-host';
    await expect(service.findUser('123')).rejects.toThrow();
  });
});
```

## Related Packages

- **[@snow-tzu/type-config](../core)** - Core configuration system
- **[@snow-tzu/type-config-nestjs](../nestjs)** - NestJS integration (testing NestJS apps)
- **[@snow-tzu/type-config-express](../express)** - Express integration (testing Express apps)
- **[@snow-tzu/type-config-fastify](../fastify)** - Fastify integration (testing Fastify apps)

## Examples

See the test files in each example project:

- **[Express Basic Tests](../../examples/express-basic/test)** - Testing Express with mocks
- **[NestJS Basic Tests](../../examples/nestjs-basic/test)** - Testing NestJS services
- **[Core Package Tests](../core/test)** - Core functionality tests

## Resources

- **[Main Documentation](../../README.md)** - Project overview
- **[Quick Start Guide](../../QUICKSTART.md)** - Get started quickly
- **[Examples Directory](../../examples)** - Working example projects

## License

MIT
