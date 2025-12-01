import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigManager,
  ConfigProperty,
  ConfigurationProperties,
  DefaultValue,
  InMemoryConfigSource,
  Required,
  Validate,
} from '../src';
import { IsEmail, IsNumber, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';

describe('ConfigManager', () => {
  let tempDir: string;
  const createdManagers: ConfigManager[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
  });

  afterEach(async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const manager of createdManagers) {
      await manager.dispose();
    }
    createdManagers.length = 0;
  });

  describe('initialization', () => {
    it('should initialize with default options', async () => {
      const manager = new ConfigManager();
      createdManagers.push(manager);

      await manager.initialize();

      expect(manager.getProfile()).toBe(process.env.NODE_ENV || 'development');
    });

    it('should use provided profile', async () => {
      const manager = new ConfigManager({ profile: 'production' });
      createdManagers.push(manager);

      await manager.initialize();

      expect(manager.getProfile()).toBe('production');
    });

    it('should load config from JSON file', async () => {
      const configPath = path.join(tempDir, 'application.json');
      fs.writeFileSync(configPath, JSON.stringify({ database: { host: 'localhost' } }));

      const manager = new ConfigManager({ configDir: tempDir });
      createdManagers.push(manager);

      await manager.initialize();

      expect(manager.get('database.host')).toBe('localhost');
    });

    it('should load config from YAML file', async () => {
      const configPath = path.join(tempDir, 'application.yml');
      fs.writeFileSync(configPath, 'server:\n  port: 3000');

      const manager = new ConfigManager({ configDir: tempDir });
      createdManagers.push(manager);

      await manager.initialize();

      expect(manager.get('server.port')).toBe(3000);
    });

    it('should load profile-specific config', async () => {
      const basePath = path.join(tempDir, 'application.json');
      const prodPath = path.join(tempDir, 'application-production.json');
      fs.writeFileSync(basePath, JSON.stringify({ database: { host: 'localhost' } }));
      fs.writeFileSync(prodPath, JSON.stringify({ database: { host: 'prod-server' } }));

      const manager = new ConfigManager({ configDir: tempDir, profile: 'production' });
      createdManagers.push(manager);

      await manager.initialize();

      expect(manager.get('database.host')).toBe('prod-server');
    });

    it('should load additional sources', async () => {
      const additionalSource = new InMemoryConfigSource({ custom: { value: 'test' } }, 500);
      const manager = new ConfigManager({ additionalSources: [additionalSource] });
      createdManagers.push(manager);

      await manager.initialize();

      expect(manager.get('custom.value')).toBe('test');
    });

    it('should not initialize twice', async () => {
      const manager = new ConfigManager();
      createdManagers.push(manager);

      await manager.initialize();
      await manager.initialize();

      expect(manager.getProfile()).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve nested config value', async () => {
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource({ a: { b: { c: 'value' } } }, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const result = manager.get('a.b.c');

      expect(result).toBe('value');
    });

    it('should return default value when path not found', async () => {
      const manager = new ConfigManager();
      createdManagers.push(manager);
      await manager.initialize();

      const result = manager.get('non.existent.path', 'default');

      expect(result).toBe('default');
    });

    it('should return undefined when path not found and no default', async () => {
      const manager = new ConfigManager();
      createdManagers.push(manager);
      await manager.initialize();

      const result = manager.get('non.existent.path');

      expect(result).toBeUndefined();
    });

    it('should handle arrays', async () => {
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource({ items: ['a', 'b', 'c'] }, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const result = manager.get('items');

      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getAll', () => {
    it('should return all configuration', async () => {
      const config = { database: { host: 'localhost' }, server: { port: 3000 } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const result = manager.getAll();

      expect(result).toMatchObject(config);
    });

    it('should return copy of config', async () => {
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource({ test: 'value' }, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const result = manager.getAll();
      result.test = 'modified';

      expect(manager.get('test')).toBe('value');
    });
  });

  describe('bind', () => {
    it('should bind configuration to class instance', async () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @ConfigProperty()
        host!: string;

        @ConfigProperty()
        port!: number;
      }

      const config = { database: { host: 'localhost', port: 5432 } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(DatabaseConfig);

      expect(instance.host).toBe('localhost');
      expect(instance.port).toBe(5432);
    });

    it('should use default values', async () => {
      @ConfigurationProperties('server')
      class ServerConfig {
        @DefaultValue(3000)
        @ConfigProperty()
        port!: number;

        @DefaultValue('localhost')
        @ConfigProperty()
        host!: string;
      }

      const manager = new ConfigManager({ additionalSources: [new InMemoryConfigSource({}, 100)] });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(ServerConfig);

      expect(instance.port).toBe(3000);
      expect(instance.host).toBe('localhost');
    });

    it('should throw error for missing required property', async () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @Required()
        @ConfigProperty()
        host!: string;
      }

      const manager = new ConfigManager({ additionalSources: [new InMemoryConfigSource({}, 100)] });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(DatabaseConfig)).toThrow(
        "Required configuration property 'database.host' is missing"
      );
    });

    it('should return cached instance', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value!: string;
      }

      const config = { test: { value: 'original' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance1 = manager.bind(TestConfig);
      const instance2 = manager.bind(TestConfig);

      expect(instance1).toBe(instance2);
    });

    it('should throw error for class without ConfigurationProperties decorator', async () => {
      class PlainClass {}

      const manager = new ConfigManager();
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(PlainClass)).toThrow(
        'must be decorated with @ConfigurationProperties'
      );
    });

    it('should convert types correctly', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        stringValue!: string;

        @ConfigProperty()
        numberValue!: number;

        @ConfigProperty()
        booleanValue!: boolean;

        @ConfigProperty()
        arrayValue!: string[];
      }

      const config = {
        test: { stringValue: 123, numberValue: '456', booleanValue: 'true', arrayValue: 'single' },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(TestConfig);

      expect(instance.stringValue).toBe('123');
      expect(instance.numberValue).toBe(456);
      expect(instance.booleanValue).toBe(true);
      expect(instance.arrayValue).toEqual(['single']);
    });
  });

  describe('dispose', () => {
    it('should cleanup resources', async () => {
      const manager = new ConfigManager();
      createdManagers.push(manager);
      await manager.initialize();

      await manager.dispose();
    });
  });

  describe('encryption', () => {
    it('should initialize with encryption key', async () => {
      const encryptionKey = '12345678901234567890123456789012';
      const manager = new ConfigManager({
        encryptionKey,
        additionalSources: [new InMemoryConfigSource({ test: 'plain-value' }, 100)],
      });
      createdManagers.push(manager);

      await manager.initialize();

      expect(manager.get('test')).toBe('plain-value');
    });
  });

  describe('Map binding', () => {
    it('should bind configuration to Map property', async () => {
      @ConfigurationProperties('databases')
      class DatabasesConfig {
        @ConfigProperty('connections')
        connections!: Map<string, any>;
      }

      const config = {
        databases: {
          connections: {
            db1: { host: 'localhost', port: 5432 },
            db2: { host: 'remote', port: 5433 },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(DatabasesConfig);

      expect(instance.connections).toBeInstanceOf(Map);
      expect(instance.connections.size).toBe(2);
      expect(instance.connections.get('db1')).toEqual({ host: 'localhost', port: 5432 });
      expect(instance.connections.get('db2')).toEqual({ host: 'remote', port: 5433 });
    });

    it('should preserve nested structures in map values', async () => {
      @ConfigurationProperties('config')
      class TestConfig {
        @ConfigProperty('items')
        items!: Map<string, any>;
      }

      const config = {
        config: {
          items: {
            item1: {
              name: 'Test',
              nested: {
                deep: {
                  value: 'nested-value',
                },
              },
            },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(TestConfig);

      expect(instance.items.get('item1')).toEqual({
        name: 'Test',
        nested: {
          deep: {
            value: 'nested-value',
          },
        },
      });
    });

    it('should throw error when binding non-object to Map', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty('map')
        map!: Map<string, any>;
      }

      const config = { test: { map: 'not-an-object' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(TestConfig)).toThrow(
        "Cannot bind primitive value to Map<string, T> for property 'map'"
      );
    });

    it('should throw error when binding array to Map', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty('map')
        map!: Map<string, any>;
      }

      const config = { test: { map: ['array', 'values'] } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(TestConfig)).toThrow(
        "Cannot bind primitive value to Map<string, T> for property 'map'"
      );
    });

    it('should handle empty map', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty('map')
        map!: Map<string, any>;
      }

      const config = { test: { map: {} } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(TestConfig);

      expect(instance.map).toBeInstanceOf(Map);
      expect(instance.map.size).toBe(0);
    });

    it('should validate required Map property', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @Required()
        @ConfigProperty('map')
        map!: Map<string, any>;
      }

      const config = { test: {} };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(TestConfig)).toThrow(
        "Required configuration property 'test.map' is missing"
      );
    });

    it('should work with Map and default values', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @DefaultValue({})
        @ConfigProperty('map')
        map!: Map<string, any>;
      }

      const config = { test: {} };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(TestConfig);

      expect(instance.map).toBeInstanceOf(Map);
      expect(instance.map.size).toBe(0);
    });
  });

  describe('Map path access', () => {
    it('should access deep path into maps', async () => {
      const config = {
        databases: {
          connections: {
            'serhafen-us': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'secret',
              database: 'serhafen_common',
              schema: 'us',
            },
            'serhafen-ag': {
              host: 'remote-host',
              port: 5433,
              username: 'admin',
              password: 'admin-secret',
              database: 'serhafen_ag',
              schema: 'ag',
            },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test deep path access to specific nested values
      expect(manager.get('databases.connections.serhafen-us.host')).toBe('localhost');
      expect(manager.get('databases.connections.serhafen-us.port')).toBe(5432);
      expect(manager.get('databases.connections.serhafen-us.username')).toBe('postgres');
      expect(manager.get('databases.connections.serhafen-ag.host')).toBe('remote-host');
      expect(manager.get('databases.connections.serhafen-ag.schema')).toBe('ag');
    });

    it('should access partial path to return entire map entry', async () => {
      const config = {
        databases: {
          connections: {
            'serhafen-us': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
            },
            'serhafen-ag': {
              host: 'remote-host',
              port: 5433,
              username: 'admin',
            },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test partial path access to get entire map entry
      const usEntry = manager.get('databases.connections.serhafen-us');
      expect(usEntry).toEqual({
        host: 'localhost',
        port: 5432,
        username: 'postgres',
      });

      const agEntry = manager.get('databases.connections.serhafen-ag');
      expect(agEntry).toEqual({
        host: 'remote-host',
        port: 5433,
        username: 'admin',
      });
    });

    it('should access top-level map to return entire map as object', async () => {
      const config = {
        databases: {
          connections: {
            db1: { host: 'host1', port: 5432 },
            db2: { host: 'host2', port: 5433 },
            db3: { host: 'host3', port: 5434 },
          },
          pool: {
            min: 2,
            max: 10,
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test top-level map access
      const connections = manager.get('databases.connections');
      expect(connections).toEqual({
        db1: { host: 'host1', port: 5432 },
        db2: { host: 'host2', port: 5433 },
        db3: { host: 'host3', port: 5434 },
      });

      // Verify it's an object with all keys
      expect(Object.keys(connections)).toEqual(['db1', 'db2', 'db3']);
    });

    it('should return default value for missing map key', async () => {
      const config = {
        databases: {
          connections: {
            db1: { host: 'host1', port: 5432 },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test default value for non-existent map key
      const result = manager.get('databases.connections.non-existent', {
        host: 'default-host',
        port: 9999,
      });
      expect(result).toEqual({ host: 'default-host', port: 9999 });

      // Test default value for non-existent nested property
      const nestedResult = manager.get('databases.connections.non-existent.host', 'fallback-host');
      expect(nestedResult).toBe('fallback-host');
    });

    it('should handle kebab-case keys in map paths', async () => {
      const config = {
        services: {
          endpoints: {
            'user-service': { url: 'http://user-service:8080' },
            'order-service': { url: 'http://order-service:8081' },
            'payment-service': { url: 'http://payment-service:8082' },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test kebab-case keys work correctly
      expect(manager.get('services.endpoints.user-service.url')).toBe('http://user-service:8080');
      expect(manager.get('services.endpoints.order-service.url')).toBe('http://order-service:8081');
      expect(manager.get('services.endpoints.payment-service.url')).toBe(
        'http://payment-service:8082'
      );
    });

    it('should handle deeply nested structures within map values', async () => {
      const config = {
        applications: {
          configs: {
            app1: {
              server: {
                host: 'localhost',
                port: 3000,
                ssl: {
                  enabled: true,
                  cert: '/path/to/cert',
                  key: '/path/to/key',
                },
              },
            },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test deeply nested path access
      expect(manager.get('applications.configs.app1.server.host')).toBe('localhost');
      expect(manager.get('applications.configs.app1.server.ssl.enabled')).toBe(true);
      expect(manager.get('applications.configs.app1.server.ssl.cert')).toBe('/path/to/cert');

      // Test partial access to nested object
      const ssl = manager.get('applications.configs.app1.server.ssl');
      expect(ssl).toEqual({
        enabled: true,
        cert: '/path/to/cert',
        key: '/path/to/key',
      });
    });

    it('should return undefined for missing nested map keys without default', async () => {
      const config = {
        databases: {
          connections: {
            db1: { host: 'host1' },
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test undefined for missing keys
      expect(manager.get('databases.connections.missing-db')).toBeUndefined();
      expect(manager.get('databases.connections.missing-db.host')).toBeUndefined();
      expect(manager.get('databases.missing-section.db1')).toBeUndefined();
    });

    it('should handle empty map structures', async () => {
      const config = {
        databases: {
          connections: {},
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Test empty map access
      const connections = manager.get('databases.connections');
      expect(connections).toEqual({});
      expect(Object.keys(connections)).toHaveLength(0);

      // Test accessing key in empty map
      expect(manager.get('databases.connections.any-key')).toBeUndefined();
      expect(manager.get('databases.connections.any-key', 'default')).toBe('default');
    });

    it('should work with map paths across profile merging', async () => {
      const basePath = path.join(tempDir, 'application.json');
      const prodPath = path.join(tempDir, 'application-production.json');

      fs.writeFileSync(
        basePath,
        JSON.stringify({
          databases: {
            connections: {
              db1: { host: 'localhost', port: 5432 },
              db2: { host: 'localhost', port: 5433 },
            },
          },
        })
      );

      fs.writeFileSync(
        prodPath,
        JSON.stringify({
          databases: {
            connections: {
              db1: { host: 'prod-host', port: 5432 },
            },
          },
        })
      );

      const manager = new ConfigManager({ configDir: tempDir, profile: 'production' });
      createdManagers.push(manager);
      await manager.initialize();

      // Test that profile-specific values override base
      expect(manager.get('databases.connections.db1.host')).toBe('prod-host');
      expect(manager.get('databases.connections.db1.port')).toBe(5432);

      // Test that base values remain for non-overridden entries
      expect(manager.get('databases.connections.db2.host')).toBe('localhost');
      expect(manager.get('databases.connections.db2.port')).toBe(5433);
    });
  });

  describe('validation', () => {
    it('should validate config with @Validate decorator when validation passes', async () => {
      @Validate()
      @ConfigurationProperties('server')
      class ServerConfig {
        @IsString()
        @ConfigProperty()
        host!: string;

        @IsNumber()
        @ConfigProperty()
        port!: number;
      }

      const config = { server: { host: 'localhost', port: 3000 } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(ServerConfig);

      expect(instance.host).toBe('localhost');
      expect(instance.port).toBe(3000);
    });

    it('should throw error when validation fails for string type', async () => {
      @Validate()
      @ConfigurationProperties('server')
      class ServerConfig {
        @IsEmail()
        @ConfigProperty()
        email!: string;
      }

      const config = { server: { email: 'not-an-email' } }; // Invalid: not an email format
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(ServerConfig)).toThrow('Validation failed for ServerConfig');
      expect(() => manager.bind(ServerConfig)).toThrow('email');
    });

    it('should throw error when validation fails for number type', async () => {
      @Validate()
      @ConfigurationProperties('server')
      class ServerConfig {
        @Min(1000)
        @Max(9999)
        @ConfigProperty()
        port!: number;
      }

      const config = { server: { port: 100 } }; // Invalid: below minimum
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(ServerConfig)).toThrow('Validation failed for ServerConfig');
      expect(() => manager.bind(ServerConfig)).toThrow('port');
    });

    it('should throw error with multiple validation failures', async () => {
      @Validate()
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @IsUrl()
        @ConfigProperty()
        host!: string;

        @Min(1000)
        @Max(9999)
        @ConfigProperty()
        port!: number;

        @MinLength(3)
        @ConfigProperty()
        username!: string;
      }

      const config = { database: { host: 'not-a-url', port: 100, username: 'ab' } }; // All invalid
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(DatabaseConfig)).toThrow('Validation failed for DatabaseConfig');
    });

    it('should not validate when validateOnBind is false', async () => {
      @Validate()
      @ConfigurationProperties('server')
      class ServerConfig {
        @IsEmail()
        @ConfigProperty()
        email!: string;
      }

      const config = { server: { email: 'not-an-email' } }; // Invalid but validation disabled
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should not throw even with invalid data
      const instance = manager.bind(ServerConfig);
      expect(instance.email).toBe('not-an-email');
    });

    it('should not validate when @Validate decorator is not present', async () => {
      @ConfigurationProperties('server')
      class ServerConfig {
        @IsEmail()
        @ConfigProperty()
        email!: string;
      }

      const config = { server: { email: 'not-an-email' } }; // Invalid but no @Validate decorator
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should not throw even with invalid data
      const instance = manager.bind(ServerConfig);
      expect(instance.email).toBe('not-an-email');
    });

    it('should validate with default values when @Validate is present', async () => {
      @Validate()
      @ConfigurationProperties('server')
      class ServerConfig {
        @IsString()
        @DefaultValue('localhost')
        @ConfigProperty()
        host!: string;

        @IsNumber()
        @DefaultValue(3000)
        @ConfigProperty()
        port!: number;
      }

      const config = {}; // Empty config, will use defaults
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance = manager.bind(ServerConfig);

      expect(instance.host).toBe('localhost');
      expect(instance.port).toBe(3000);
    });

    it('should fail validation when default values are invalid', async () => {
      @Validate()
      @ConfigurationProperties('server')
      class ServerConfig {
        @Min(1000)
        @DefaultValue(100 as any) // Invalid default (below minimum)
        @ConfigProperty()
        port!: number;
      }

      const config = {}; // Empty config, will use invalid default
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(ServerConfig)).toThrow('Validation failed for ServerConfig');
      expect(() => manager.bind(ServerConfig)).toThrow('port');
    });

    it('should validate combined with required properties', async () => {
      @Validate()
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @Required()
        @IsUrl()
        @ConfigProperty()
        host!: string;

        @Min(1000)
        @ConfigProperty()
        port!: number;
      }

      // Test missing required property
      const config1 = { database: { port: 5432 } }; // Missing required host
      const manager1 = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config1, 100)],
      });
      createdManagers.push(manager1);
      await manager1.initialize();

      expect(() => manager1.bind(DatabaseConfig)).toThrow(
        "Required configuration property 'database.host' is missing"
      );

      // Test invalid type for required property
      const config2 = { database: { host: 'not-a-url', port: 5432 } }; // Invalid URL
      const manager2 = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config2, 100)],
      });
      createdManagers.push(manager2);
      await manager2.initialize();

      expect(() => manager2.bind(DatabaseConfig)).toThrow('Validation failed for DatabaseConfig');
    });
  });
});
