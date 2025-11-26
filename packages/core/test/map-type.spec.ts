import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigManager,
  ConfigProperty,
  ConfigurationProperties,
  InMemoryConfigSource,
  Required,
  DefaultValue,
} from '../src';
import { MapBinder } from '../src/map-binder';

/**
 * Test configuration class for database connections
 */
class DatabaseConnection {
  host!: string;
  port!: number;
  username!: string;
  password!: string;
  database!: string;
  schema!: string;
}

/**
 * Configuration class using Map type
 */
@ConfigurationProperties('databases')
class DatabasesMapConfig {
  @ConfigProperty('connections')
  connections!: Map<string, DatabaseConnection>;
}

/**
 * Configuration class with required Map property
 */
@ConfigurationProperties('databases')
class DatabasesRequiredMapConfig {
  @Required()
  @ConfigProperty('connections')
  connections!: Map<string, any>;
}

/**
 * Configuration class with default Map value
 */
@ConfigurationProperties('databases')
class DatabasesDefaultMapConfig {
  @DefaultValue({})
  @ConfigProperty('connections')
  connections!: Map<string, any>;
}

/**
 * Configuration class with nested Map structures
 */
@ConfigurationProperties('config')
class NestedMapConfig {
  @ConfigProperty('items')
  items!: Map<string, any>;
}

