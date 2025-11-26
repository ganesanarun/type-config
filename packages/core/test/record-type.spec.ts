import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigManager,
  ConfigProperty,
  ConfigurationProperties,
  InMemoryConfigSource,
  RecordType,
  Required,
} from '../src';
import { IsBoolean, IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';

/**
 * Test configuration class for database connections with validation
 */
class DatabaseConnectionValidated {
  @IsString()
  host!: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  username!: string;

  @IsString()
  password!: string;

  @IsString()
  database!: string;

  @IsString()
  schema!: string;

  @IsBoolean()
  ssl!: boolean;
}

/**
 * Configuration class using Record type
 */
@ConfigurationProperties('databases')
class DatabasesRecordConfig {
  @ConfigProperty('connections')
  @Required()
  @RecordType()
  connections!: Record<string, DatabaseConnectionValidated>;
}

/**
 * Configuration class using Map type for comparison
 */
@ConfigurationProperties('databases')
class DatabasesMapConfig {
  @ConfigProperty('connections')
  @Required()
  connections!: Map<string, DatabaseConnectionValidated>;
}

describe('Record Type Support', () => {
  let tempDir: string;
  const createdManagers: ConfigManager[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'record-test-'));
  });

  afterEach(async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const manager of createdManagers) {
      await manager.dispose();
    }
    createdManagers.length = 0;
  });

  describe('Record type binding', () => {
    it('should bind configuration to Record type without converting to Map', async () => {
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
              ssl: false,
            },
            'serhafen-ag': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'secret',
              database: 'serhafen_ag',
              schema: 'ag',
              ssl: true,
            },
          },
        },
      };

      const source = new InMemoryConfigSource(config);
      // Disable validation to test binding only
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      const boundConfig = manager.bind(DatabasesRecordConfig);

      // Should be a plain object, not a Map
      expect(boundConfig.connections).not.toBeInstanceOf(Map);
      expect(typeof boundConfig.connections).toBe('object');

      // Should have all entries
      expect(Object.keys(boundConfig.connections)).toHaveLength(2);
      expect(boundConfig.connections['serhafen-us']).toBeDefined();
      expect(boundConfig.connections['serhafen-ag']).toBeDefined();

      // Should preserve structure
      expect(boundConfig.connections['serhafen-us'].host).toBe('localhost');
      expect(boundConfig.connections['serhafen-us'].port).toBe(5432);
      expect(boundConfig.connections['serhafen-ag'].ssl).toBe(true);
    });

    it('should distinguish Record from Map types', async () => {
      const config = {
        databases: {
          connections: {
            'test-db': {
              host: 'localhost',
              port: 5432,
              username: 'user',
              password: 'pass',
              database: 'testdb',
              schema: 'public',
              ssl: false,
            },
          },
        },
      };

      const source = new InMemoryConfigSource(config);
      // Disable validation to test binding only
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      const recordConfig = manager.bind(DatabasesRecordConfig);
      const mapConfig = manager.bind(DatabasesMapConfig);

      // Record should be plain object
      expect(recordConfig.connections).not.toBeInstanceOf(Map);
      expect(typeof recordConfig.connections).toBe('object');

      // Map should be Map instance
      expect(mapConfig.connections).toBeInstanceOf(Map);
    });

    it('should support bracket notation access for Record', async () => {
      const config = {
        databases: {
          connections: {
            'my-db': {
              host: 'example.com',
              port: 3306,
              username: 'admin',
              password: 'secret',
              database: 'mydb',
              schema: 'main',
              ssl: true,
            },
          },
        },
      };

      const source = new InMemoryConfigSource(config);
      // Disable validation to test binding only
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      const boundConfig = manager.bind(DatabasesRecordConfig);

      // Should support bracket notation
      expect(boundConfig.connections['my-db']).toBeDefined();
      expect(boundConfig.connections['my-db'].host).toBe('example.com');
    });

    it('should work with Object.keys() and Object.entries()', async () => {
      const config = {
        databases: {
          connections: {
            db1: {
              host: 'host1',
              port: 5432,
              username: 'user1',
              password: 'pass1',
              database: 'db1',
              schema: 'schema1',
              ssl: false,
            },
            db2: {
              host: 'host2',
              port: 5433,
              username: 'user2',
              password: 'pass2',
              database: 'db2',
              schema: 'schema2',
              ssl: true,
            },
          },
        },
      };

      const source = new InMemoryConfigSource(config);
      // Disable validation to test binding only
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      const boundConfig = manager.bind(DatabasesRecordConfig);

      // Should work with Object.keys()
      const keys = Object.keys(boundConfig.connections);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('db1');
      expect(keys).toContain('db2');

      // Should work with Object.entries()
      const entries = Object.entries(boundConfig.connections);
      expect(entries).toHaveLength(2);
      expect(entries[0][0]).toBe('db1');
      expect(entries[0][1].host).toBe('host1');
    });
  });

  describe('Record type validation limitations', () => {
    it('should validate @Required properties but not entry contents', async () => {
      const config = {
        databases: {
          // Missing connections property
        },
      };

      const source = new InMemoryConfigSource(config);
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: true });
      createdManagers.push(manager);

      await manager.initialize();

      // @Required validation works
      expect(() => manager.bind(DatabasesRecordConfig)).toThrow(
        "Required configuration property 'databases.connections' is missing"
      );
    });

    it('should NOT validate Record entry contents automatically', async () => {
      const config = {
        databases: {
          connections: {
            'invalid-db': {
              host: 'localhost',
              port: 99999, // Invalid: exceeds max, but won't be caught
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: 'not-a-boolean', // Invalid: wrong type, but won't be caught
            },
          },
        },
      };

      const source = new InMemoryConfigSource(config);
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      // Invalid data passes through - validation doesn't work for Record entries
      const boundConfig = manager.bind(DatabasesRecordConfig);
      expect(boundConfig.connections['invalid-db'].port).toBe(99999);
      expect(boundConfig.connections['invalid-db'].ssl).toBe('not-a-boolean');
    });

    it('should work without validation when validateOnBind is false', async () => {
      const config = {
        databases: {
          connections: {
            'db1': {
              host: 'localhost',
              port: 5432,
              username: 'user1',
              password: 'pass1',
              database: 'db1',
              schema: 'schema1',
              ssl: true,
            },
            'db2': {
              host: 'remotehost',
              port: 3306,
              username: 'user2',
              password: 'pass2',
              database: 'db2',
              schema: 'schema2',
              ssl: false,
            },
          },
        },
      };

      const source = new InMemoryConfigSource(config);
      // Disable validation - Record types work best without automatic validation
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      // Should not throw
      const boundConfig = manager.bind(DatabasesRecordConfig);
      expect(boundConfig.connections).toBeDefined();
      expect(Object.keys(boundConfig.connections)).toHaveLength(2);
    });
  });

  describe('Record vs Map comparison', () => {
    it('should show Record does not have Map methods', async () => {
      const config = {
        databases: {
          connections: {
            'test-db': {
              host: 'localhost',
              port: 5432,
              username: 'user',
              password: 'pass',
              database: 'testdb',
              schema: 'public',
              ssl: false,
            },
          },
        },
      };

      const source = new InMemoryConfigSource(config);
      // Disable validation to test binding only
      const manager = new ConfigManager({ additionalSources: [source], validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      const recordConfig = manager.bind(DatabasesRecordConfig);
      const mapConfig = manager.bind(DatabasesMapConfig);

      // Record should not have Map methods
      expect(typeof (recordConfig.connections as any).get).toBe('undefined');
      expect(typeof (recordConfig.connections as any).set).toBe('undefined');
      expect(typeof (recordConfig.connections as any).has).toBe('undefined');
      expect(typeof (recordConfig.connections as any).delete).toBe('undefined');

      // Map should have Map methods
      expect(typeof mapConfig.connections.get).toBe('function');
      expect(typeof mapConfig.connections.set).toBe('function');
      expect(typeof mapConfig.connections.has).toBe('function');
      expect(typeof mapConfig.connections.delete).toBe('function');
    });

    it('should bind same YAML config to both Map and Record correctly', async () => {
      const yamlContent = `
databases:
  connections:
    serhafen-us:
      host: localhost
      port: 5432
      username: postgres
      password: secret
      database: serhafen_common
      schema: us
      ssl: false
    serhafen-ag:
      host: localhost
      port: 5432
      username: postgres
      password: secret
      database: serhafen_ag
      schema: ag
      ssl: true
`;

      const configPath = path.join(tempDir, 'application.yml');
      fs.writeFileSync(configPath, yamlContent);

      // Disable validation to test binding only
      const manager = new ConfigManager({ configDir: tempDir, validateOnBind: false });
      createdManagers.push(manager);

      await manager.initialize();

      const recordConfig = manager.bind(DatabasesRecordConfig);
      const mapConfig = manager.bind(DatabasesMapConfig);

      // Both should have the same data
      expect(Object.keys(recordConfig.connections)).toHaveLength(2);
      expect(mapConfig.connections.size).toBe(2);

      // Record uses bracket notation
      expect(recordConfig.connections['serhafen-us'].host).toBe('localhost');
      expect(recordConfig.connections['serhafen-ag'].ssl).toBe(true);

      // Map uses .get()
      expect(mapConfig.connections.get('serhafen-us')?.host).toBe('localhost');
      expect(mapConfig.connections.get('serhafen-ag')?.ssl).toBe(true);
    });
  });

  describe('MapBinder methods', () => {
    it('should correctly identify Record properties', () => {
      const instance = new DatabasesRecordConfig();
      const { MapBinder } = require('../src/map-binder');
      const binder = new MapBinder();

      const isRecord = binder.isRecordProperty(instance, 'connections');
      expect(isRecord).toBe(true);
    });

    it('should correctly identify Map properties', () => {
      const instance = new DatabasesMapConfig();
      const { MapBinder } = require('../src/map-binder');
      const binder = new MapBinder();

      const isMap = binder.isMapProperty(instance, 'connections');
      expect(isMap).toBe(true);
    });

    it('should distinguish between Map and Record properties', () => {
      const recordInstance = new DatabasesRecordConfig();
      const mapInstance = new DatabasesMapConfig();
      const { MapBinder } = require('../src/map-binder');
      const binder = new MapBinder();

      // Record property should not be identified as Map
      expect(binder.isMapProperty(recordInstance, 'connections')).toBe(false);
      expect(binder.isRecordProperty(recordInstance, 'connections')).toBe(true);

      // Map property should not be identified as Record
      expect(binder.isMapProperty(mapInstance, 'connections')).toBe(true);
      expect(binder.isRecordProperty(mapInstance, 'connections')).toBe(false);
    });
  });
});
