import 'reflect-metadata';
import { ConfigManager } from '../src/config-manager';
import { ConfigurationProperties, ConfigProperty, DefaultValue } from '../src/decorators';

describe('Placeholder Resolution - Undefined Values', () => {
  let manager: ConfigManager;

  beforeEach(async () => {
    // Clear any existing env vars
    delete process.env.NONEXISTENT_VAR;
    
    manager = new ConfigManager({
      configDir: './test-config',
      enablePlaceholderResolution: true,
    });
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.dispose();
  });

  it('should resolve placeholder without fallback to undefined', async () => {
    @ConfigurationProperties('app')
    class AppConfig {
      @ConfigProperty()
      value!: string;
    }

    // Mock config with placeholder that has no fallback and env var doesn't exist
    (manager as any).config = {
      app: {
        value: undefined, // This is what ${NONEXISTENT_VAR} resolves to
      },
    };

    const config = manager.bind(AppConfig);

    // Should be undefined since the env var doesn't exist and there's no fallback
    expect(config.value).toBeUndefined();
  });

  it('should use @DefaultValue when placeholder resolves to undefined', async () => {
    @ConfigurationProperties('app')
    class AppConfig {
      @ConfigProperty()
      @DefaultValue('default-value')
      value!: string;
    }

    // Mock config where placeholder resolved to undefined
    (manager as any).config = {
      app: {
        // value is missing (placeholder resolved to undefined)
      },
    };

    const config = manager.bind(AppConfig);

    // Should use the @DefaultValue since the placeholder resolved to undefined
    expect(config.value).toBe('default-value');
  });

  it('should not create nested class instance when value is explicitly undefined from placeholder', async () => {
    class NestedConfig {
      @ConfigProperty()
      prop!: string;
    }

    @ConfigurationProperties('app')
    class AppConfig {
      @ConfigProperty()
      nested!: NestedConfig;
    }

    // Mock config where placeholder resolved to undefined
    (manager as any).config = {
      app: {
        nested: undefined, // Explicitly undefined from placeholder resolution
      },
    };

    const config = manager.bind(AppConfig);

    // Should be undefined, not a NestedConfig instance
    // because the nested class has no @DefaultValue or @Validate()
    expect(config.nested).toBeUndefined();
  });

  it('should create nested class instance with defaults when placeholder resolves to undefined', async () => {
    class NestedConfig {
      @ConfigProperty()
      @DefaultValue('default-prop')
      prop!: string;
    }

    @ConfigurationProperties('app')
    class AppConfig {
      @ConfigProperty()
      nested!: NestedConfig;
    }

    // Mock config where placeholder resolved to undefined
    (manager as any).config = {
      app: {
        // nested is missing (placeholder resolved to undefined)
      },
    };

    const config = manager.bind(AppConfig);

    // Should create instance because NestedConfig has @DefaultValue
    expect(config.nested).toBeInstanceOf(NestedConfig);
    expect(config.nested.prop).toBe('default-prop');
  });
});
