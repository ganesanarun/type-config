import 'reflect-metadata';
import { ConfigManager, InMemoryConfigSource } from '../src';

describe('PlaceholderResolver Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const createdManagers: ConfigManager[] = [];

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    process.env = originalEnv;
    for (const manager of createdManagers) {
      await manager.dispose();
    }
    createdManagers.length = 0;
  });

  describe('basic placeholder resolution', () => {
    it('should resolve placeholder with environment variable', async () => {
      process.env.DB_HOST = 'prod-server';

      const config = { database: { host: '${DB_HOST}' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.host')).toBe('prod-server');
    });

    it('should use fallback when environment variable is not set', async () => {
      const config = { database: { host: '${DB_HOST:localhost}' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.host')).toBe('localhost');
    });

    it('should use environment variable over fallback', async () => {
      process.env.DB_HOST = 'prod-server';

      const config = { database: { host: '${DB_HOST:localhost}' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.host')).toBe('prod-server');
    });

    it('should return undefined when placeholder has no fallback and env var not set', async () => {
      const config = { database: { host: '${DB_HOST}' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.host')).toBeUndefined();
    });
  });

  describe('multiple placeholders', () => {
    it('should resolve multiple placeholders in a single value', async () => {
      process.env.DB_USER = 'admin';
      process.env.DB_NAME = 'mydb';

      const config = { database: { url: 'postgres://${DB_USER}@localhost/${DB_NAME}' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.url')).toBe('postgres://admin@localhost/mydb');
    });

    it('should resolve multiple placeholders with fallbacks', async () => {
      process.env.DB_USER = 'admin';

      const config = {
        database: { url: 'postgres://${DB_USER}@${DB_HOST:localhost}/${DB_NAME:testdb}' },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.url')).toBe('postgres://admin@localhost/testdb');
    });
  });

  describe('placeholder escaping', () => {
    it('should escape placeholder syntax with backslash', async () => {
      const config = { message: '\\${USER} logged in' };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('message')).toBe('${USER} logged in');
    });
  });

  describe('disabling placeholder resolution', () => {
    it('should not resolve placeholders when disabled', async () => {
      process.env.DB_HOST = 'prod-server';

      const config = { database: { host: '${DB_HOST:localhost}' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        enablePlaceholderResolution: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.host')).toBe('${DB_HOST:localhost}');
    });
  });

  describe('precedence with underscore-based ENV resolution', () => {
    it('should allow underscore-based ENV to override file values', async () => {
      process.env.DATABASE_HOST = 'env-server';

      const config = { database: { host: 'file-server' } };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // EnvConfigSource has priority 200, InMemoryConfigSource has priority 100
      // So underscore-based ENV should override
      expect(manager.get('database.host')).toBe('env-server');
    });

    it('should resolve placeholders in values set by underscore-based ENV', async () => {
      process.env.DATABASE_URL = 'postgres://${DB_USER:admin}@localhost/mydb';
      process.env.DB_USER = 'root';

      const config = {};
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Underscore-based ENV sets database.url to '${DB_USER:admin}@localhost/mydb'
      // Then placeholder resolution resolves ${DB_USER:admin} to 'root'
      expect(manager.get('database.url')).toBe('postgres://root@localhost/mydb');
    });
  });

  describe('nested objects', () => {
    it('should resolve placeholders in nested objects', async () => {
      process.env.DB_HOST = 'prod-server';
      process.env.DB_PORT = '5432';

      const config = {
        databases: {
          primary: {
            host: '${DB_HOST}',
            port: '${DB_PORT:3306}',
          },
          secondary: {
            host: '${DB_HOST_2:localhost}',
            port: '${DB_PORT}',
          },
        },
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('databases.primary.host')).toBe('prod-server');
      expect(manager.get('databases.primary.port')).toBe('5432');
      expect(manager.get('databases.secondary.host')).toBe('localhost');
      expect(manager.get('databases.secondary.port')).toBe('5432');
    });
  });

  describe('arrays', () => {
    it('should resolve placeholders in arrays', async () => {
      process.env.HOST1 = 'server1';
      process.env.HOST2 = 'server2';

      const config = {
        servers: ['${HOST1}', '${HOST2}', '${HOST3:server3}'],
      };
      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('servers')).toEqual(['server1', 'server2', 'server3']);
    });
  });
});
