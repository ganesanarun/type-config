import 'reflect-metadata';
import { ConfigManager } from '../src/config-manager';
import {
  ConfigurationProperties,
  ConfigProperty,
  DefaultValue,
  Required,
  Validate,
} from '../src/decorators';
import { IsNumber, Min, Max } from 'class-validator';

describe('ConfigManager - Nested Class Binding', () => {
  let manager: ConfigManager;

  beforeEach(() => {
    manager = new ConfigManager({
      validateOnBind: true,
    });
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('bindNestedClass', () => {
    it('should bind a simple nested class with default values', () => {
      class CircuitBreakerOptions {
        @DefaultValue(10000)
        timeout!: number;

        @DefaultValue(50)
        errorThresholdPercentage!: number;
      }

      const configValue = { timeout: 5000 };
      const result = (manager as any).bindNestedClass(
        configValue,
        CircuitBreakerOptions,
        'circuitBreaker'
      );

      expect(result).toBeInstanceOf(CircuitBreakerOptions);
      expect(result.timeout).toBe(5000);
      expect(result.errorThresholdPercentage).toBe(50); // Default value
    });

    it('should apply all default values when config is empty', () => {
      class CircuitBreakerOptions {
        @DefaultValue(10000)
        timeout!: number;

        @DefaultValue(50)
        errorThresholdPercentage!: number;

        @DefaultValue(10)
        volumeThreshold!: number;
      }

      const configValue = {};
      const result = (manager as any).bindNestedClass(
        configValue,
        CircuitBreakerOptions,
        'circuitBreaker'
      );

      expect(result).toBeInstanceOf(CircuitBreakerOptions);
      expect(result.timeout).toBe(10000);
      expect(result.errorThresholdPercentage).toBe(50);
      expect(result.volumeThreshold).toBe(10);
    });

    it('should validate required properties in nested class', () => {
      class CircuitBreakerOptions {
        @DefaultValue(10000)
        timeout!: number;

        @Required()
        volumeThreshold!: number;
      }

      const configValue = { timeout: 5000 };

      expect(() => {
        (manager as any).bindNestedClass(
          configValue,
          CircuitBreakerOptions,
          'circuitBreaker'
        );
      }).toThrow("Required configuration property 'circuitBreaker.volumeThreshold' is missing");
    });

    it('should satisfy required constraint with default value', () => {
      class CircuitBreakerOptions {
        @Required()
        @DefaultValue(10)
        volumeThreshold!: number;
      }

      const configValue = {};
      const result = (manager as any).bindNestedClass(
        configValue,
        CircuitBreakerOptions,
        'circuitBreaker'
      );

      expect(result).toBeInstanceOf(CircuitBreakerOptions);
      expect(result.volumeThreshold).toBe(10);
    });

    it('should validate nested class with class-validator', () => {
      @Validate()
      class CircuitBreakerOptions {
        @IsNumber()
        @Min(1)
        @Max(100000)
        timeout!: number;
      }

      const configValue = { timeout: 'invalid' };

      expect(() => {
        (manager as any).bindNestedClass(
          configValue,
          CircuitBreakerOptions,
          'circuitBreaker'
        );
      }).toThrow(/Validation failed for CircuitBreakerOptions at path 'circuitBreaker'/);
    });

    it('should skip validation when validateOnBind is false', () => {
      const managerNoValidation = new ConfigManager({
        validateOnBind: false,
      });

      @Validate()
      class CircuitBreakerOptions {
        @IsNumber()
        @Min(1)
        timeout!: number;
      }

      const configValue = { timeout: 'invalid' };
      const result = (managerNoValidation as any).bindNestedClass(
        configValue,
        CircuitBreakerOptions,
        'circuitBreaker'
      );

      expect(result).toBeInstanceOf(CircuitBreakerOptions);
      // Type conversion still happens (string 'invalid' -> NaN), but validation is skipped
      expect(isNaN(result.timeout)).toBe(true);
    });

    it('should recursively bind nested classes', () => {
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

        // Need to explicitly set the type for TypeScript reflection
        @ConfigProperty('pool')
        pool!: PoolConfig;
      }

      const configValue = {
        host: 'localhost',
        pool: {
          maxConnections: 20,
        },
      };

      const result = (manager as any).bindNestedClass(
        configValue,
        DatabaseConfig,
        'database'
      );

      expect(result).toBeInstanceOf(DatabaseConfig);
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(5432);
      expect(result.pool).toBeInstanceOf(PoolConfig);
      expect(result.pool.maxConnections).toBe(20);
      expect(result.pool.minConnections).toBe(1); // Default value
    });

    it('should handle properties without @ConfigProperty decorator', () => {
      class CircuitBreakerOptions {
        @DefaultValue(10000)
        timeout!: number;

        @Required()
        volumeThreshold!: number;
      }

      const configValue = {
        timeout: 5000,
        volumeThreshold: 10,
      };

      const result = (manager as any).bindNestedClass(
        configValue,
        CircuitBreakerOptions,
        'circuitBreaker'
      );

      expect(result).toBeInstanceOf(CircuitBreakerOptions);
      expect(result.timeout).toBe(5000);
      expect(result.volumeThreshold).toBe(10);
    });

    it('should create instance for null/undefined when class has defaults, return primitives as-is', () => {
      class CircuitBreakerOptions {
        @DefaultValue(10000)
        timeout!: number;
      }

      // With @DefaultValue, null/undefined should create instances
      const nullResult = (manager as any).bindNestedClass(null, CircuitBreakerOptions, 'test');
      expect(nullResult).toBeInstanceOf(CircuitBreakerOptions);
      expect(nullResult.timeout).toBe(10000);
      
      const undefinedResult = (manager as any).bindNestedClass(undefined, CircuitBreakerOptions, 'test');
      expect(undefinedResult).toBeInstanceOf(CircuitBreakerOptions);
      expect(undefinedResult.timeout).toBe(10000);
      
      // Primitives and arrays should still return as-is
      expect((manager as any).bindNestedClass('string', CircuitBreakerOptions, 'test')).toBe('string');
      expect((manager as any).bindNestedClass(123, CircuitBreakerOptions, 'test')).toBe(123);
      expect((manager as any).bindNestedClass([1, 2, 3], CircuitBreakerOptions, 'test')).toEqual([1, 2, 3]);
    });

    it('should handle custom property paths with @ConfigProperty', () => {
      class CircuitBreakerOptions {
        @ConfigProperty('timeout_ms')
        @DefaultValue(10000)
        timeout!: number;
      }

      const configValue = {
        timeout_ms: 5000,
      };

      const result = (manager as any).bindNestedClass(
        configValue,
        CircuitBreakerOptions,
        'circuitBreaker'
      );

      expect(result).toBeInstanceOf(CircuitBreakerOptions);
      expect(result.timeout).toBe(5000);
    });
  });

  describe('Single-level nested classes', () => {
    it('should bind nested class with @DefaultValue decorators', () => {
      class RetryConfig {
        @DefaultValue(3)
        maxRetries!: number;

        @DefaultValue(1000)
        retryDelay!: number;

        @DefaultValue(2)
        backoffMultiplier!: number;
      }

      @ConfigurationProperties('service')
      class ServiceConfig {
        @ConfigProperty('retry')
        retryConfig!: RetryConfig;
      }

      (manager as any).config = {
        service: {
          retry: {
            maxRetries: 5,
          },
        },
      };

      const config = manager.bind(ServiceConfig);

      expect(config.retryConfig).toBeInstanceOf(RetryConfig);
      expect(config.retryConfig.maxRetries).toBe(5);
      expect(config.retryConfig.retryDelay).toBe(1000); // Default
      expect(config.retryConfig.backoffMultiplier).toBe(2); // Default
    });

    it('should bind nested class with @Required decorators', () => {
      class AuthConfig {
        @Required()
        apiKey!: string;

        @Required()
        secretKey!: string;

        @DefaultValue('https://auth.example.com')
        authUrl!: string;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('auth')
        authConfig!: AuthConfig;
      }

      (manager as any).config = {
        app: {
          auth: {
            apiKey: 'test-api-key',
            secretKey: 'test-secret-key',
          },
        },
      };

      const config = manager.bind(AppConfig);

      expect(config.authConfig).toBeInstanceOf(AuthConfig);
      expect(config.authConfig.apiKey).toBe('test-api-key');
      expect(config.authConfig.secretKey).toBe('test-secret-key');
      expect(config.authConfig.authUrl).toBe('https://auth.example.com');
    });

    it('should bind nested class with @Validate() decorators', () => {
      @Validate()
      class RateLimitConfig {
        @IsNumber()
        @Min(1)
        @Max(1000)
        requestsPerMinute!: number;

        @IsNumber()
        @Min(1)
        @Max(3600)
        windowSeconds!: number;
      }

      @ConfigurationProperties('api')
      class ApiConfig {
        @ConfigProperty('rateLimit')
        rateLimitConfig!: RateLimitConfig;
      }

      (manager as any).config = {
        api: {
          rateLimit: {
            requestsPerMinute: 100,
            windowSeconds: 60,
          },
        },
      };

      const config = manager.bind(ApiConfig);

      expect(config.rateLimitConfig).toBeInstanceOf(RateLimitConfig);
      expect(config.rateLimitConfig.requestsPerMinute).toBe(100);
      expect(config.rateLimitConfig.windowSeconds).toBe(60);
    });

    it('should bind nested class with mixed decorators', () => {
      @Validate()
      class CacheConfig {
        @Required()
        @IsNumber()
        @Min(1)
        ttl!: number;

        @DefaultValue(100)
        @IsNumber()
        @Max(10000)
        maxSize!: number;

        @DefaultValue('memory')
        cacheType!: string;

        @Required()
        enabled!: boolean;
      }

      @ConfigurationProperties('cache')
      class CacheSettings {
        @ConfigProperty('config')
        cacheConfig!: CacheConfig;
      }

      (manager as any).config = {
        cache: {
          config: {
            ttl: 3600,
            enabled: true,
            maxSize: 500,
          },
        },
      };

      const config = manager.bind(CacheSettings);

      expect(config.cacheConfig).toBeInstanceOf(CacheConfig);
      expect(config.cacheConfig.ttl).toBe(3600);
      expect(config.cacheConfig.maxSize).toBe(500);
      expect(config.cacheConfig.cacheType).toBe('memory'); // Default
      expect(config.cacheConfig.enabled).toBe(true);
    });

    it('should throw error when required property is missing in nested class', () => {
      class DatabaseConfig {
        @Required()
        host!: string;

        @Required()
        port!: number;

        @DefaultValue('mydb')
        database!: string;
      }

      @ConfigurationProperties('db')
      class DbSettings {
        @ConfigProperty('connection')
        dbConfig!: DatabaseConfig;
      }

      (manager as any).config = {
        db: {
          connection: {
            host: 'localhost',
            // Missing port
          },
        },
      };

      expect(() => {
        manager.bind(DbSettings);
      }).toThrow("Required configuration property 'dbConfig.port' is missing");
    });

    it('should throw validation error for invalid nested class data', () => {
      @Validate()
      class TimeoutConfig {
        @IsNumber()
        @Min(100)
        @Max(30000)
        connectionTimeout!: number;

        @IsNumber()
        @Min(100)
        requestTimeout!: number;
      }

      @ConfigurationProperties('http')
      class HttpConfig {
        @ConfigProperty('timeouts')
        timeoutConfig!: TimeoutConfig;
      }

      (manager as any).config = {
        http: {
          timeouts: {
            connectionTimeout: 50, // Invalid: < 100
            requestTimeout: 5000,
          },
        },
      };

      expect(() => {
        manager.bind(HttpConfig);
      }).toThrow(/Validation failed for TimeoutConfig/);
    });
  });

  describe('Multi-level nested classes', () => {
    it('should bind 2-level nested classes', () => {
      class SslConfig {
        @DefaultValue(true)
        enabled!: boolean;

        @DefaultValue(false)
        rejectUnauthorized!: boolean;
      }

      class ConnectionConfig {
        @Required()
        host!: string;

        @DefaultValue(443)
        port!: number;

        @ConfigProperty('ssl')
        sslConfig!: SslConfig;
      }

      @ConfigurationProperties('server')
      class ServerConfig {
        @ConfigProperty('connection')
        connectionConfig!: ConnectionConfig;
      }

      (manager as any).config = {
        server: {
          connection: {
            host: 'api.example.com',
            ssl: {
              rejectUnauthorized: true,
            },
          },
        },
      };

      const config = manager.bind(ServerConfig);

      expect(config.connectionConfig).toBeInstanceOf(ConnectionConfig);
      expect(config.connectionConfig.host).toBe('api.example.com');
      expect(config.connectionConfig.port).toBe(443); // Default
      expect(config.connectionConfig.sslConfig).toBeInstanceOf(SslConfig);
      expect(config.connectionConfig.sslConfig.enabled).toBe(true); // Default
      expect(config.connectionConfig.sslConfig.rejectUnauthorized).toBe(true);
    });

    it('should bind 3+ level nested classes', () => {
      class LogFormatConfig {
        @DefaultValue('json')
        format!: string;

        @DefaultValue(true)
        prettyPrint!: boolean;
      }

      class LogLevelConfig {
        @DefaultValue('info')
        default!: string;

        @ConfigProperty('format')
        formatConfig!: LogFormatConfig;
      }

      class LoggingConfig {
        @DefaultValue(true)
        enabled!: boolean;

        @ConfigProperty('level')
        levelConfig!: LogLevelConfig;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('logging')
        loggingConfig!: LoggingConfig;
      }

      (manager as any).config = {
        app: {
          logging: {
            level: {
              default: 'debug',
              format: {
                format: 'text',
              },
            },
          },
        },
      };

      const config = manager.bind(AppConfig);

      expect(config.loggingConfig).toBeInstanceOf(LoggingConfig);
      expect(config.loggingConfig.enabled).toBe(true); // Default
      expect(config.loggingConfig.levelConfig).toBeInstanceOf(LogLevelConfig);
      expect(config.loggingConfig.levelConfig.default).toBe('debug');
      expect(config.loggingConfig.levelConfig.formatConfig).toBeInstanceOf(LogFormatConfig);
      expect(config.loggingConfig.levelConfig.formatConfig.format).toBe('text');
      expect(config.loggingConfig.levelConfig.formatConfig.prettyPrint).toBe(true); // Default
    });

    it('should apply decorators at all levels of nesting', () => {
      @Validate()
      class HealthCheckConfig {
        @Required()
        @IsNumber()
        @Min(1000)
        interval!: number;

        @DefaultValue(3)
        @IsNumber()
        @Max(10)
        retries!: number;
      }

      class MonitoringConfig {
        @Required()
        enabled!: boolean;

        @DefaultValue('/health')
        endpoint!: string;

        @ConfigProperty('healthCheck')
        healthCheckConfig!: HealthCheckConfig;
      }

      @ConfigurationProperties('service')
      class ServiceConfig {
        @Required()
        name!: string;

        @ConfigProperty('monitoring')
        monitoringConfig!: MonitoringConfig;
      }

      (manager as any).config = {
        service: {
          name: 'my-service',
          monitoring: {
            enabled: true,
            healthCheck: {
              interval: 5000,
            },
          },
        },
      };

      const config = manager.bind(ServiceConfig);

      expect(config).toBeInstanceOf(ServiceConfig);
      expect(config.name).toBe('my-service');
      expect(config.monitoringConfig).toBeInstanceOf(MonitoringConfig);
      expect(config.monitoringConfig.enabled).toBe(true);
      expect(config.monitoringConfig.endpoint).toBe('/health'); // Default
      expect(config.monitoringConfig.healthCheckConfig).toBeInstanceOf(HealthCheckConfig);
      expect(config.monitoringConfig.healthCheckConfig.interval).toBe(5000);
      expect(config.monitoringConfig.healthCheckConfig.retries).toBe(3); // Default
    });
  });

  describe('Error scenarios', () => {
    it('should throw descriptive error for missing required property in nested class', () => {
      class ApiConfig {
        @Required()
        endpoint!: string;

        @Required()
        apiKey!: string;
      }

      @ConfigurationProperties('service')
      class ServiceConfig {
        @ConfigProperty('api')
        apiConfig!: ApiConfig;
      }

      (manager as any).config = {
        service: {
          api: {
            endpoint: 'https://api.example.com',
            // Missing apiKey
          },
        },
      };

      expect(() => {
        manager.bind(ServiceConfig);
      }).toThrow("Required configuration property 'apiConfig.apiKey' is missing");
    });

    it('should throw descriptive error for missing required property in deeply nested class', () => {
      class CredentialsConfig {
        @Required()
        username!: string;

        @Required()
        password!: string;
      }

      class AuthConfig {
        @ConfigProperty('credentials')
        credentialsConfig!: CredentialsConfig;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('auth')
        authConfig!: AuthConfig;
      }

      (manager as any).config = {
        app: {
          auth: {
            credentials: {
              username: 'admin',
              // Missing password
            },
          },
        },
      };

      expect(() => {
        manager.bind(AppConfig);
      }).toThrow("Required configuration property 'credentialsConfig.password' is missing");
    });

    it('should throw descriptive validation error for nested class', () => {
      @Validate()
      class PortConfig {
        @IsNumber()
        @Min(1)
        @Max(65535)
        port!: number;
      }

      @ConfigurationProperties('server')
      class ServerConfig {
        @ConfigProperty('portConfig')
        portConfig!: PortConfig;
      }

      (manager as any).config = {
        server: {
          portConfig: {
            port: 70000, // Invalid: > 65535
          },
        },
      };

      expect(() => {
        manager.bind(ServerConfig);
      }).toThrow(/Validation failed for PortConfig at path 'portConfig'/);
      expect(() => {
        manager.bind(ServerConfig);
      }).toThrow(/port must not be greater than 65535/);
    });

    it('should throw descriptive validation error for deeply nested class', () => {
      @Validate()
      class RangeConfig {
        @IsNumber()
        @Min(0)
        min!: number;

        @IsNumber()
        @Max(100)
        max!: number;
      }

      class LimitsConfig {
        @ConfigProperty('range')
        rangeConfig!: RangeConfig;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('limits')
        limitsConfig!: LimitsConfig;
      }

      (manager as any).config = {
        app: {
          limits: {
            range: {
              min: 0,
              max: 150, // Invalid: > 100
            },
          },
        },
      };

      expect(() => {
        manager.bind(AppConfig);
      }).toThrow(/Validation failed for RangeConfig at path 'rangeConfig'/);
    });

    it('should handle invalid nested class types gracefully', () => {
      class NestedConfig {
        @DefaultValue(10)
        value!: number;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('nested')
        nestedConfig!: NestedConfig;
      }

      // Provide a non-object value where an object is expected
      (manager as any).config = {
        app: {
          nested: 'invalid-string',
        },
      };

      const config = manager.bind(AppConfig);

      // Should return the value as-is when it's not an object
      expect(config.nestedConfig).toBe('invalid-string');
    });
  });

  describe('Edge cases', () => {
    it('should bind nested class with no decorators', () => {
      class PlainNestedConfig {
        value!: string;
        count!: number;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('plain')
        plainConfig!: PlainNestedConfig;
      }

      (manager as any).config = {
        app: {
          plain: {
            value: 'test',
            count: 42,
          },
        },
      };

      const config = manager.bind(AppConfig);

      // Without decorators, it should not be treated as a configuration class
      // and should be assigned as a plain object
      expect(typeof config.plainConfig).toBe('object');
      expect(config.plainConfig.value).toBe('test');
      expect(config.plainConfig.count).toBe(42);
    });

    it('should bind nested class with only some properties decorated', () => {
      class PartiallyDecoratedConfig {
        @DefaultValue('default-value')
        decoratedProp!: string;

        undecoratedProp!: string;

        @Required()
        requiredProp!: number;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('partial')
        partialConfig!: PartiallyDecoratedConfig;
      }

      (manager as any).config = {
        app: {
          partial: {
            undecoratedProp: 'undecorated',
            requiredProp: 123,
          },
        },
      };

      const config = manager.bind(AppConfig);

      expect(config.partialConfig).toBeInstanceOf(PartiallyDecoratedConfig);
      expect(config.partialConfig.decoratedProp).toBe('default-value'); // Default
      expect(config.partialConfig.undecoratedProp).toBe('undecorated');
      expect(config.partialConfig.requiredProp).toBe(123);
    });

    it('should handle nested class with @ConfigProperty custom paths', () => {
      class CustomPathConfig {
        @ConfigProperty('custom_timeout')
        @DefaultValue(5000)
        timeout!: number;

        @ConfigProperty('custom_retries')
        @Required()
        retries!: number;
      }

      @ConfigurationProperties('service')
      class ServiceConfig {
        @ConfigProperty('config')
        customConfig!: CustomPathConfig;
      }

      (manager as any).config = {
        service: {
          config: {
            custom_timeout: 10000,
            custom_retries: 3,
          },
        },
      };

      const config = manager.bind(ServiceConfig);

      expect(config.customConfig).toBeInstanceOf(CustomPathConfig);
      expect(config.customConfig.timeout).toBe(10000);
      expect(config.customConfig.retries).toBe(3);
    });

    it('should create instance with defaults when nested property is null and has @DefaultValue', () => {
      class NestedConfig {
        @DefaultValue(10)
        value!: number;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('nested')
        nestedConfig!: NestedConfig;
      }

      (manager as any).config = {
        app: {
          nested: null,
        },
      };

      const config = manager.bind(AppConfig);

      // With @DefaultValue, null/undefined should create an instance with defaults
      expect(config.nestedConfig).toBeInstanceOf(NestedConfig);
      expect(config.nestedConfig.value).toBe(10);
    });

    it('should create instance with defaults when nested property is undefined and has @DefaultValue', () => {
      class NestedConfig {
        @DefaultValue(10)
        value!: number;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @ConfigProperty('nested')
        nestedConfig!: NestedConfig;
      }

      (manager as any).config = {
        app: {
          // nested is undefined
        },
      };

      const config = manager.bind(AppConfig);

      // With @DefaultValue, null/undefined should create an instance with defaults
      expect(config.nestedConfig).toBeInstanceOf(NestedConfig);
      expect(config.nestedConfig.value).toBe(10);
    });

    it('should create instance when nested class has defaults even if parent has @DefaultValue(undefined)', () => {
      class NestedConfig {
        @DefaultValue(100)
        value!: number;
      }

      @ConfigurationProperties('app')
      class AppConfig {
        @DefaultValue(undefined)
        @ConfigProperty('nested')
        nestedConfig!: NestedConfig;
      }

      (manager as any).config = {
        app: {
          // nested is missing
        },
      };

      const config = manager.bind(AppConfig);

      // When nested class has @DefaultValue, it should create an instance
      // even if parent has @DefaultValue(undefined)
      expect(config.nestedConfig).toBeInstanceOf(NestedConfig);
      expect(config.nestedConfig.value).toBe(100);
    });
  });
});
