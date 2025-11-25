import 'reflect-metadata';
import { Request, Response } from 'express';
import { configMiddleware, createTypeConfig, ExpressConfig } from '../src';
import {
  ConfigManager,
  ConfigProperty,
  ConfigurationProperties,
  Container,
  InMemoryConfigSource,
} from '@snow-tzu/type-config';

describe('Express Adapter', () => {
  describe('ExpressConfig', () => {
    let configManager: ConfigManager;
    let container: Container;

    beforeEach(async () => {
      configManager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource({ test: 'value' }, 100)],
      });
      await configManager.initialize();
      container = new Container();
      container.setConfigManager(configManager);
    });

    afterEach(async () => {
      await configManager.dispose();
    });

    describe('constructor', () => {
      it('should create instance with manager and container', () => {
        const expressConfig = new ExpressConfig(configManager, container);

        expect(expressConfig.configManager).toBe(configManager);
        expect(expressConfig.container).toBe(container);
      });
    });

    describe('middleware', () => {
      it('should attach config and container to request', () => {
        const expressConfig = new ExpressConfig(configManager, container);
        const middleware = expressConfig.middleware();

        const req = {} as Request;
        const res = {} as Response;
        const next = jest.fn();

        middleware(req, res, next);

        expect(req.config).toBe(configManager);
        expect(req.container).toBe(container);
        expect(next).toHaveBeenCalled();
      });
    });

    describe('get', () => {
      it('should retrieve config class from container', async () => {
        @ConfigurationProperties('database')
        class DatabaseConfig {
          @ConfigProperty()
          host!: string;
        }

        const testConfigManager = new ConfigManager({
          additionalSources: [new InMemoryConfigSource({ database: { host: 'localhost' } }, 100)],
        });
        await testConfigManager.initialize();
        const testContainer = new Container();
        testContainer.setConfigManager(testConfigManager);
        testContainer.registerConfig(DatabaseConfig);

        const expressConfig = new ExpressConfig(testConfigManager, testContainer);

        const instance = expressConfig.get(DatabaseConfig);

        expect(instance).toBeInstanceOf(DatabaseConfig);

        await testConfigManager.dispose();
      });
    });

    describe('getValue', () => {
      it('should get configuration value', () => {
        const expressConfig = new ExpressConfig(configManager, container);

        const value = expressConfig.getValue('test');

        expect(value).toBe('value');
      });

      it('should return default value when not found', () => {
        const expressConfig = new ExpressConfig(configManager, container);

        const value = expressConfig.getValue('nonexistent', 'default');

        expect(value).toBe('default');
      });
    });

    describe('onChange', () => {
      it('should register change listener', async () => {
        const expressConfig = new ExpressConfig(configManager, container);
        const listener = jest.fn();

        expressConfig.onChange(listener);
        await (configManager as any).reload();

        expect(listener).toHaveBeenCalled();
      });

      it('should return unsubscribe function', async () => {
        const expressConfig = new ExpressConfig(configManager, container);
        const listener = jest.fn();

        const unsubscribe = expressConfig.onChange(listener);
        unsubscribe();
        await (configManager as any).reload();

        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe('getProfile', () => {
      it('should return active profile', () => {
        const expressConfig = new ExpressConfig(configManager, container);

        const profile = expressConfig.getProfile();

        expect(profile).toBeDefined();
      });
    });
  });

  describe('createTypeConfig', () => {
    const createdManagers: ConfigManager[] = [];

    afterEach(async () => {
      for (const manager of createdManagers) {
        await manager.dispose();
      }
      createdManagers.length = 0;
    });

    it('should create ExpressConfig instance', async () => {
      const result = await createTypeConfig();
      createdManagers.push(result.configManager);

      expect(result).toBeInstanceOf(ExpressConfig);
      expect(result.configManager).toBeDefined();
      expect(result.container).toBeDefined();
    });

    it('should apply profile option', async () => {
      const result = await createTypeConfig({ profile: 'test' });
      createdManagers.push(result.configManager);

      expect(result.getProfile()).toBe('test');
    });

    it('should apply env prefix option', async () => {
      const result = await createTypeConfig({ envPrefix: 'APP_' });
      createdManagers.push(result.configManager);

      expect(result).toBeDefined();
    });

    it('should apply config directory option', async () => {
      const result = await createTypeConfig({ configDir: './config' });
      createdManagers.push(result.configManager);

      expect(result).toBeDefined();
    });

    it('should apply hot reload option', async () => {
      const result = await createTypeConfig({ enableHotReload: false });
      createdManagers.push(result.configManager);

      expect(result).toBeDefined();
    });

    it('should apply encryption key option', async () => {
      const result = await createTypeConfig({ encryptionKey: '12345678901234567890123456789012' });
      createdManagers.push(result.configManager);

      expect(result).toBeDefined();
    });

    it('should apply validation option', async () => {
      const result = await createTypeConfig({ validateOnBind: false });
      createdManagers.push(result.configManager);

      expect(result).toBeDefined();
    });

    it('should register config classes', async () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value!: string;
      }

      const result = await createTypeConfig({
        configClasses: [TestConfig],
        additionalSources: [new InMemoryConfigSource({ test: { value: 'test' } }, 100)],
      });
      createdManagers.push(result.configManager);

      expect(result.container.has(TestConfig)).toBe(true);
    });

    it('should add additional sources', async () => {
      const source = new InMemoryConfigSource({ custom: 'value' }, 100);

      const result = await createTypeConfig({ additionalSources: [source] });
      createdManagers.push(result.configManager);

      expect(result.getValue('custom')).toBe('value');
    });
  });

  describe('configMiddleware', () => {
    it('should create middleware function', async () => {
      const configManager = new ConfigManager();
      await configManager.initialize();
      const container = new Container();
      container.setConfigManager(configManager);

      const middleware = configMiddleware(configManager, container);

      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.config).toBe(configManager);
      expect(req.container).toBe(container);
      expect(next).toHaveBeenCalled();

      await configManager.dispose();
    });
  });
});
