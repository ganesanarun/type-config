import 'reflect-metadata';
import { createMockConfig, createMockConfigWithClasses, mockConfigClass } from '../src';
import { ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config';

describe('Testing Utilities', () => {
  describe('createMockConfig', () => {
    const createdManagers: any[] = [];

    afterEach(async () => {
      for (const manager of createdManagers) {
        await manager.dispose();
      }
      createdManagers.length = 0;
    });

    it('should create mock ConfigManager', async () => {
      const config = await createMockConfig({ test: 'value' });
      createdManagers.push(config);

      expect(config).toBeDefined();
      expect(config.get('test')).toBe('value');
    });

    it('should create empty config when no data provided', async () => {
      const config = await createMockConfig();
      createdManagers.push(config);

      expect(config).toBeDefined();
      expect(config.get('nonexistent')).toBeUndefined();
    });

    it('should support nested config', async () => {
      const config = await createMockConfig({
        database: {
          host: 'localhost',
          port: 5432,
        },
      });
      createdManagers.push(config);

      expect(config.get('database.host')).toBe('localhost');
      expect(config.get('database.port')).toBe(5432);
    });
  });

  describe('createMockConfigWithClasses', () => {
    const createdManagers: any[] = [];

    afterEach(async () => {
      for (const manager of createdManagers) {
        await manager.dispose();
      }
      createdManagers.length = 0;
    });

    it('should create config with registered classes', async () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @ConfigProperty()
        host!: string;

        @ConfigProperty()
        port!: number;
      }

      const result = await createMockConfigWithClasses(
        { database: { host: 'localhost', port: 5432 } },
        [DatabaseConfig]
      );
      createdManagers.push(result.configManager);

      expect(result.configManager).toBeDefined();
      expect(result.container).toBeDefined();
      expect(result.container.has(DatabaseConfig)).toBe(true);
    });

    it('should bind config values to classes', async () => {
      @ConfigurationProperties('server')
      class ServerConfig {
        @ConfigProperty()
        port!: number;
      }

      const result = await createMockConfigWithClasses({ server: { port: 3000 } }, [ServerConfig]);
      createdManagers.push(result.configManager);

      const config = result.container.get(ServerConfig);

      expect(config.port).toBe(3000);
    });

    it('should support multiple config classes', async () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @ConfigProperty()
        host!: string;
      }

      @ConfigurationProperties('server')
      class ServerConfig {
        @ConfigProperty()
        port!: number;
      }

      const result = await createMockConfigWithClasses(
        {
          database: { host: 'localhost' },
          server: { port: 3000 },
        },
        [DatabaseConfig, ServerConfig]
      );
      createdManagers.push(result.configManager);

      expect(result.container.has(DatabaseConfig)).toBe(true);
      expect(result.container.has(ServerConfig)).toBe(true);
    });
  });

  describe('mockConfigClass', () => {
    it('should create mock config instance', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value!: string;

        @ConfigProperty()
        count!: number;
      }

      const mock = mockConfigClass(TestConfig, { value: 'test', count: 42 });

      expect(mock).toBeInstanceOf(TestConfig);
      expect(mock.value).toBe('test');
      expect(mock.count).toBe(42);
    });

    it('should create instance with no overrides', () => {
      @ConfigurationProperties('test')
      class TestConfig {}

      const mock = mockConfigClass(TestConfig);

      expect(mock).toBeInstanceOf(TestConfig);
    });

    it('should support partial overrides', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value1?: string;

        @ConfigProperty()
        value2?: string;
      }

      const mock = mockConfigClass(TestConfig, { value1: 'test' });

      expect(mock.value1).toBe('test');
      expect(mock.value2).toBeUndefined();
    });

    it('should preserve class methods', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value!: string;

        getValue() {
          return this.value;
        }
      }

      const mock = mockConfigClass(TestConfig, { value: 'test' });

      expect(mock.getValue()).toBe('test');
    });
  });
});
