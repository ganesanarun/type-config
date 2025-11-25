import 'reflect-metadata';
import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
  Validate,
  Injectable,
  Inject,
  CONFIG_PREFIX_KEY,
  CONFIG_PROPERTIES_KEY,
  REQUIRED_PROPS_KEY,
  DEFAULTS_KEY,
  VALIDATE_KEY,
  INJECTABLE_KEY,
  INJECT_KEY,
} from '../src';

describe('decorators', () => {
  describe('ConfigurationProperties', () => {
    it('should set metadata with provided prefix', () => {
      @ConfigurationProperties('test.prefix')
      class TestConfig {}

      const metadata = Reflect.getMetadata(CONFIG_PREFIX_KEY, TestConfig);

      expect(metadata).toBe('test.prefix');
    });

    it('should work with nested prefix paths', () => {
      @ConfigurationProperties('app.database.primary')
      class DatabaseConfig {}

      const metadata = Reflect.getMetadata(CONFIG_PREFIX_KEY, DatabaseConfig);

      expect(metadata).toBe('app.database.primary');
    });
  });

  describe('ConfigProperty', () => {
    it('should register property with default path', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        host!: string;
      }

      const properties = Reflect.getMetadata(CONFIG_PROPERTIES_KEY, TestConfig);

      expect(properties).toEqual({ host: 'host' });
    });

    it('should register property with custom path', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty('customPath')
        host!: string;
      }

      const properties = Reflect.getMetadata(CONFIG_PROPERTIES_KEY, TestConfig);

      expect(properties).toEqual({ host: 'customPath' });
    });

    it('should register multiple properties', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        host!: string;

        @ConfigProperty('custom.port')
        port!: number;
      }

      const properties = Reflect.getMetadata(CONFIG_PROPERTIES_KEY, TestConfig);

      expect(properties).toEqual({
        host: 'host',
        port: 'custom.port',
      });
    });
  });

  describe('Required', () => {
    it('should mark property as required', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @Required()
        @ConfigProperty()
        host!: string;
      }

      const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, TestConfig);

      expect(requiredProps).toEqual(['host']);
    });

    it('should mark multiple properties as required', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @Required()
        @ConfigProperty()
        host!: string;

        @Required()
        @ConfigProperty()
        port!: number;
      }

      const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, TestConfig);

      expect(requiredProps).toEqual(['host', 'port']);
    });
  });

  describe('DefaultValue', () => {
    it('should set default value for property', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @DefaultValue('localhost')
        @ConfigProperty()
        host!: string;
      }

      const defaults = Reflect.getMetadata(DEFAULTS_KEY, TestConfig);

      expect(defaults).toEqual({ host: 'localhost' });
    });

    it('should set different types of default values', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @DefaultValue('localhost')
        @ConfigProperty()
        host!: string;

        @DefaultValue(3000)
        @ConfigProperty()
        port!: number;

        @DefaultValue(true)
        @ConfigProperty()
        enabled!: boolean;

        @DefaultValue(['item1', 'item2'])
        @ConfigProperty()
        items!: string[];
      }

      const defaults = Reflect.getMetadata(DEFAULTS_KEY, TestConfig);

      expect(defaults).toEqual({
        host: 'localhost',
        port: 3000,
        enabled: true,
        items: ['item1', 'item2'],
      });
    });
  });

  describe('Validate', () => {
    it('should mark class for validation', () => {
      @Validate()
      @ConfigurationProperties('test')
      class TestConfig {}

      const shouldValidate = Reflect.getMetadata(VALIDATE_KEY, TestConfig);

      expect(shouldValidate).toBe(true);
    });
  });

  describe('Injectable', () => {
    it('should mark class as injectable', () => {
      @Injectable()
      class TestService {}

      const isInjectable = Reflect.getMetadata(INJECTABLE_KEY, TestService);

      expect(isInjectable).toBe(true);
    });
  });

  describe('Inject', () => {
    it('should register injection token for constructor parameter', () => {
      class TokenClass {}

      @Injectable()
      class TestService {
        constructor(@Inject(TokenClass) dependency: TokenClass) {}
      }

      const injections = Reflect.getMetadata(INJECT_KEY, TestService);

      expect(injections).toEqual([TokenClass]);
    });

    it('should register multiple injection tokens', () => {
      class Token1 {}
      class Token2 {}

      @Injectable()
      class TestService {
        constructor(
          @Inject(Token1) dep1: Token1,
          @Inject(Token2) dep2: Token2
        ) {}
      }

      const injections = Reflect.getMetadata(INJECT_KEY, TestService);

      expect(injections).toEqual([Token1, Token2]);
    });
  });

  describe('decorator combinations', () => {
    it('should work with all decorators combined', () => {
      @Validate()
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @Required()
        @ConfigProperty()
        host!: string;

        @DefaultValue(5432)
        @ConfigProperty('db.port')
        port!: number;

        @ConfigProperty()
        username!: string;
      }

      expect(Reflect.getMetadata(CONFIG_PREFIX_KEY, DatabaseConfig)).toBe('database');
      expect(Reflect.getMetadata(VALIDATE_KEY, DatabaseConfig)).toBe(true);
      expect(Reflect.getMetadata(CONFIG_PROPERTIES_KEY, DatabaseConfig)).toEqual({
        host: 'host',
        port: 'db.port',
        username: 'username',
      });
      expect(Reflect.getMetadata(REQUIRED_PROPS_KEY, DatabaseConfig)).toEqual(['host']);
      expect(Reflect.getMetadata(DEFAULTS_KEY, DatabaseConfig)).toEqual({ port: 5432 });
    });
  });
});
