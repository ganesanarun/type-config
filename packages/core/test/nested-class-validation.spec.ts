import 'reflect-metadata';
import { ConfigManager } from '../src/config-manager';
import {
  ConfigurationProperties,
  ConfigProperty,
  DefaultValue,
  Required,
  Validate,
} from '../src/decorators';
import { IsString, IsNumber, Min, Max, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

describe('ConfigManager - Nested Class Validation', () => {
  let manager: ConfigManager;

  beforeEach(async () => {
    manager = new ConfigManager({
      configDir: './test-config',
      validateOnBind: true,
    });
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('@Validate() with @ValidateNested() and @Type()', () => {
    it('should validate nested classes with @ValidateNested() and @Type() decorators', async () => {
      // Arrange
      @Validate()
      class DatabaseConfig {
        @IsString()
        @Required()
        host!: string;

        @IsNumber()
        @Min(1)
        @Max(65535)
        @DefaultValue(5432)
        port!: number;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => DatabaseConfig)
        database!: DatabaseConfig;
      }

      // Mock config data
      (manager as any).config = {
        app: {
          database: {
            host: 'localhost',
            port: 5432,
          },
        },
      };

      // Act
      const config = manager.bind(AppConfig);

      // Assert
      expect(config.database).toBeInstanceOf(DatabaseConfig);
      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(5432);
    });

    it('should apply @DefaultValue in nested classes when value is missing', async () => {
      // Arrange
      @Validate()
      class ApiConfig {
        @IsUrl()
        @DefaultValue('https://api.example.com')
        endpoint!: string;

        @IsNumber()
        @Min(1000)
        @Max(30000)
        @DefaultValue(5000)
        timeout!: number;
      }

      @ConfigurationProperties('services')
      @Validate()
      class ServicesConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => ApiConfig)
        api!: ApiConfig;
      }

      // Mock config data - missing endpoint
      (manager as any).config = {
        services: {
          api: {
            timeout: 10000,
          },
        },
      };

      // Act
      const config = manager.bind(ServicesConfig);

      // Assert
      expect(config.api.endpoint).toBe('https://api.example.com'); // Default applied
      expect(config.api.timeout).toBe(10000); // Provided value used
    });

    it('should validate nested classes and throw error for invalid data', async () => {
      // Arrange
      @Validate()
      class PortConfig {
        @IsNumber()
        @Min(1)
        @Max(65535)
        port!: number;
      }

      @ConfigurationProperties('server')
      @Validate()
      class ServerConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => PortConfig)
        config!: PortConfig;
      }

      // Mock config data with invalid port
      (manager as any).config = {
        server: {
          config: {
            port: 99999, // Invalid - exceeds max
          },
        },
      };

      // Act & Assert
      expect(() => manager.bind(ServerConfig)).toThrow(/Validation failed/);
    });

    it('should validate multi-level nested classes', async () => {
      // Arrange
      @Validate()
      class SslConfig {
        @DefaultValue(false)
        enabled!: boolean;

        @IsString()
        @DefaultValue('./certs/cert.pem')
        certPath!: string;
      }

      @Validate()
      class ServerConfig {
        @IsString()
        @Required()
        host!: string;

        @IsNumber()
        @Min(1)
        @Max(65535)
        @Required()
        port!: number;

        @ConfigProperty()
        @ValidateNested()
        @Type(() => SslConfig)
        ssl!: SslConfig;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => ServerConfig)
        server!: ServerConfig;
      }

      // Mock config data
      (manager as any).config = {
        app: {
          server: {
            host: 'localhost',
            port: 3000,
            ssl: {
              enabled: true,
              certPath: '/etc/ssl/cert.pem',
            },
          },
        },
      };

      // Act
      const config = manager.bind(AppConfig);

      // Assert
      expect(config.server).toBeInstanceOf(ServerConfig);
      expect(config.server.ssl).toBeInstanceOf(SslConfig);
      expect(config.server.host).toBe('localhost');
      expect(config.server.port).toBe(3000);
      expect(config.server.ssl.enabled).toBe(true);
      expect(config.server.ssl.certPath).toBe('/etc/ssl/cert.pem');
    });

    it('should apply defaults at all nesting levels', async () => {
      // Arrange
      @Validate()
      class PoolConfig {
        @IsNumber()
        @Min(1)
        @DefaultValue(10)
        maxConnections!: number;

        @IsNumber()
        @Min(1)
        @DefaultValue(1)
        minConnections!: number;
      }

      @Validate()
      class DatabaseConfig {
        @IsString()
        @Required()
        host!: string;

        @IsNumber()
        @DefaultValue(5432)
        port!: number;

        @ConfigProperty()
        @ValidateNested()
        @Type(() => PoolConfig)
        pool!: PoolConfig;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => DatabaseConfig)
        database!: DatabaseConfig;
      }

      // Mock config data - missing pool config entirely
      (manager as any).config = {
        app: {
          database: {
            host: 'localhost',
            // port missing - should use default
            pool: {
              // maxConnections missing - should use default
              minConnections: 2,
            },
          },
        },
      };

      // Act
      const config = manager.bind(AppConfig);

      // Assert
      expect(config.database.port).toBe(5432); // Default at level 1
      expect(config.database.pool.maxConnections).toBe(10); // Default at level 2
      expect(config.database.pool.minConnections).toBe(2); // Provided value
    });

    it('should validate @Required properties in nested classes', async () => {
      // Arrange
      @Validate()
      class DatabaseConfig {
        @IsString()
        @Required()
        host!: string;

        @IsString()
        @Required()
        username!: string;

        @IsString()
        @Required()
        password!: string;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => DatabaseConfig)
        database!: DatabaseConfig;
      }

      // Mock config data - missing required password
      (manager as any).config = {
        app: {
          database: {
            host: 'localhost',
            username: 'admin',
            // password missing
          },
        },
      };

      // Act & Assert
      expect(() => manager.bind(AppConfig)).toThrow(/Required configuration property.*password.*is missing/);
    });

    it('should validate multiple nested classes at same level', async () => {
      // Arrange
      @Validate()
      class ApiConfig {
        @IsUrl()
        @DefaultValue('https://api.example.com')
        endpoint!: string;
      }

      @Validate()
      class CacheConfig {
        @IsString()
        @Required()
        host!: string;

        @IsNumber()
        @DefaultValue(6379)
        port!: number;
      }

      @Validate()
      class ServicesConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => ApiConfig)
        api!: ApiConfig;

        @ConfigProperty()
        @ValidateNested()
        @Type(() => CacheConfig)
        cache!: CacheConfig;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => ServicesConfig)
        services!: ServicesConfig;
      }

      // Mock config data
      (manager as any).config = {
        app: {
          services: {
            api: {
              // endpoint missing - should use default
            },
            cache: {
              host: 'redis.local',
              // port missing - should use default
            },
          },
        },
      };

      // Act
      const config = manager.bind(AppConfig);

      // Assert
      expect(config.services.api.endpoint).toBe('https://api.example.com');
      expect(config.services.cache.host).toBe('redis.local');
      expect(config.services.cache.port).toBe(6379);
    });

    it('should throw error when @ValidateNested() is missing on nested class property', async () => {
      // Arrange
      @Validate()
      class DatabaseConfig {
        @IsString()
        host!: string;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        // Missing @ValidateNested() and @Type()
        database!: DatabaseConfig;
      }

      // Mock config data
      (manager as any).config = {
        app: {
          database: {
            host: 'localhost',
          },
        },
      };

      // Act & Assert
      expect(() => manager.bind(AppConfig)).toThrow(/an unknown value was passed to the validate function/);
    });

    it('should skip validation when validateOnBind is false', async () => {
      // Arrange
      const managerNoValidation = new ConfigManager({
        configDir: './test-config',
        validateOnBind: false,
      });
      await managerNoValidation.initialize();

      @Validate()
      class DatabaseConfig {
        @IsNumber()
        @Min(1)
        @Max(65535)
        port!: number;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => DatabaseConfig)
        database!: DatabaseConfig;
      }

      // Mock config data with invalid port
      (managerNoValidation as any).config = {
        app: {
          database: {
            port: 99999, // Invalid but should not throw
          },
        },
      };

      // Act
      const config = managerNoValidation.bind(AppConfig);

      // Assert - should not throw, validation is disabled
      expect(config.database.port).toBe(99999);

      await managerNoValidation.dispose();
    });

    it('should validate nested classes with @ConfigProperty when names match', async () => {
      // Arrange
      @Validate()
      class LoggingConfig {
        @IsString()
        @DefaultValue('info')
        level!: string;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        // @ConfigProperty with matching name
        @ConfigProperty()
        @ValidateNested()
        @Type(() => LoggingConfig)
        logging!: LoggingConfig;
      }

      // Mock config data
      (manager as any).config = {
        app: {
          logging: {
            level: 'debug',
          },
        },
      };

      // Act
      const config = manager.bind(AppConfig);

      // Assert
      expect(config.logging).toBeInstanceOf(LoggingConfig);
      expect(config.logging.level).toBe('debug');
    });
  });

  describe('Validation error messages', () => {
    it('should provide clear error messages for nested validation failures', async () => {
      // Arrange
      @Validate()
      class PortConfig {
        @IsNumber()
        @Min(1)
        @Max(65535)
        port!: number;
      }

      @ConfigurationProperties('server')
      @Validate()
      class ServerConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => PortConfig)
        config!: PortConfig;
      }

      // Mock config data with invalid port
      (manager as any).config = {
        server: {
          config: {
            port: 'invalid', // String instead of number
          },
        },
      };

      // Act & Assert
      try {
        manager.bind(ServerConfig);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.message).toContain('Validation failed');
        expect(error.message).toContain('port');
      }
    });

    it('should provide clear error messages for missing required nested properties', async () => {
      // Arrange
      @Validate()
      class DatabaseConfig {
        @IsString()
        @Required()
        host!: string;
      }

      @ConfigurationProperties('app')
      @Validate()
      class AppConfig {
        @ConfigProperty()
        @ValidateNested()
        @Type(() => DatabaseConfig)
        database!: DatabaseConfig;
      }

      // Mock config data - missing required host
      (manager as any).config = {
        app: {
          database: {},
        },
      };

      // Act & Assert
      try {
        manager.bind(AppConfig);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.message).toContain('Required configuration property');
        expect(error.message).toContain('database.host');
        expect(error.message).toContain('is missing');
      }
    });
  });
});
