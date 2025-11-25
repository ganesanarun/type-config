import * as path from 'path';
import * as chokidar from 'chokidar';
import { validateSync, ValidationError } from 'class-validator';
import {
  CONFIG_PREFIX_KEY,
  CONFIG_PROPERTIES_KEY,
  DEFAULTS_KEY,
  REQUIRED_PROPS_KEY,
  VALIDATE_KEY,
} from './decorators';
import { ConfigSource, EncryptionHelper, EnvConfigSource, FileConfigSource } from './sources';

export interface ConfigManagerOptions {
  profile?: string;
  configDir?: string;
  envPrefix?: string;
  additionalSources?: ConfigSource[];
  enableHotReload?: boolean;
  encryptionKey?: string;
  validateOnBind?: boolean;
}

export type ConfigChangeListener = (newConfig: Record<string, any>) => void;

/**
 * Core Configuration Manager with hot reload and validation support
 */
export class ConfigManager {
  private config: Record<string, any> = {};
  private sources: ConfigSource[] = [];
  private profile: string;
  private initialized = false;
  private configInstances: Map<any, any> = new Map();
  private watcher?: chokidar.FSWatcher;
  private changeListeners: ConfigChangeListener[] = [];
  private encryptionHelper?: EncryptionHelper;
  private validateOnBind: boolean;

  constructor(private options: ConfigManagerOptions = {}) {
    this.profile = options.profile || process.env.NODE_ENV || 'development';
    this.validateOnBind = options.validateOnBind ?? true;

    if (options.encryptionKey) {
      this.encryptionHelper = new EncryptionHelper(options.encryptionKey);
    }
  }

  /**
   * Initialize configuration from all sources
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const configDir = this.options.configDir || './config';
    console.log(`[ConfigManager] Initializing with configDir: ${configDir}, profile: ${this.profile}`);

    // Add default sources with priority
    this.sources.push(
      new FileConfigSource(path.join(configDir, 'application.json'), 100),
      new FileConfigSource(path.join(configDir, 'application.yml'), 100),
      new FileConfigSource(path.join(configDir, `application-${this.profile}.json`), 150),
      new FileConfigSource(path.join(configDir, `application-${this.profile}.yml`), 150),
      new EnvConfigSource(this.options.envPrefix, 200)
    );
    
    console.log(`[ConfigManager] Added ${this.sources.length} config sources`);

    // Add additional sources
    if (this.options.additionalSources) {
      this.sources.push(...this.options.additionalSources);
    }

    // Sort by priority (lower first)
    this.sources.sort((a, b) => a.priority - b.priority);

    // Load all sources and merge
    await this.reload();

    // Setup hot reload if enabled
    if (this.options.enableHotReload && this.options.configDir) {
      this.setupHotReload();
    }

    this.initialized = true;
  }

  /**
   * Reload configuration from all sources
   */
  private async reload(): Promise<void> {
    const newConfig: Record<string, any> = {};

    for (const source of this.sources) {
      try {
        const data = await source.load();
        console.log(`[ConfigManager] Loading source: ${source.name}, data:`, JSON.stringify(data, null, 2));
        this.deepMerge(newConfig, data);
        console.log(`[ConfigManager] After merge, config:`, JSON.stringify(newConfig, null, 2));
      } catch (err) {
        console.warn(`Failed to load config source ${source.name}:`, err);
      }
    }

    // Decrypt encrypted values if encryption is enabled
    if (this.encryptionHelper) {
      this.config = this.encryptionHelper.decryptObject(newConfig);
    } else {
      this.config = newConfig;
    }

    // Clear cached instances to force rebinding
    this.configInstances.clear();

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Setup file watcher for hot reload
   */
  private setupHotReload(): void {
    const configDir = this.options.configDir || './config';

    this.watcher = chokidar.watch(configDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', async (filePath: string) => {
      console.log(`Config file changed: ${filePath}, reloading...`);
      await this.reload();
    });
  }

  /**
   * Add a change listener
   */
  onChange(listener: ConfigChangeListener): () => void {
    this.changeListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all change listeners
   */
  private notifyListeners(): void {
    for (const listener of this.changeListeners) {
      try {
        listener({ ...this.config });
      } catch (err) {
        console.error('Error in config change listener:', err);
      }
    }
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue as T;
      }
    }

    return value as T;
  }

  /**
   * Get all configuration
   */
  getAll(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Get active profile
   */
  getProfile(): string {
    return this.profile;
  }

  /**
   * Bind configuration to a class instance (Spring-like @ConfigurationProperties)
   */
  bind<T>(ConfigClass: new () => T): T {
    // Check if already instantiated (singleton)
    if (this.configInstances.has(ConfigClass)) {
      return this.configInstances.get(ConfigClass);
    }

    const prefix = Reflect.getMetadata(CONFIG_PREFIX_KEY, ConfigClass);
    if (!prefix) {
      throw new Error(`Class ${ConfigClass.name} must be decorated with @ConfigurationProperties`);
    }

    const instance = new ConfigClass();
    const properties = Reflect.getMetadata(CONFIG_PROPERTIES_KEY, ConfigClass) || {};
    const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, ConfigClass) || [];
    const defaults = Reflect.getMetadata(DEFAULTS_KEY, ConfigClass) || {};
    const shouldValidate = Reflect.getMetadata(VALIDATE_KEY, ConfigClass);

    // Bind properties
    for (const [propertyKey, propertyPath] of Object.entries(properties)) {
      const fullPath = `${prefix}.${propertyPath}`;
      const defaultVal = defaults[propertyKey];
      const value = this.get(fullPath, defaultVal);

      if (value !== undefined) {
        (instance as any)[propertyKey] = this.convertType(value, instance, propertyKey);
      }
    }

    // Validate required properties
    for (const prop of requiredProps) {
      if ((instance as any)[prop] === undefined || (instance as any)[prop] === null) {
        throw new Error(`Required configuration property '${prefix}.${prop}' is missing`);
      }
    }

    // Validate using class-validator if enabled
    if (this.validateOnBind && shouldValidate) {
      this.validateInstanceSync(instance, ConfigClass.name);
    }

    // Cache instance
    this.configInstances.set(ConfigClass, instance);
    return instance;
  }

  /**
   * Validate configuration instance using class-validator
   */
  private validateInstanceSync(instance: any, className: string): void {
    const errors = validateSync(instance);
    if (errors.length > 0) {
      const messages = this.formatValidationErrors(errors);
      throw new Error(`Validation failed for ${className}:\n${messages}`);
    }
  }

  /**
   * Format validation errors for display
   */
  private formatValidationErrors(errors: ValidationError[]): string {
    return errors
      .map(error => {
        const constraints = error.constraints ? Object.values(error.constraints).join(', ') : '';
        return `  - ${error.property}: ${constraints}`;
      })
      .join('\n');
  }

  /**
   * Convert value to appropriate type based on property type
   */
  private convertType(value: any, instance: any, propertyKey: string): any {
    const type = Reflect.getMetadata('design:type', instance, propertyKey);

    if (!type) return value;

    switch (type.name) {
      case 'Number':
        return Number(value);
      case 'Boolean':
        return value === 'true' || value === true;
      case 'String':
        return String(value);
      case 'Array':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
    this.changeListeners = [];
    this.configInstances.clear();
  }
}