describe('Map Type Functionality', () => {
  let tempDir: string;
  const createdManagers: ConfigManager[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'map-test-'));
  });

  afterEach(async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const manager of createdManagers) {
      await manager.dispose();
    }
    createdManagers.length = 0;
  });

  describe('Map binding preserves all key-value pairs from YAML', () => {
    it('should preserve all entries when binding from YAML', async () => {
      const yamlContent = `
databases:
  connections:
    db1:
      host: host1
      port: 5432
      username: user1
      password: pass1
      database: database1
      schema: schema1
    db2:
      host: host2
      port: 5433
      username: user2
      password: pass2
      database: database2
      schema: schema2
    db3:
      host: host3
      port: 5434
      username: user3
      password: pass3
      database: database3
      schema: schema3
`;

      const configPath = path.join(tempDir, 'application.yml');
      fs.writeFileSync(configPath, yamlContent);

      const manager = new ConfigManager({ configDir: tempDir, validateOnBind: false });
      createdManagers.push(manager);
      await manager.initialize();

      const config = manager.bind(DatabasesMapConfig);

      // Should preserve all 3 entries
      expect(config.connections).toBeInstanceOf(Map);
      expect(config.connections.size).toBe(3);
      
      // Verify all keys are present
      expect(config.connections.has('db1')).toBe(true);
      expect(config.connections.has('db2')).toBe(true);
      expect(config.connections.has('db3')).toBe(true);
      
      // Verify all values are preserved
      expect(config.connections.get('db1')).toEqual({
        host: 'host1',
        port: 5432,
        username: 'user1',
        password: 'pass1',
        database: 'database1',
        schema: 'schema1',
      });
      expect(config.connections.get('db2')).toEqual({
        host: 'host2',
        port: 5433,
        username: 'user2',
        password: 'pass2',
        database: 'database2',
        schema: 'schema2',
      });
      expect(config.connections.get('db3')).toEqual({
        host: 'host3',
        port: 5434,
        username: 'user3',
        password: 'pass3',
        database: 'database3',
        schema: 'schema3',
      });
    });

    it('should preserve all entries when binding from JSON', async () => {
      const jsonContent = {
        databases: {
          connections: {
            conn1: { host: 'h1', port: 1111 },
            conn2: { host: 'h2', port: 2222 },
            conn3: { host: 'h3', port: 3333 },
            conn4: { host: 'h4', port: 4444 },
          },
        },
      };

      const configPath = path.join(tempDir, 'application.json');
      fs.writeFileSync(configPath, JSON.stringify(jsonContent));

      const manager = new ConfigManager({ configDir: tempDir, validateOnBind: false });
      createdManagers.push(manager);
      await manager.initialize();

      const config = manager.bind(DatabasesMapConfig);

      expect(config.connections.size).toBe(4);
      expect(config.connections.get('conn1')?.host).toBe('h1');
      expect(config.connections.get('conn2')?.port).toBe(2222);
      expect(config.connections.get('conn3')?.host).toBe('h3');
      expect(config.connections.get('conn4')?.port).toBe(4444);
    });
  });

  describe('Map type detection using reflect-metadata', () => {
    it('should detect Map type using MapBinder.isMapProperty', () => {
      const instance = new DatabasesMapConfig();
      const binder = new MapBinder();

      const isMap = binder.isMapProperty(instance, 'connections');
      
      expect(isMap).toBe(true);
    });

    it('should not detect non-Map properties as Map', () => {
      @ConfigurationProperties('test')
      class NonMapConfig {
        @ConfigProperty('value')
        value!: string;
        
        @ConfigProperty('obj')
        obj!: object;
        
        @ConfigProperty('arr')
        arr!: any[];
      }

      const instance = new NonMapConfig();
      const binder = new MapBinder();

      expect(binder.isMapProperty(instance, 'value')).toBe(false);
      expect(binder.isMapProperty(instance, 'obj')).toBe(false);
      expect(binder.isMapProperty(instance, 'arr')).toBe(false);
    });

    it('should automatically convert object to Map during binding', async () => {
      const config = {
        databases: {
          connections: {
            auto1: { host: 'autohost1', port: 1000 },
            auto2: { host: 'autohost2', port: 2000 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesMapConfig);

      // Should automatically detect and convert to Map
      expect(boundConfig.connections).toBeInstanceOf(Map);
      expect(boundConfig.connections.size).toBe(2);
    });
  });

  describe('Map with nested object structures', () => {
    it('should preserve deeply nested structures in map values', async () => {
      const config = {
        config: {
          items: {
            item1: {
              name: 'Item 1',
              metadata: {
                tags: ['tag1', 'tag2'],
                properties: {
                  color: 'red',
                  size: 'large',
                  nested: {
                    deep: {
                      value: 'deeply-nested-value',
                    },
                  },
                },
              },
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

      const boundConfig = manager.bind(NestedMapConfig);

      const item1 = boundConfig.items.get('item1');
      expect(item1).toBeDefined();
      expect(item1.name).toBe('Item 1');
      expect(item1.metadata.tags).toEqual(['tag1', 'tag2']);
      expect(item1.metadata.properties.color).toBe('red');
      expect(item1.metadata.properties.nested.deep.value).toBe('deeply-nested-value');
    });

    it('should handle multiple levels of nested objects', async () => {
      const config = {
        config: {
          items: {
            complex: {
              level1: {
                level2: {
                  level3: {
                    level4: {
                      value: 'deep-value',
                    },
                  },
                },
              },
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

      const boundConfig = manager.bind(NestedMapConfig);

      const complex = boundConfig.items.get('complex');
      expect(complex.level1.level2.level3.level4.value).toBe('deep-value');
    });

    it('should preserve arrays within nested structures', async () => {
      const config = {
        config: {
          items: {
            withArrays: {
              simpleArray: [1, 2, 3],
              objectArray: [
                { id: 1, name: 'first' },
                { id: 2, name: 'second' },
              ],
              nestedArrays: [[1, 2], [3, 4]],
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

      const boundConfig = manager.bind(NestedMapConfig);

      const withArrays = boundConfig.items.get('withArrays');
      expect(withArrays.simpleArray).toEqual([1, 2, 3]);
      expect(withArrays.objectArray).toEqual([
        { id: 1, name: 'first' },
        { id: 2, name: 'second' },
      ]);
      expect(withArrays.nestedArrays).toEqual([[1, 2], [3, 4]]);
    });
  });

  describe('Map.get(), Map.has(), Map.size methods work correctly', () => {
    it('should support Map.get() method', async () => {
      const config = {
        databases: {
          connections: {
            primary: { host: 'primary-host', port: 5432 },
            secondary: { host: 'secondary-host', port: 5433 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesMapConfig);

      // Test .get() method
      const primary = boundConfig.connections.get('primary');
      expect(primary).toBeDefined();
      expect(primary?.host).toBe('primary-host');
      expect(primary?.port).toBe(5432);

      const secondary = boundConfig.connections.get('secondary');
      expect(secondary).toBeDefined();
      expect(secondary?.host).toBe('secondary-host');

      // Non-existent key should return undefined
      const nonExistent = boundConfig.connections.get('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should support Map.has() method', async () => {
      const config = {
        databases: {
          connections: {
            db1: { host: 'host1', port: 1111 },
            db2: { host: 'host2', port: 2222 },
            db3: { host: 'host3', port: 3333 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesMapConfig);

      // Test .has() method
      expect(boundConfig.connections.has('db1')).toBe(true);
      expect(boundConfig.connections.has('db2')).toBe(true);
      expect(boundConfig.connections.has('db3')).toBe(true);
      expect(boundConfig.connections.has('db4')).toBe(false);
      expect(boundConfig.connections.has('non-existent')).toBe(false);
    });

    it('should support Map.size property', async () => {
      const config = {
        databases: {
          connections: {
            conn1: { host: 'h1', port: 1 },
            conn2: { host: 'h2', port: 2 },
            conn3: { host: 'h3', port: 3 },
            conn4: { host: 'h4', port: 4 },
            conn5: { host: 'h5', port: 5 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesMapConfig);

      // Test .size property
      expect(boundConfig.connections.size).toBe(5);
    });

    it('should support Map iteration methods', async () => {
      const config = {
        databases: {
          connections: {
            db1: { host: 'host1', port: 1111 },
            db2: { host: 'host2', port: 2222 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesMapConfig);

      // Test .keys()
      const keys = Array.from(boundConfig.connections.keys());
      expect(keys).toEqual(['db1', 'db2']);

      // Test .values()
      const values = Array.from(boundConfig.connections.values());
      expect(values).toHaveLength(2);
      expect(values[0].host).toBe('host1');
      expect(values[1].host).toBe('host2');

      // Test .entries()
      const entries = Array.from(boundConfig.connections.entries());
      expect(entries).toHaveLength(2);
      expect(entries[0][0]).toBe('db1');
      expect(entries[0][1].port).toBe(1111);
      expect(entries[1][0]).toBe('db2');
      expect(entries[1][1].port).toBe(2222);

      // Test for...of iteration
      const iteratedKeys: string[] = [];
      for (const [key] of boundConfig.connections) {
        iteratedKeys.push(key);
      }
      expect(iteratedKeys).toEqual(['db1', 'db2']);
    });
  });

  describe('Map with required properties throws validation error when missing', () => {
    it('should throw error when required Map property is missing', async () => {
      const config = {
        databases: {
          // Missing connections property
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: true,
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(DatabasesRequiredMapConfig)).toThrow(
        "Required configuration property 'databases.connections' is missing"
      );
    });

    it('should not throw when required Map property is present', async () => {
      const config = {
        databases: {
          connections: {
            db1: { host: 'host1', port: 5432 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: true,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesRequiredMapConfig);
      expect(boundConfig.connections).toBeInstanceOf(Map);
      expect(boundConfig.connections.size).toBe(1);
    });

    it('should throw error when required Map property is null', async () => {
      const config = {
        databases: {
          connections: null,
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: true,
      });
      createdManagers.push(manager);
      await manager.initialize();

      // When null is provided, type conversion happens first and throws
      // because null cannot be converted to Map
      expect(() => manager.bind(DatabasesRequiredMapConfig)).toThrow(
        "Cannot bind primitive value to Map<string, T> for property 'connections'"
      );
    });
  });

  describe('Map validation limitations', () => {
    it('should NOT validate Map entries automatically', () => {
      const binder = new MapBinder();
      
      // MapBinder is for type detection and conversion, not validation
      expect(binder.isMapProperty).toBeDefined();
      expect(binder.objectToMap).toBeDefined();
      
      // validateMapEntries method has been removed - validation must be manual
      expect((binder as any).validateMapEntries).toBeUndefined();
    });
  });

  describe('Map with complex nested values (objects within objects)', () => {
    it('should handle complex nested structures with multiple levels', async () => {
      const config = {
        config: {
          items: {
            complexItem: {
              server: {
                host: 'localhost',
                port: 3000,
                ssl: {
                  enabled: true,
                  cert: '/path/to/cert',
                  key: '/path/to/key',
                  options: {
                    minVersion: 'TLSv1.2',
                    ciphers: ['AES256', 'AES128'],
                  },
                },
              },
              database: {
                primary: {
                  host: 'db-primary',
                  port: 5432,
                  pool: {
                    min: 2,
                    max: 10,
                    idle: 10000,
                  },
                },
                replica: {
                  host: 'db-replica',
                  port: 5432,
                  pool: {
                    min: 1,
                    max: 5,
                    idle: 5000,
                  },
                },
              },
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

      const boundConfig = manager.bind(NestedMapConfig);

      const item = boundConfig.items.get('complexItem');
      expect(item).toBeDefined();
      
      // Verify server config
      expect(item.server.host).toBe('localhost');
      expect(item.server.ssl.enabled).toBe(true);
      expect(item.server.ssl.options.minVersion).toBe('TLSv1.2');
      expect(item.server.ssl.options.ciphers).toEqual(['AES256', 'AES128']);
      
      // Verify database config
      expect(item.database.primary.host).toBe('db-primary');
      expect(item.database.primary.pool.max).toBe(10);
      expect(item.database.replica.host).toBe('db-replica');
      expect(item.database.replica.pool.min).toBe(1);
    });

    it('should preserve mixed types in nested structures', async () => {
      const config = {
        config: {
          items: {
            mixedTypes: {
              stringValue: 'text',
              numberValue: 42,
              booleanValue: true,
              nullValue: null,
              arrayValue: [1, 'two', { three: 3 }],
              objectValue: {
                nested: {
                  deeply: {
                    value: 'deep',
                  },
                },
              },
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

      const boundConfig = manager.bind(NestedMapConfig);

      const item = boundConfig.items.get('mixedTypes');
      expect(item.stringValue).toBe('text');
      expect(item.numberValue).toBe(42);
      expect(item.booleanValue).toBe(true);
      expect(item.nullValue).toBeNull();
      expect(item.arrayValue).toEqual([1, 'two', { three: 3 }]);
      expect(item.objectValue.nested.deeply.value).toBe('deep');
    });
  });

  describe('ConfigManager.bind() returns proper Map instance', () => {
    it('should return instance with Map property', async () => {
      const config = {
        databases: {
          connections: {
            test: { host: 'testhost', port: 9999 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesMapConfig);

      // Should return proper instance
      expect(boundConfig).toBeInstanceOf(DatabasesMapConfig);
      expect(boundConfig.connections).toBeInstanceOf(Map);
    });

    it('should cache and return same instance on multiple bind calls', async () => {
      const config = {
        databases: {
          connections: {
            cached: { host: 'cachehost', port: 7777 },
          },
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const instance1 = manager.bind(DatabasesMapConfig);
      const instance2 = manager.bind(DatabasesMapConfig);

      // Should return same cached instance
      expect(instance1).toBe(instance2);
      expect(instance1.connections).toBe(instance2.connections);
    });

    it('should work with default values for Map properties', async () => {
      const config = {
        databases: {
          // connections not provided, should use default
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      const boundConfig = manager.bind(DatabasesDefaultMapConfig);

      // Should use default empty object and convert to Map
      expect(boundConfig.connections).toBeInstanceOf(Map);
      expect(boundConfig.connections.size).toBe(0);
    });

    it('should throw error when binding non-object to Map', async () => {
      @ConfigurationProperties('test')
      class InvalidMapConfig {
        @ConfigProperty('map')
        map!: Map<string, any>;
      }

      const config = {
        test: {
          map: 'not-an-object', // Invalid: string instead of object
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(InvalidMapConfig)).toThrow(
        "Cannot bind primitive value to Map<string, T> for property 'map'"
      );
    });

    it('should throw error when binding array to Map', async () => {
      @ConfigurationProperties('test')
      class InvalidMapConfig {
        @ConfigProperty('map')
        map!: Map<string, any>;
      }

      const config = {
        test: {
          map: ['array', 'values'], // Invalid: array instead of object
        },
      };

      const manager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource(config, 100)],
        validateOnBind: false,
      });
      createdManagers.push(manager);
      await manager.initialize();

      expect(() => manager.bind(InvalidMapConfig)).toThrow(
        "Cannot bind primitive value to Map<string, T> for property 'map'"
      );
    });
  });
});
