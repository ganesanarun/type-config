import 'reflect-metadata';
import { ConfigManager } from '../src/config-manager';
import {
  ConfigurationProperties,
  ConfigProperty,
  DefaultValue,
  Required,
  Validate,
} from '../src/decorators';
import { IsNumber, Min, Max, IsString } from 'class-validator';

describe('ConfigManager - Nested Class Integration', () => {
  let manager: ConfigManager;

  beforeEach(() => {
    // Create a manager with in-memory config
    manager = new ConfigManager({
      validateOnBind: true,
    });
  });

  afterEach(async () => {
    await manager.dispose();
  });

  it('should bind nested configuration classes through bind() method', async () => {
    // Define nested class
    class CircuitBreakerOptions {
      @DefaultValue(10000)
      timeout!: number;

      @DefaultValue(50)
      errorThresholdPercentage!: number;

      @Required()
      volumeThreshold!: number;
    }

    // Define parent class
    @ConfigurationProperties('clients.sample')
    class SampleClientConfig {
      @Required()
      @ConfigProperty('baseUrl')
      baseURL!: string;

      @ConfigProperty('circuitBreaker')
      circuitBreaker!: CircuitBreakerOptions;
    }

    // Set up config manually
    (manager as any).config = {
      clients: {
        sample: {
          baseUrl: 'https://api.example.com',
          circuitBreaker: {
            volumeThreshold: 10,
            timeout: 5000,
          },
        },
      },
    };

    const config = manager.bind(SampleClientConfig);

    expect(config).toBeInstanceOf(SampleClientConfig);
    expect(config.baseURL).toBe('https://api.example.com');
    expect(config.circuitBreaker).toBeInstanceOf(CircuitBreakerOptions);
    expect(config.circuitBreaker.timeout).toBe(5000);
    expect(config.circuitBreaker.errorThresholdPercentage).toBe(50); // Default
    expect(config.circuitBreaker.volumeThreshold).toBe(10);
  });

  it('should handle multi-level nested classes', async () => {
    class PoolConfig {
      @DefaultValue(10)
      maxConnections!: number;

      @DefaultValue(1)
      minConnections!: number;
    }

    class DatabaseConfig {
      @Required()
      host!: string;

      @DefaultValue(5432)
      port!: number;

      @ConfigProperty('pool')
      pool!: PoolConfig;
    }

    @ConfigurationProperties('app')
    class AppConfig {
      @ConfigProperty('database')
      database!: DatabaseConfig;
    }

    (manager as any).config = {
      app: {
        database: {
          host: 'localhost',
          pool: {
            maxConnections: 20,
          },
        },
      },
    };

    const config = manager.bind(AppConfig);

    expect(config).toBeInstanceOf(AppConfig);
    expect(config.database).toBeInstanceOf(DatabaseConfig);
    expect(config.database.host).toBe('localhost');
    expect(config.database.port).toBe(5432); // Default
    expect(config.database.pool).toBeInstanceOf(PoolConfig);
    expect(config.database.pool.maxConnections).toBe(20);
    expect(config.database.pool.minConnections).toBe(1); // Default
  });

  it('should bind nested classes with @DefaultValue decorator', async () => {
    // Note: Nested classes need at least one of our decorators (@DefaultValue, @Required, @Validate, @ConfigProperty)
    // to be detected as configuration classes. For validation tests, see nested-class-validation.spec.ts
    class CircuitBreakerOptions {
      @DefaultValue(10000)
      timeout!: number;

      @DefaultValue(50)
      errorThresholdPercentage!: number;
    }

    @ConfigurationProperties('clients.sample')
    class SampleClientConfig {
      @Required()
      @ConfigProperty('baseUrl')
      baseURL!: string;

      @ConfigProperty('circuitBreaker')
      circuitBreaker!: CircuitBreakerOptions;
    }

    (manager as any).config = {
      clients: {
        sample: {
          baseUrl: 'https://api.example.com',
          circuitBreaker: {
            timeout: 5000,
            // errorThresholdPercentage missing - should use default
          },
        },
      },
    };

    const config = manager.bind(SampleClientConfig);
    
    expect(config).toBeInstanceOf(SampleClientConfig);
    expect(config.circuitBreaker).toBeInstanceOf(CircuitBreakerOptions);
    expect(config.circuitBreaker.timeout).toBe(5000);
    expect(config.circuitBreaker.errorThresholdPercentage).toBe(50); // Default applied
  });

  it('should throw error for missing required property in nested class', async () => {
    class CircuitBreakerOptions {
      @Required()
      volumeThreshold!: number;
    }

    @ConfigurationProperties('clients.sample')
    class SampleClientConfig {
      @Required()
      @ConfigProperty('baseUrl')
      baseURL!: string;

      @ConfigProperty('circuitBreaker')
      circuitBreaker!: CircuitBreakerOptions;
    }

    (manager as any).config = {
      clients: {
        sample: {
          baseUrl: 'https://api.example.com',
          circuitBreaker: {
            // Missing volumeThreshold
          },
        },
      },
    };

    expect(() => {
      manager.bind(SampleClientConfig);
    }).toThrow("Required configuration property 'circuitBreaker.volumeThreshold' is missing");
  });

  it('should work without @ConfigProperty when property names match', async () => {
    class CircuitBreakerOptions {
      @DefaultValue(10000)
      timeout!: number;
    }

    @ConfigurationProperties('clients.sample')
    class SampleClientConfig {
      @Required()
      baseUrl!: string; // No @ConfigProperty, uses property name

      // Note: At least one decorator is needed for TypeScript to emit type metadata
      @DefaultValue(undefined)
      circuitBreaker!: CircuitBreakerOptions; // No @ConfigProperty, uses property name
    }

    (manager as any).config = {
      clients: {
        sample: {
          baseUrl: 'https://api.example.com',
          circuitBreaker: {
            timeout: 5000,
          },
        },
      },
    };

    const config = manager.bind(SampleClientConfig);

    expect(config).toBeInstanceOf(SampleClientConfig);
    expect(config.baseUrl).toBe('https://api.example.com');
    expect(config.circuitBreaker).toBeInstanceOf(CircuitBreakerOptions);
    expect(config.circuitBreaker.timeout).toBe(5000);
  });
});
