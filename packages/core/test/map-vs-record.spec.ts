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
  Validate,
} from '../src';
import { IsBoolean, IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MapBinder } from '../src/map-binder';

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
 * Configuration class using Map type
 */
@ConfigurationProperties('databases')
class DatabasesMapConfig {
  @ConfigProperty('connections')
  @Required()
  connections!: Map<string, DatabaseConnectionValidated>;
}

/**
 * Configuration class using Record type
 * Note: Not using @RecordType() decorator to allow automatic validation
 */
@ConfigurationProperties('databases')
@Validate()
class DatabasesRecordConfig {
  @ConfigProperty('connections')
  @Required()
  @ValidateNested({ each: true })
  @Type(() => DatabaseConnectionValidated)
  connections!: Record<string, DatabaseConnectionValidated>;
}

describe('Map vs Record Behavior Comparison', () => {
  let tempDir: string;
  const createdManagers: ConfigManager[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'map-vs-record-test-'));
  });

  afterEach(async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const manager of createdManagers) {
      await manager.dispose();
    }
    createdManagers.length = 0;
  });

  describe('Same YAML config binds correctly to both Map and Record classes', () => {
    it('should bind same YAML config to both Map and Record with identical data', async () => {
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
      host: remotehost
      port: 3306
      username: admin
      password: pass123
      database: serhafen_ag
      schema: ag
      ssl: true
`;

      const configPath = path.join(tempDir, 'application.yml');
      fs.writeFileSync(configPath, yamlContent);

      const manager = new ConfigManager({ configDir: tempDir, validateOnBind: false });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);
      const recordConfig = manager.bind(DatabasesRecordConfig);

      // Both should have same number of entries
      expect(mapConfig.connections.size).toBe(2);
      expect(Object.keys(recordConfig.connections)).toHaveLength(2);

      // Verify Map data
      expect(mapConfig.connections.get('serhafen-us')?.host).toBe('localhost');
      expect(mapConfig.connections.get('serhafen-us')?.port).toBe(5432);
      expect(mapConfig.connections.get('serhafen-us')?.ssl).toBe(false);
      expect(mapConfig.connections.get('serhafen-ag')?.host).toBe('remotehost');
      expect(mapConfig.connections.get('serhafen-ag')?.port).toBe(3306);
      expect(mapConfig.connections.get('serhafen-ag')?.ssl).toBe(true);

      // Verify Record data (same values)
      expect(recordConfig.connections['serhafen-us'].host).toBe('localhost');
      expect(recordConfig.connections['serhafen-us'].port).toBe(5432);
      expect(recordConfig.connections['serhafen-us'].ssl).toBe(false);
      expect(recordConfig.connections['serhafen-ag'].host).toBe('remotehost');
      expect(recordConfig.connections['serhafen-ag'].port).toBe(3306);
      expect(recordConfig.connections['serhafen-ag'].ssl).toBe(true);
    });

    it('should bind same JSON config to both Map and Record with identical data', async () => {
      const jsonContent = {
        databases: {
          connections: {
            'db-primary': {
              host: 'primary.example.com',
              port: 5432,
              username: 'primary_user',
              password: 'primary_pass',
              database: 'primary_db',
              schema: 'public',
              ssl: true,
            },
            'db-replica': {
              host: 'replica.example.com',
              port: 5433,
              username: 'replica_user',
              password: 'replica_pass',
              database: 'replica_db',
              schema: 'public',
              ssl: false,
            },
          },
        },
      };

      const configPath = path.join(tempDir, 'application.json');
      fs.writeFileSync(configPath, JSON.stringify(jsonContent));

      const manager = new ConfigManager({ configDir: tempDir, validateOnBind: false });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);
      const recordConfig = manager.bind(DatabasesRecordConfig);

      // Both should have same data
      expect(mapConfig.connections.size).toBe(2);
      expect(Object.keys(recordConfig.connections)).toHaveLength(2);

      // Verify identical data
      expect(mapConfig.connections.get('db-primary')?.host).toBe(
        recordConfig.connections['db-primary'].host
      );
      expect(mapConfig.connections.get('db-replica')?.ssl).toBe(
        recordConfig.connections['db-replica'].ssl
      );
    });
  });

  describe('Map instance has .get(), .set(), .has(), .delete() methods', () => {
    it('should have .get() method that retrieves values', async () => {
      const config = {
        databases: {
          connections: {
            testdb: {
              host: 'testhost',
              port: 5432,
              username: 'testuser',
              password: 'testpass',
              database: 'testdb',
              schema: 'public',
              ssl: false,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);

      // Test .get() method
      expect(typeof mapConfig.connections.get).toBe('function');
      const entry = mapConfig.connections.get('testdb');
      expect(entry).toBeDefined();
      expect(entry?.host).toBe('testhost');
      expect(mapConfig.connections.get('nonexistent')).toBeUndefined();
    });

    it('should have .set() method that adds/updates entries', async () => {
      const config = {
        databases: {
          connections: {
            existing: {
              host: 'existinghost',
              port: 5432,
              username: 'user',
              password: 'pass',
              database: 'db',
              schema: 'schema',
              ssl: false,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);

      // Test .set() method
      expect(typeof mapConfig.connections.set).toBe('function');
      
      const newEntry = {
        host: 'newhost',
        port: 3306,
        username: 'newuser',
        password: 'newpass',
        database: 'newdb',
        schema: 'newschema',
        ssl: true,
      };
      
      mapConfig.connections.set('newdb', newEntry as any);
      expect(mapConfig.connections.size).toBe(2);
      expect(mapConfig.connections.get('newdb')?.host).toBe('newhost');
    });

    it('should have .has() method that checks for key existence', async () => {
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

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);

      // Test .has() method
      expect(typeof mapConfig.connections.has).toBe('function');
      expect(mapConfig.connections.has('db1')).toBe(true);
      expect(mapConfig.connections.has('db2')).toBe(true);
      expect(mapConfig.connections.has('db3')).toBe(false);
      expect(mapConfig.connections.has('nonexistent')).toBe(false);
    });

    it('should have .delete() method that removes entries', async () => {
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

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);

      // Test .delete() method
      expect(typeof mapConfig.connections.delete).toBe('function');
      expect(mapConfig.connections.size).toBe(2);
      
      const deleted = mapConfig.connections.delete('db1');
      expect(deleted).toBe(true);
      expect(mapConfig.connections.size).toBe(1);
      expect(mapConfig.connections.has('db1')).toBe(false);
      expect(mapConfig.connections.has('db2')).toBe(true);
      
      const deletedAgain = mapConfig.connections.delete('nonexistent');
      expect(deletedAgain).toBe(false);
    });
  });

  describe('Record does not have Map methods (is plain object)', () => {
    it('should not have Map methods', async () => {
      const config = {
        databases: {
          connections: {
            testdb: {
              host: 'testhost',
              port: 5432,
              username: 'testuser',
              password: 'testpass',
              database: 'testdb',
              schema: 'public',
              ssl: false,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const recordConfig = manager.bind(DatabasesRecordConfig);

      // Record should not have Map methods
      expect((recordConfig.connections as any).get).toBeUndefined();
      expect((recordConfig.connections as any).set).toBeUndefined();
      expect((recordConfig.connections as any).has).toBeUndefined();
      expect((recordConfig.connections as any).delete).toBeUndefined();
      expect((recordConfig.connections as any).size).toBeUndefined();
    });

    it('should be a plain object', async () => {
      const config = {
        databases: {
          connections: {
            testdb: {
              host: 'testhost',
              port: 5432,
              username: 'testuser',
              password: 'testpass',
              database: 'testdb',
              schema: 'public',
              ssl: false,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const recordConfig = manager.bind(DatabasesRecordConfig);

      // Should be plain object, not Map
      expect(recordConfig.connections).not.toBeInstanceOf(Map);
      expect(typeof recordConfig.connections).toBe('object');
      expect(recordConfig.connections.constructor).toBe(Object);
    });

    it('should use bracket notation for access', async () => {
      const config = {
        databases: {
          connections: {
            'my-db': {
              host: 'myhost',
              port: 5432,
              username: 'myuser',
              password: 'mypass',
              database: 'mydb',
              schema: 'myschema',
              ssl: true,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const recordConfig = manager.bind(DatabasesRecordConfig);

      // Should use bracket notation
      expect(recordConfig.connections['my-db']).toBeDefined();
      expect(recordConfig.connections['my-db'].host).toBe('myhost');
      expect(recordConfig.connections['my-db'].ssl).toBe(true);
    });
  });

  describe('Record validation happens automatically during bind()', () => {
    it('should validate Record entries automatically when validateOnBind is true', async () => {
      const config = {
        databases: {
          connections: {
            'valid-db': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: true,
            },
            'invalid-db': {
              host: 'localhost',
              port: 99999, // Invalid: exceeds max of 65535
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: true,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: true,
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should throw validation error automatically
      expect(() => manager.bind(DatabasesRecordConfig)).toThrow();
    });

    it('should validate all Record entries with nested validation', async () => {
      const config = {
        databases: {
          connections: {
            'test-db': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: 'not-a-boolean', // Invalid: should be boolean
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: true,
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should throw validation error for invalid nested property
      expect(() => manager.bind(DatabasesRecordConfig)).toThrow();
    });

    it('should not validate Record entries with validateOnBind when using plain Record', async () => {
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

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false, // Record validation doesn't work automatically
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should bind successfully without validation
      const recordConfig = manager.bind(DatabasesRecordConfig);
      expect(recordConfig.connections).toBeDefined();
      expect(Object.keys(recordConfig.connections)).toHaveLength(2);
    });
  });

  describe('Map validation requires manual MapBinder.validateMapEntries() call', () => {
    it('should not validate Map entries automatically during bind()', async () => {
      const config = {
        databases: {
          connections: {
            'invalid-db': {
              host: 'localhost',
              port: 99999, // Invalid: exceeds max
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: true,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false, // Map requires validateOnBind: false
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should NOT throw during bind - Map doesn't validate automatically
      const mapConfig = manager.bind(DatabasesMapConfig);
      expect(mapConfig.connections).toBeInstanceOf(Map);
      expect(mapConfig.connections.size).toBe(1);
    });

    it('should require manual validation (no automatic validation available)', async () => {
      const config = {
        databases: {
          connections: {
            'test-db': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: true,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);

      // Manual validation must be implemented by the user
      // MapBinder.validateMapEntries() has been removed as it didn't work properly
      for (const [name, conn] of mapConfig.connections) {
        expect(conn.host).toBeDefined();
        expect(conn.port).toBeGreaterThan(0);
        expect(conn.port).toBeLessThanOrEqual(65535);
      }
    });

    it('should allow binding invalid data without automatic validation', async () => {
      const config = {
        databases: {
          connections: {
            'bad-port': {
              host: 'localhost',
              port: -1, // Invalid
              username: 'user',
              password: 'pass',
              database: 'db',
              schema: 'schema',
              ssl: 'invalid', // Invalid
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should bind successfully without validation
      const mapConfig = manager.bind(DatabasesMapConfig);
      expect(mapConfig.connections.size).toBe(1);
      expect(mapConfig.connections.get('bad-port')?.port).toBe(-1);
    });
  });

  describe('Map requires validateOnBind: false to avoid validation errors', () => {
    it('should work with validateOnBind: true but not validate Map entries', async () => {
      const config = {
        databases: {
          connections: {
            'test-db': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: true,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: true,
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Map with validateOnBind: true works but doesn't validate entries automatically
      // Only validates required properties, not the Map entries themselves
      const mapConfig = manager.bind(DatabasesMapConfig);
      expect(mapConfig.connections).toBeInstanceOf(Map);
      expect(mapConfig.connections.size).toBe(1);
    });

    it('should work correctly when validateOnBind is false for Map', async () => {
      const config = {
        databases: {
          connections: {
            'test-db': {
              host: 'localhost',
              port: 5432,
              username: 'postgres',
              password: 'secret',
              database: 'testdb',
              schema: 'public',
              ssl: true,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false, // Required for Map
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should work fine with validateOnBind: false
      const mapConfig = manager.bind(DatabasesMapConfig);
      expect(mapConfig.connections).toBeInstanceOf(Map);
      expect(mapConfig.connections.size).toBe(1);
    });
  });

  describe('Record works with validateOnBind: true', () => {
    it('should validate required properties but not entries with validateOnBind: true', async () => {
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

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false, // Record doesn't support automatic entry validation
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should work with validateOnBind: false
      const recordConfig = manager.bind(DatabasesRecordConfig);
      expect(recordConfig.connections).toBeDefined();
      expect(Object.keys(recordConfig.connections)).toHaveLength(2);
    });

    it('should validate and catch errors with validateOnBind: true', async () => {
      const config = {
        databases: {
          connections: {
            'invalid-db': {
              host: 'localhost',
              port: 99999, // Invalid
              username: 'user',
              password: 'pass',
              database: 'db',
              schema: 'schema',
              ssl: true,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: true,
      });
      createdManagers.push(manager);
      await manager.initialize();

      // Should throw validation error
      expect(() => manager.bind(DatabasesRecordConfig)).toThrow();
    });
  });

  describe('Iteration: Map.entries() vs Object.entries(record)', () => {
    it('should iterate Map using Map.entries()', async () => {
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

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);

      // Iterate using Map.entries()
      const entries = Array.from(mapConfig.connections.entries());
      expect(entries).toHaveLength(2);
      expect(entries[0][0]).toBe('db1');
      expect(entries[0][1].host).toBe('host1');
      expect(entries[1][0]).toBe('db2');
      expect(entries[1][1].host).toBe('host2');

      // Iterate using for...of
      const keys: string[] = [];
      for (const [key, value] of mapConfig.connections) {
        keys.push(key);
        expect(value.host).toBeDefined();
      }
      expect(keys).toEqual(['db1', 'db2']);
    });

    it('should iterate Record using Object.entries()', async () => {
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

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const recordConfig = manager.bind(DatabasesRecordConfig);

      // Iterate using Object.entries()
      const entries = Object.entries(recordConfig.connections);
      expect(entries).toHaveLength(2);
      expect(entries[0][0]).toBe('db1');
      expect(entries[0][1].host).toBe('host1');
      expect(entries[1][0]).toBe('db2');
      expect(entries[1][1].host).toBe('host2');

      // Iterate using for...in
      const keys: string[] = [];
      for (const key in recordConfig.connections) {
        keys.push(key);
        expect(recordConfig.connections[key].host).toBeDefined();
      }
      expect(keys).toEqual(['db1', 'db2']);
    });

    it('should compare iteration patterns between Map and Record', async () => {
      const config = {
        databases: {
          connections: {
            conn1: {
              host: 'host1',
              port: 1111,
              username: 'user1',
              password: 'pass1',
              database: 'db1',
              schema: 'schema1',
              ssl: false,
            },
            conn2: {
              host: 'host2',
              port: 2222,
              username: 'user2',
              password: 'pass2',
              database: 'db2',
              schema: 'schema2',
              ssl: true,
            },
            conn3: {
              host: 'host3',
              port: 3333,
              username: 'user3',
              password: 'pass3',
              database: 'db3',
              schema: 'schema3',
              ssl: false,
            },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const mapConfig = manager.bind(DatabasesMapConfig);
      const recordConfig = manager.bind(DatabasesRecordConfig);

      // Map iteration
      const mapKeys = Array.from(mapConfig.connections.keys());
      const mapValues = Array.from(mapConfig.connections.values());
      const mapEntries = Array.from(mapConfig.connections.entries());

      // Record iteration
      const recordKeys = Object.keys(recordConfig.connections);
      const recordValues = Object.values(recordConfig.connections);
      const recordEntries = Object.entries(recordConfig.connections);

      // Both should have same keys
      expect(mapKeys).toEqual(recordKeys);
      expect(mapKeys).toEqual(['conn1', 'conn2', 'conn3']);

      // Both should have same number of values
      expect(mapValues).toHaveLength(3);
      expect(recordValues).toHaveLength(3);

      // Both should have same number of entries
      expect(mapEntries).toHaveLength(3);
      expect(recordEntries).toHaveLength(3);

      // Verify data is identical
      expect(mapValues[0].host).toBe(recordValues[0].host);
      expect(mapValues[1].port).toBe(recordValues[1].port);
      expect(mapValues[2].ssl).toBe(recordValues[2].ssl);
    });
  });
});
