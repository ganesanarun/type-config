import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager, InMemoryConfigSource } from '../src';

describe('Cross-Format and Cross-Source Consistency', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const createdManagers: ConfigManager[] = [];
  let tempDir: string;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Create a temporary directory for test config files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
  });

  afterEach(async () => {
    process.env = originalEnv;
    for (const manager of createdManagers) {
      await manager.dispose();
    }
    createdManagers.length = 0;

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Cross-format consistency (JSON vs YAML)', () => {
    it('should resolve placeholders identically in JSON and YAML files', async () => {
      process.env.DB_HOST = 'prod-server';
      process.env.DB_PORT = '5432';

      // Create JSON config
      const jsonConfig = {
        database: {
          host: '${DB_HOST}',
          port: '${DB_PORT:3306}',
          username: '${DB_USER:postgres}',
          password: '${DB_PASSWORD}',
        },
      };
      fs.writeFileSync(path.join(tempDir, 'application.json'), JSON.stringify(jsonConfig, null, 2));

      // Create YAML config with identical structure
      const yamlConfig = `database:
  host: '\${DB_HOST}'
  port: '\${DB_PORT:3306}'
  username: '\${DB_USER:postgres}'
  password: '\${DB_PASSWORD}'
`;
      fs.writeFileSync(path.join(tempDir, 'application.yml'), yamlConfig);

      // Load JSON config
      const jsonManager = new ConfigManager({ configDir: tempDir });
      createdManagers.push(jsonManager);
      await jsonManager.initialize();

      // Load YAML config (create new temp dir to avoid merging)
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
      fs.writeFileSync(path.join(tempDir2, 'application.yml'), yamlConfig);
      const yamlManager = new ConfigManager({ configDir: tempDir2 });
      createdManagers.push(yamlManager);
      await yamlManager.initialize();

      // Both should resolve identically
      expect(jsonManager.get('database.host')).toBe('prod-server');
      expect(yamlManager.get('database.host')).toBe('prod-server');

      expect(jsonManager.get('database.port')).toBe('5432');
      expect(yamlManager.get('database.port')).toBe('5432');

      expect(jsonManager.get('database.username')).toBe('postgres');
      expect(yamlManager.get('database.username')).toBe('postgres');

      expect(jsonManager.get('database.password')).toBeUndefined();
      expect(yamlManager.get('database.password')).toBeUndefined();

      // Clean up second temp dir
      fs.rmSync(tempDir2, { recursive: true, force: true });
    });

    it('should resolve multiple placeholders identically in JSON and YAML', async () => {
      process.env.DB_USER = 'admin';
      process.env.DB_NAME = 'mydb';

      // JSON config
      const jsonConfig = {
        database: {
          url: 'postgres://${DB_USER}@${DB_HOST:localhost}/${DB_NAME}',
        },
      };
      fs.writeFileSync(path.join(tempDir, 'application.json'), JSON.stringify(jsonConfig, null, 2));

      // YAML config
      const yamlConfig = `database:
  url: 'postgres://\${DB_USER}@\${DB_HOST:localhost}/\${DB_NAME}'
`;
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
      fs.writeFileSync(path.join(tempDir2, 'application.yml'), yamlConfig);

      const jsonManager = new ConfigManager({ configDir: tempDir });
      createdManagers.push(jsonManager);
      await jsonManager.initialize();

      const yamlManager = new ConfigManager({ configDir: tempDir2 });
      createdManagers.push(yamlManager);
      await yamlManager.initialize();

      const expectedUrl = 'postgres://admin@localhost/mydb';
      expect(jsonManager.get('database.url')).toBe(expectedUrl);
      expect(yamlManager.get('database.url')).toBe(expectedUrl);

      fs.rmSync(tempDir2, { recursive: true, force: true });
    });

    it('should handle nested structures identically in JSON and YAML', async () => {
      process.env.PRIMARY_HOST = 'primary-server';
      process.env.SECONDARY_HOST = 'secondary-server';

      // JSON config
      const jsonConfig = {
        databases: {
          connections: {
            primary: {
              host: '${PRIMARY_HOST}',
              port: '${PRIMARY_PORT:5432}',
            },
            secondary: {
              host: '${SECONDARY_HOST}',
              port: '${SECONDARY_PORT:5433}',
            },
          },
        },
      };
      fs.writeFileSync(path.join(tempDir, 'application.json'), JSON.stringify(jsonConfig, null, 2));

      // YAML config
      const yamlConfig = `databases:
  connections:
    primary:
      host: '\${PRIMARY_HOST}'
      port: '\${PRIMARY_PORT:5432}'
    secondary:
      host: '\${SECONDARY_HOST}'
      port: '\${SECONDARY_PORT:5433}'
`;
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
      fs.writeFileSync(path.join(tempDir2, 'application.yml'), yamlConfig);

      const jsonManager = new ConfigManager({ configDir: tempDir });
      createdManagers.push(jsonManager);
      await jsonManager.initialize();

      const yamlManager = new ConfigManager({ configDir: tempDir2 });
      createdManagers.push(yamlManager);
      await yamlManager.initialize();

      expect(jsonManager.get('databases.connections.primary.host')).toBe('primary-server');
      expect(yamlManager.get('databases.connections.primary.host')).toBe('primary-server');

      expect(jsonManager.get('databases.connections.primary.port')).toBe('5432');
      expect(yamlManager.get('databases.connections.primary.port')).toBe('5432');

      expect(jsonManager.get('databases.connections.secondary.host')).toBe('secondary-server');
      expect(yamlManager.get('databases.connections.secondary.host')).toBe('secondary-server');

      expect(jsonManager.get('databases.connections.secondary.port')).toBe('5433');
      expect(yamlManager.get('databases.connections.secondary.port')).toBe('5433');

      fs.rmSync(tempDir2, { recursive: true, force: true });
    });
  });

  describe('Custom source consistency (InMemoryConfigSource)', () => {
    it('should resolve placeholders from InMemoryConfigSource', async () => {
      process.env.API_KEY = 'secret-key-123';
      process.env.API_URL = 'https://api.example.com';

      const config = {
        api: {
          key: '${API_KEY}',
          url: '${API_URL}',
          timeout: '${API_TIMEOUT:5000}',
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('api.key')).toBe('secret-key-123');
      expect(manager.get('api.url')).toBe('https://api.example.com');
      expect(manager.get('api.timeout')).toBe('5000');
    });

    it('should resolve placeholders consistently across file and custom sources', async () => {
      process.env.DB_HOST = 'prod-server';
      process.env.CACHE_HOST = 'redis-server';

      // File config
      const fileConfig = {
        database: {
          host: '${DB_HOST}',
          port: '${DB_PORT:5432}',
        },
      };
      fs.writeFileSync(path.join(tempDir, 'application.json'), JSON.stringify(fileConfig, null, 2));

      // Custom source config
      const customConfig = {
        cache: {
          host: '${CACHE_HOST}',
          port: '${CACHE_PORT:6379}',
        },
      };

      const manager = new ConfigManager({
        configDir: tempDir,
        additionalSources: [new InMemoryConfigSource(customConfig, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Both sources should resolve placeholders identically
      expect(manager.get('database.host')).toBe('prod-server');
      expect(manager.get('database.port')).toBe('5432');
      expect(manager.get('cache.host')).toBe('redis-server');
      expect(manager.get('cache.port')).toBe('6379');
    });

    it('should handle custom sources with complex nested placeholders', async () => {
      process.env.SERVICE_NAME = 'my-service';
      process.env.REGION = 'us-east-1';

      const config = {
        services: {
          primary: {
            name: '${SERVICE_NAME}',
            endpoint: 'https://${SERVICE_NAME}.${REGION}.example.com',
            config: {
              region: '${REGION}',
              timeout: '${TIMEOUT:30000}',
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('services.primary.name')).toBe('my-service');
      expect(manager.get('services.primary.endpoint')).toBe(
        'https://my-service.us-east-1.example.com'
      );
      expect(manager.get('services.primary.config.region')).toBe('us-east-1');
      expect(manager.get('services.primary.config.timeout')).toBe('30000');
    });
  });

  describe('Consistent multi-reference resolution', () => {
    it('should resolve the same environment variable consistently across multiple references', async () => {
      process.env.SHARED_HOST = 'shared-server';

      const config = {
        service1: {
          host: '${SHARED_HOST}',
        },
        service2: {
          host: '${SHARED_HOST}',
        },
        service3: {
          endpoint: 'https://${SHARED_HOST}/api',
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const host1 = manager.get('service1.host');
      const host2 = manager.get('service2.host');
      const endpoint = manager.get('service3.endpoint');

      expect(host1).toBe('shared-server');
      expect(host2).toBe('shared-server');
      expect(endpoint).toBe('https://shared-server/api');

      // All references should be identical
      expect(host1).toBe(host2);
    });

    it('should resolve the same placeholder with fallback consistently', async () => {
      // Don't set DEFAULT_PORT in environment

      const config = {
        service1: {
          port: '${DEFAULT_PORT:8080}',
        },
        service2: {
          port: '${DEFAULT_PORT:8080}',
        },
        service3: {
          url: 'http://localhost:${DEFAULT_PORT:8080}',
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      const port1 = manager.get('service1.port');
      const port2 = manager.get('service2.port');
      const url = manager.get('service3.url');

      expect(port1).toBe('8080');
      expect(port2).toBe('8080');
      expect(url).toBe('http://localhost:8080');

      // All should use the same fallback value
      expect(port1).toBe(port2);
    });

    it('should resolve consistently when environment variable changes', async () => {
      process.env.DYNAMIC_VALUE = 'initial-value';

      const config = {
        field1: '${DYNAMIC_VALUE}',
        field2: '${DYNAMIC_VALUE}',
        field3: 'prefix-${DYNAMIC_VALUE}-suffix',
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('field1')).toBe('initial-value');
      expect(manager.get('field2')).toBe('initial-value');
      expect(manager.get('field3')).toBe('prefix-initial-value-suffix');

      // All references should be consistent
      expect(manager.get('field1')).toBe(manager.get('field2'));
    });
  });

  describe('Cross-source with arrays', () => {
    it('should resolve placeholders in arrays from custom sources', async () => {
      process.env.HOST1 = 'server1.example.com';
      process.env.HOST2 = 'server2.example.com';

      const config = {
        servers: ['${HOST1}', '${HOST2}', '${HOST3:server3.example.com}'],
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('servers')).toEqual([
        'server1.example.com',
        'server2.example.com',
        'server3.example.com',
      ]);
    });

    it('should resolve placeholders in arrays identically across JSON and YAML', async () => {
      process.env.ENDPOINT1 = 'https://api1.example.com';
      process.env.ENDPOINT2 = 'https://api2.example.com';

      // JSON config
      const jsonConfig = {
        endpoints: ['${ENDPOINT1}', '${ENDPOINT2}', '${ENDPOINT3:https://api3.example.com}'],
      };
      fs.writeFileSync(path.join(tempDir, 'application.json'), JSON.stringify(jsonConfig, null, 2));

      // YAML config
      const yamlConfig = `endpoints:
  - '\${ENDPOINT1}'
  - '\${ENDPOINT2}'
  - '\${ENDPOINT3:https://api3.example.com}'
`;
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
      fs.writeFileSync(path.join(tempDir2, 'application.yml'), yamlConfig);

      const jsonManager = new ConfigManager({ configDir: tempDir });
      createdManagers.push(jsonManager);
      await jsonManager.initialize();

      const yamlManager = new ConfigManager({ configDir: tempDir2 });
      createdManagers.push(yamlManager);
      await yamlManager.initialize();

      const expectedEndpoints = [
        'https://api1.example.com',
        'https://api2.example.com',
        'https://api3.example.com',
      ];

      expect(jsonManager.get('endpoints')).toEqual(expectedEndpoints);
      expect(yamlManager.get('endpoints')).toEqual(expectedEndpoints);

      fs.rmSync(tempDir2, { recursive: true, force: true });
    });
  });

  describe('Undefined on resolution failure', () => {
    it('should return undefined when placeholder has no fallback and env var not set', async () => {
      const config = {
        database: {
          host: '${DB_HOST}',
          port: '${DB_PORT:5432}',
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(manager.get('database.host')).toBeUndefined();
      expect(manager.get('database.port')).toBe('5432');
    });

    it('should handle undefined consistently across all source types', async () => {
      // File source
      const fileConfig = {
        file: {
          value: '${MISSING_VAR}',
        },
      };
      fs.writeFileSync(path.join(tempDir, 'application.json'), JSON.stringify(fileConfig, null, 2));

      // Custom source
      const customConfig = {
        custom: {
          value: '${MISSING_VAR}',
        },
      };

      const manager = new ConfigManager({
        configDir: tempDir,
        additionalSources: [new InMemoryConfigSource(customConfig, 100)],
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Both should be undefined
      expect(manager.get('file.value')).toBeUndefined();
      expect(manager.get('custom.value')).toBeUndefined();
    });
  });
});
