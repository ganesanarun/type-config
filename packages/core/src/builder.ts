import { ConfigManager, ConfigManagerOptions } from './config-manager';
import { Container } from './container';
import { ConfigSource } from './sources';

type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Fluent builder for creating ConfigManager and Container instances
 */
export class ConfigurationBuilder {
  private options: ConfigManagerOptions = {};
  private configClasses: Constructor[] = [];

  /**
   * Set the active profile (e.g., 'development', 'production')
   */
  withProfile(profile: string): this {
    this.options.profile = profile;
    return this;
  }

  /**
   * Set the configuration directory
   */
  withConfigDir(dir: string): this {
    this.options.configDir = dir;
    return this;
  }

  /**
   * Set environment variable prefix for filtering
   */
  withEnvPrefix(prefix: string): this {
    this.options.envPrefix = prefix;
    return this;
  }

  /**
   * Enable hot reload of configuration files
   */
  withHotReload(enabled: boolean = true): this {
    this.options.enableHotReload = enabled;
    return this;
  }

  /**
   * Set encryption key for decrypting sensitive values
   */
  withEncryption(key: string): this {
    this.options.encryptionKey = key;
    return this;
  }

  /**
   * Enable/disable validation on bind
   */
  withValidation(enabled: boolean = true): this {
    this.options.validateOnBind = enabled;
    return this;
  }

  /**
   * Add a custom configuration source
   */
  addSource(source: ConfigSource): this {
    if (!this.options.additionalSources) {
      this.options.additionalSources = [];
    }
    this.options.additionalSources.push(source);
    return this;
  }

  /**
   * Register a configuration class to be bound
   */
  registerConfig(ConfigClass: Constructor): this {
    this.configClasses.push(ConfigClass);
    return this;
  }

  /**
   * Register multiple configuration classes
   */
  registerConfigs(configClasses: Constructor[]): this {
    this.configClasses.push(...configClasses);
    return this;
  }

  /**
   * Build and initialize the configuration system
   */
  async build(): Promise<{ configManager: ConfigManager; container: Container }> {
    const configManager = new ConfigManager(this.options);
    await configManager.initialize();

    const container = new Container();
    container.setConfigManager(configManager);

    // Register all config classes
    for (const ConfigClass of this.configClasses) {
      container.registerConfig(ConfigClass);
    }

    return { configManager, container };
  }

  /**
   * Build without a container (config manager only)
   */
  async buildConfigOnly(): Promise<ConfigManager> {
    const configManager = new ConfigManager(this.options);
    await configManager.initialize();
    return configManager;
  }
}
