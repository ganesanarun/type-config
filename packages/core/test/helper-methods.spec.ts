import 'reflect-metadata';
import { ConfigManager } from '../src/config-manager';
import {
  ConfigurationProperties,
  ConfigProperty,
  DefaultValue,
  Required,
  Validate,
} from '../src/decorators';

describe('ConfigManager Helper Methods', () => {
  let manager: ConfigManager;

  beforeEach(async () => {
    manager = new ConfigManager({
      configDir: './test/fixtures',
      profile: 'test',
    });
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('isConfigurationClass', () => {
    it('should return true for class with @DefaultValue', () => {
      class TestClass {
        @DefaultValue(10)
        timeout!: number;
      }

      // Access private method via type assertion
      const result = (manager as any).isConfigurationClass(TestClass);
      expect(result).toBe(true);
    });

    it('should return true for class with @Required', () => {
      class TestClass {
        @Required()
        host!: string;
      }

      const result = (manager as any).isConfigurationClass(TestClass);
      expect(result).toBe(true);
    });

    it('should return true for class with @Validate', () => {
      @Validate()
      class TestClass {
        host!: string;
      }

      const result = (manager as any).isConfigurationClass(TestClass);
      expect(result).toBe(true);
    });

    it('should return true for class with @ConfigProperty', () => {
      class TestClass {
        @ConfigProperty('host')
        hostname!: string;
      }

      const result = (manager as any).isConfigurationClass(TestClass);
      expect(result).toBe(true);
    });

    it('should return false for plain class without decorators', () => {
      class PlainClass {
        value!: string;
      }

      const result = (manager as any).isConfigurationClass(PlainClass);
      expect(result).toBe(false);
    });

    it('should return false for non-function types', () => {
      expect((manager as any).isConfigurationClass(null)).toBe(false);
      expect((manager as any).isConfigurationClass(undefined)).toBe(false);
      expect((manager as any).isConfigurationClass({})).toBe(false);
      expect((manager as any).isConfigurationClass('string')).toBe(false);
      expect((manager as any).isConfigurationClass(123)).toBe(false);
    });
  });

  describe('getAllProperties', () => {
    it('should return properties with @ConfigProperty', () => {
      class TestClass {
        @ConfigProperty('host')
        hostname!: string;

        @ConfigProperty('port')
        portNumber!: number;
      }

      const instance = new TestClass();
      const result = (manager as any).getAllProperties(instance, TestClass);

      expect(result.size).toBe(2);
      expect(result.get('hostname')).toBe('host');
      expect(result.get('portNumber')).toBe('port');
    });

    it('should include properties with @DefaultValue but no @ConfigProperty', () => {
      class TestClass {
        @ConfigProperty('host')
        hostname!: string;

        @DefaultValue(5432)
        port!: number;
      }

      const instance = new TestClass();
      const result = (manager as any).getAllProperties(instance, TestClass);

      expect(result.size).toBe(2);
      expect(result.get('hostname')).toBe('host');
      expect(result.get('port')).toBe('port'); // Uses property name
    });

    it('should include properties with @Required but no @ConfigProperty', () => {
      class TestClass {
        @ConfigProperty('host')
        hostname!: string;

        @Required()
        database!: string;
      }

      const instance = new TestClass();
      const result = (manager as any).getAllProperties(instance, TestClass);

      expect(result.size).toBe(2);
      expect(result.get('hostname')).toBe('host');
      expect(result.get('database')).toBe('database'); // Uses property name
    });

    it('should not duplicate properties', () => {
      class TestClass {
        @ConfigProperty('host')
        @DefaultValue('localhost')
        @Required()
        hostname!: string;
      }

      const instance = new TestClass();
      const result = (manager as any).getAllProperties(instance, TestClass);

      expect(result.size).toBe(1);
      expect(result.get('hostname')).toBe('host');
    });

    it('should handle class with no decorated properties', () => {
      class TestClass {
        value!: string;
      }

      const instance = new TestClass();
      const result = (manager as any).getAllProperties(instance, TestClass);

      expect(result.size).toBe(0);
    });
  });

  describe('getAllPropertiesForNestedClass', () => {
    it('should return properties with @ConfigProperty', () => {
      class NestedClass {
        @ConfigProperty('timeout')
        timeoutMs!: number;
      }

      const instance = new NestedClass();
      const configValue = { timeout: 5000 };
      const result = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        configValue
      );

      // Should include both the decorated property and the config value property
      expect(result.size).toBe(2);
      expect(result.get('timeoutMs')).toBe('timeout');
      expect(result.get('timeout')).toBe('timeout');
    });

    it('should include properties with @DefaultValue', () => {
      class NestedClass {
        @DefaultValue(10000)
        timeout!: number;
      }

      const instance = new NestedClass();
      const configValue = {};
      const result = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        configValue
      );

      expect(result.size).toBe(1);
      expect(result.get('timeout')).toBe('timeout');
    });

    it('should include properties with @Required', () => {
      class NestedClass {
        @Required()
        host!: string;
      }

      const instance = new NestedClass();
      const configValue = { host: 'localhost' };
      const result = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        configValue
      );

      expect(result.size).toBe(1);
      expect(result.get('host')).toBe('host');
    });

    it('should include properties present in config value', () => {
      class NestedClass {
        @DefaultValue(5432)
        port!: number;
      }

      const instance = new NestedClass();
      const configValue = { port: 3000, host: 'localhost', database: 'mydb' };
      const result = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        configValue
      );

      expect(result.size).toBe(3);
      expect(result.get('port')).toBe('port');
      expect(result.get('host')).toBe('host');
      expect(result.get('database')).toBe('database');
    });

    it('should not duplicate properties', () => {
      class NestedClass {
        @ConfigProperty('timeout')
        @DefaultValue(10000)
        @Required()
        timeoutMs!: number;
      }

      const instance = new NestedClass();
      const configValue = { timeout: 5000 };
      const result = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        configValue
      );

      // Should include both the decorated property and the config value property
      // but not duplicate the 'timeoutMs' key
      expect(result.size).toBe(2);
      expect(result.get('timeoutMs')).toBe('timeout');
      expect(result.get('timeout')).toBe('timeout');
    });

    it('should handle null or undefined config value', () => {
      class NestedClass {
        @DefaultValue(10)
        value!: number;
      }

      const instance = new NestedClass();
      
      const resultNull = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        null
      );
      expect(resultNull.size).toBe(1);
      expect(resultNull.get('value')).toBe('value');

      const resultUndefined = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        undefined
      );
      expect(resultUndefined.size).toBe(1);
      expect(resultUndefined.get('value')).toBe('value');
    });

    it('should handle array config value', () => {
      class NestedClass {
        @DefaultValue(10)
        value!: number;
      }

      const instance = new NestedClass();
      const configValue = [1, 2, 3];
      const result = (manager as any).getAllPropertiesForNestedClass(
        instance,
        NestedClass,
        configValue
      );

      // Arrays should not add their indices as properties
      expect(result.size).toBe(1);
      expect(result.get('value')).toBe('value');
    });
  });
});
