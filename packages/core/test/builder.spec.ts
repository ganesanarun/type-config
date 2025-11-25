import 'reflect-metadata';
import { ConfigurationBuilder } from '../src/builder';
import { InMemoryConfigSource } from '../src/sources';
import { ConfigurationProperties, ConfigProperty } from '../src/decorators';

describe('ConfigurationBuilder', () => {
  describe('withProfile', () => {
    it('should set profile', async () => {
      const builder = new ConfigurationBuilder();

      builder.withProfile('production');
      const { configManager } = await builder.build();

      expect(configManager.getProfile()).toBe('production');
    });

    it('should return builder for chaining', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withProfile('test');

      expect(result).toBe(builder);
    });
  });

  describe('withConfigDir', () => {
    it('should set config directory', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withConfigDir('/custom/path');

      expect(result).toBe(builder);
    });
  });

  describe('withEnvPrefix', () => {
    it('should set environment prefix', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withEnvPrefix('APP_');

      expect(result).toBe(builder);
    });
  });

  describe('withHotReload', () => {
    it('should enable hot reload', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withHotReload(true);

      expect(result).toBe(builder);
    });

    it('should enable hot reload by default', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withHotReload();

      expect(result).toBe(builder);
    });
  });

  describe('withEncryption', () => {
    it('should set encryption key', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withEncryption('12345678901234567890123456789012');

      expect(result).toBe(builder);
    });
  });

  describe('withValidation', () => {
    it('should enable validation', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withValidation(true);

      expect(result).toBe(builder);
    });

    it('should enable validation by default', () => {
      const builder = new ConfigurationBuilder();

      const result = builder.withValidation();

      expect(result).toBe(builder);
    });
  });

  describe('addSource', () => {
    it('should add custom source', async () => {
      const builder = new ConfigurationBuilder();
      const source = new InMemoryConfigSource({ custom: 'value' }, 100);

      builder.addSource(source);
      const { configManager } = await builder.build();

      expect(configManager.get('custom')).toBe('value');
    });

    it('should add multiple sources', async () => {
      const builder = new ConfigurationBuilder();
      const source1 = new InMemoryConfigSource({ key1: 'value1' }, 100);
      const source2 = new InMemoryConfigSource({ key2: 'value2' }, 200);

      builder.addSource(source1).addSource(source2);
      const { configManager } = await builder.build();

      expect(configManager.get('key1')).toBe('value1');
      expect(configManager.get('key2')).toBe('value2');
    });
  });

  describe('registerConfig', () => {
    it('should register config class', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value!: string;
      }

      const builder = new ConfigurationBuilder();
      builder.addSource(new InMemoryConfigSource({ test: { value: 'test' } }, 100));

      builder.registerConfig(TestConfig);
      const { container } = await builder.build();

      expect(container.has(TestConfig)).toBe(true);
      const instance = container.get(TestConfig);
      expect(instance.value).toBe('test');
    });
  });

  describe('registerConfigs', () => {
    it('should register multiple config classes', async () => {
      @ConfigurationProperties('config1')
      class Config1 {
        @ConfigProperty()
        value!: string;
      }

      @ConfigurationProperties('config2')
      class Config2 {
        @ConfigProperty()
        value!: string;
      }

      const builder = new ConfigurationBuilder();
      builder.addSource(new InMemoryConfigSource({ config1: { value: 'v1' }, config2: { value: 'v2' } }, 100));

      builder.registerConfigs([Config1, Config2]);
      const { container } = await builder.build();

      expect(container.has(Config1)).toBe(true);
      expect(container.has(Config2)).toBe(true);
      expect(container.get(Config1).value).toBe('v1');
      expect(container.get(Config2).value).toBe('v2');
    });
  });

  describe('build', () => {
    it('should build config manager and container', async () => {
      const builder = new ConfigurationBuilder();

      const result = await builder.build();

      expect(result.configManager).toBeDefined();
      expect(result.container).toBeDefined();
    });

    it('should initialize config manager', async () => {
      const builder = new ConfigurationBuilder();
      builder.addSource(new InMemoryConfigSource({ test: 'value' }, 100));

      const { configManager } = await builder.build();

      expect(configManager.get('test')).toBe('value');
    });
  });

  describe('buildConfigOnly', () => {
    it('should build only config manager', async () => {
      const builder = new ConfigurationBuilder();

      const configManager = await builder.buildConfigOnly();

      expect(configManager).toBeDefined();
      expect(configManager.getProfile()).toBeDefined();
    });

    it('should initialize config manager', async () => {
      const builder = new ConfigurationBuilder();
      builder.addSource(new InMemoryConfigSource({ test: 'value' }, 100));

      const configManager = await builder.buildConfigOnly();

      expect(configManager.get('test')).toBe('value');
    });
  });

  describe('fluent API', () => {
    it('should support chaining all methods', async () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @ConfigProperty()
        host!: string;
      }

      const result = await new ConfigurationBuilder()
        .withProfile('production')
        .withConfigDir('/config')
        .withEnvPrefix('APP_')
        .withHotReload(false)
        .withValidation(true)
        .addSource(new InMemoryConfigSource({ database: { host: 'localhost' } }, 100))
        .registerConfig(DatabaseConfig)
        .build();

      expect(result.configManager).toBeDefined();
      expect(result.container).toBeDefined();
      expect(result.configManager.getProfile()).toBe('production');
      expect(result.container.get(DatabaseConfig).host).toBe('localhost');
    });
  });
});
