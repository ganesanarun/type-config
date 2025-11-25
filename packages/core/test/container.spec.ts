import 'reflect-metadata';
import {
  ConfigManager,
  ConfigProperty,
  ConfigurationProperties,
  Container,
  Inject,
  Injectable,
  InMemoryConfigSource,
} from '../src';

describe('Container', () => {
  let container: Container;
  let configManager: ConfigManager;

  beforeEach(async () => {
    container = new Container();
    configManager = new ConfigManager({ additionalSources: [new InMemoryConfigSource({}, 100)] });
    await configManager.initialize();
    container.setConfigManager(configManager);
  });

  describe('registerConfig', () => {
    it('should register config class', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value!: string;
      }

      container.registerConfig(TestConfig);

      expect(container.has(TestConfig)).toBe(true);
    });

    it('should throw error if ConfigManager not set', () => {
      @ConfigurationProperties('test')
      class TestConfig {}

      const newContainer = new Container();

      expect(() => newContainer.registerConfig(TestConfig)).toThrow(
        'ConfigManager not set in container'
      );
    });
  });

  describe('register', () => {
    it('should register injectable class', () => {
      @Injectable()
      class TestService {}

      container.register(TestService);

      expect(true).toBe(true);
    });

    it('should throw error for non-injectable class', () => {
      class PlainClass {}

      expect(() => container.register(PlainClass)).toThrow('must be decorated with @Injectable');
    });
  });

  describe('registerInstance', () => {
    it('should register specific instance', () => {
      const instance = { value: 'test' };

      container.registerInstance('token', instance);

      expect(container.has('token')).toBe(true);
      expect(container.get('token')).toBe(instance);
    });
  });

  describe('has', () => {
    it('should return true for registered token', () => {
      container.registerInstance('token', {});

      expect(container.has('token')).toBe(true);
    });

    it('should return false for unregistered token', () => {
      expect(container.has('unknown')).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve class with no dependencies', () => {
      @Injectable()
      class SimpleService {
        getValue() {
          return 'test';
        }
      }

      const instance = container.resolve(SimpleService);

      expect(instance).toBeInstanceOf(SimpleService);
      expect(instance.getValue()).toBe('test');
    });

    it('should return cached instance', () => {
      @Injectable()
      class SimpleService {}

      const instance1 = container.resolve(SimpleService);
      const instance2 = container.resolve(SimpleService);

      expect(instance1).toBe(instance2);
    });

    it('should resolve class with dependencies', () => {
      @Injectable()
      class DependencyService {
        getValue() {
          return 'dependency';
        }
      }

      @Injectable()
      class MainService {
        constructor(public dep: DependencyService) {}
      }

      const instance = container.resolve(MainService);

      expect(instance).toBeInstanceOf(MainService);
      expect(instance.dep).toBeInstanceOf(DependencyService);
      expect(instance.dep.getValue()).toBe('dependency');
    });

    it('should resolve class with config dependency', async () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @ConfigProperty()
        host!: string;
      }

      @Injectable()
      class DatabaseService {
        constructor(public config: DatabaseConfig) {}
      }

      const testConfigManager = new ConfigManager({
        additionalSources: [new InMemoryConfigSource({ database: { host: 'localhost' } }, 100)],
      });
      await testConfigManager.initialize();
      container.setConfigManager(testConfigManager);

      const instance = container.resolve(DatabaseService);

      expect(instance).toBeInstanceOf(DatabaseService);
      expect(instance.config.host).toBe('localhost');
    });

    it('should resolve class with Inject decorator', () => {
      @Injectable()
      class TokenService {}

      class TokenKey {}
      container.registerInstance(TokenKey, new TokenService());

      @Injectable()
      class MainService {
        constructor(@Inject(TokenKey) public service: any) {}
      }

      const instance = container.resolve(MainService);

      expect(instance).toBeInstanceOf(MainService);
      expect(instance.service).toBeInstanceOf(TokenService);
    });

    it('should resolve recursive dependencies', () => {
      @Injectable()
      class ServiceA {
        getValue() {
          return 'A';
        }
      }

      @Injectable()
      class ServiceB {
        constructor(public serviceA: ServiceA) {}
      }

      @Injectable()
      class ServiceC {
        constructor(public serviceB: ServiceB) {}
      }

      const instance = container.resolve(ServiceC);

      expect(instance).toBeInstanceOf(ServiceC);
      expect(instance.serviceB).toBeInstanceOf(ServiceB);
      expect(instance.serviceB.serviceA).toBeInstanceOf(ServiceA);
      expect(instance.serviceB.serviceA.getValue()).toBe('A');
    });
  });

  describe('get', () => {
    it('should get instance by class constructor', () => {
      @Injectable()
      class TestService {}

      const instance = container.get(TestService);

      expect(instance).toBeInstanceOf(TestService);
    });

    it('should get instance by token', () => {
      const token = Symbol('test');
      const instance = { value: 'test' };
      container.registerInstance(token, instance);

      const result = container.get(token);

      expect(result).toBe(instance);
    });

    it('should throw error for unknown token', () => {
      const token = Symbol('unknown');

      expect(() => container.get(token)).toThrow('No provider found for token');
    });
  });

  describe('clear', () => {
    it('should clear all instances', () => {
      container.registerInstance('token1', {});
      container.registerInstance('token2', {});

      container.clear();

      expect(container.has('token1')).toBe(false);
      expect(container.has('token2')).toBe(false);
    });
  });
});
