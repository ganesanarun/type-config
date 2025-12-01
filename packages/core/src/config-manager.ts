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
import { PlaceholderResolver } from './placeholder-resolver';
import { MapBinder } from './map-binder';

export interface ConfigManagerOptions {
  profile?: string;
  configDir?: string;
  envPrefix?: string;
  additionalSources?: ConfigSource[];
  enableHotReload?: boolean;
  encryptionKey?: string;
  validateOnBind?: boolean;
  enablePlaceholderResolution?: boolean;
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
  private placeholderResolver: PlaceholderResolver;
  private enablePlaceholderResolution: boolean;
  private mapBinder: MapBinder;

  constructor(private options: ConfigManagerOptions = {}) {
    this.profile = options.profile || process.env.NODE_ENV || 'development';
    this.validateOnBind = options.validateOnBind ?? true;
    this.enablePlaceholderResolution = options.enablePlaceholderResolution ?? true;
    this.placeholderResolver = new PlaceholderResolver();
    this.mapBinder = new MapBinder();

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
    // console.log(`[ConfigManager] Initializing with configDir: ${configDir}, profile: ${this.profile}`);

    // Add default sources with priority
    this.sources.push(
      new FileConfigSource(path.join(configDir, 'application.json'), 100),
      new FileConfigSource(path.join(configDir, 'application.yml'), 100),
      new FileConfigSource(path.join(configDir, `application-${this.profile}.json`), 150),
      new FileConfigSource(path.join(configDir, `application-${this.profile}.yml`), 150),
      new EnvConfigSource(this.options.envPrefix, 200)
    );
    
    // console.log(`[ConfigManager] Added ${this.sources.length} config sources`);

    // Add additional sources
    if (this.options.additionalSources) {
      this.sources.push(...this.options.additionalSources);
    }

    // Sort by priority (lower first)
    this.sources.sort((a, b) => a.priority - b.priority);

    // Load all sources and merge
    await this.reload();

    // Set up hot reload if enabled
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

    // Step 1: Load and merge all sources (including EnvConfigSource with underscore-based resolution)
    for (const source of this.sources) {
      try {
        const data = await source.load();
        // console.log(`[ConfigManager] Loading source: ${source.name}, data:`, JSON.stringify(data, null, 2));
        this.deepMerge(newConfig, data);
        // console.log(`[ConfigManager] After merge, config:`, JSON.stringify(newConfig, null, 2));
      } catch (err) {
        console.warn(`Failed to load config source ${source.name}:`, err);
      }
    }

    // Step 2: Resolve explicit environment variable placeholders if enabled
    // This happens AFTER merging all sources (including underscore-based ENV resolution)
    // Underscore-based ENV vars (from EnvConfigSource) take precedence over file values
    // Then explicit placeholders are resolved, which can reference any ENV var
    let resolvedConfig = newConfig;
    if (this.enablePlaceholderResolution) {
      // console.log('[ConfigManager] Resolving explicit placeholders...');
      resolvedConfig = this.resolveEnvironmentVariables(newConfig);
      // console.log('[ConfigManager] After placeholder resolution:', JSON.stringify(resolvedConfig, null, 2));
    }

    // Step 3: Decrypt encrypted values if encryption is enabled
    if (this.encryptionHelper) {
      this.config = this.encryptionHelper.decryptObject(resolvedConfig);
    } else {
      this.config = resolvedConfig;
    }

    // Clearly cached instances to force rebinding
    this.configInstances.clear();

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Resolve environment variable placeholders in configuration
   * @param config - Configuration object with potential placeholders
   * @returns Configuration with placeholders resolved
   */
  private resolveEnvironmentVariables(config: Record<string, any>): Record<string, any> {
    return this.placeholderResolver.resolveObject(config);
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
   * 
   * Supports:
   * - Nested configuration classes with full decorator support
   * - @DefaultValue, @Required, and @Validate() decorators at all nesting levels
   * - Optional @ConfigProperty when property names match configuration keys
   * - Map and Record types for dynamic key-value structures
   * 
   * @param ConfigClass - The configuration class constructor
   * @returns Bound and validated configuration instance
   * @throws Error if required properties are missing or validation fails
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
    const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, ConfigClass) || [];
    const defaults = Reflect.getMetadata(DEFAULTS_KEY, ConfigClass) || {};
    const shouldValidate = Reflect.getMetadata(VALIDATE_KEY, ConfigClass);

    // Get all properties (decorated and undecorated)
    const allProperties = this.getAllProperties(instance, ConfigClass);

    // Bind properties
    for (const [propertyKey, propertyPath] of allProperties) {
      const fullPath = `${prefix}.${propertyPath}`;
      const defaultVal = defaults[propertyKey];
      const value = this.get(fullPath, defaultVal);

      // Always call convertAndBindType for nested configuration classes
      // even if value is undefined, so they can be instantiated with defaults
      const type = Reflect.getMetadata('design:type', instance as any, propertyKey);
      const isNestedClass = type && this.isConfigurationClass(type);
      
      if (value !== undefined || isNestedClass) {
        (instance as any)[propertyKey] = this.convertAndBindType(value, instance, propertyKey);
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
  private formatValidationErrors(errors: ValidationError[], prefix = ''): string {
    return errors
      .map(error => {
        const constraints = error.constraints ? Object.values(error.constraints).join(', ') : '';
        let message = `  ${prefix}- ${error.property}: ${constraints}`;
        
        // Handle nested validation errors
        if (error.children && error.children.length > 0) {
          const childMessages = this.formatValidationErrors(error.children, prefix + '  ');
          message += '\n' + childMessages;
        }
        
        return message;
      })
      .join('\n');
  }

  /**
   * Check if a type is a configuration class that should be recursively bound
   * @param type - The type to check
   * @returns true if the type is a configuration class with decorators
   */
  private isConfigurationClass(type: any): boolean {
    if (!type || typeof type !== 'function') {
      return false;
    }

    // Check if it has any configuration-related metadata
    const hasDefaults = Reflect.hasMetadata(DEFAULTS_KEY, type);
    const hasRequired = Reflect.hasMetadata(REQUIRED_PROPS_KEY, type);
    const hasValidate = Reflect.hasMetadata(VALIDATE_KEY, type);
    const hasConfigProps = Reflect.hasMetadata(CONFIG_PROPERTIES_KEY, type);

    return hasDefaults || hasRequired || hasValidate || hasConfigProps;
  }

  /**
   * Get all properties to bind for a configuration class
   * Includes both decorated properties and properties with defaults or required metadata
   * @param instance - The class instance
   * @param ConfigClass - The class constructor
   * @returns Map of property keys to configuration paths
   */
  private getAllProperties(instance: any, ConfigClass: any): Map<string, string> {
    const properties = Reflect.getMetadata(CONFIG_PROPERTIES_KEY, ConfigClass) || {};
    const result = new Map<string, string>();

    // Add explicitly decorated properties
    for (const [key, path] of Object.entries(properties)) {
      result.set(key, path as string);
    }

    // For nested classes, also check for properties that might not have @ConfigProperty
    // but have other decorators like @DefaultValue or @Required
    const defaults = Reflect.getMetadata(DEFAULTS_KEY, ConfigClass) || {};
    const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, ConfigClass) || [];

    for (const key of Object.keys(defaults)) {
      if (!result.has(key)) {
        result.set(key, key); // Use property name as path
      }
    }

    for (const key of requiredProps) {
      if (!result.has(key)) {
        result.set(key, key);
      }
    }

    return result;
  }

  /**
   * Get all properties for a nested class during binding
   * Includes decorated properties, properties with defaults/required, and properties present in config
   * @param instance - The nested class instance
   * @param NestedClass - The nested class constructor
   * @param configValue - The configuration value object
   * @returns Map of property keys to configuration paths
   */
  private getAllPropertiesForNestedClass(
    instance: any,
    NestedClass: any,
    configValue: any
  ): Map<string, string> {
    const properties = Reflect.getMetadata(CONFIG_PROPERTIES_KEY, NestedClass) || {};
    const result = new Map<string, string>();

    // Add explicitly decorated properties
    for (const [key, path] of Object.entries(properties)) {
      result.set(key, path as string);
    }

    // Add properties with @DefaultValue
    const defaults = Reflect.getMetadata(DEFAULTS_KEY, NestedClass) || {};
    for (const key of Object.keys(defaults)) {
      if (!result.has(key)) {
        result.set(key, key);
      }
    }

    // Add properties with @Required
    const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, NestedClass) || [];
    for (const key of requiredProps) {
      if (!result.has(key)) {
        result.set(key, key);
      }
    }

    // Add properties present in the configuration value
    if (configValue && typeof configValue === 'object' && !Array.isArray(configValue)) {
      for (const key of Object.keys(configValue)) {
        if (!result.has(key)) {
          result.set(key, key);
        }
      }
    }

    return result;
  }

  /**
   * Bind a nested configuration class recursively
   * @param value - The configuration value object
   * @param NestedClass - The nested class constructor
   * @param propertyPath - The property path for error messages
   * @returns The bound nested class instance
   */
  private bindNestedClass(value: any, NestedClass: new () => any, propertyPath: string): any {
    // If value is null/undefined, check if we should create an instance with defaults
    // We create an instance if:
    // 1. Validation is enabled (validateOnBind) AND the nested class has @Validate()
    // 2. The nested class has @DefaultValue decorators (to apply defaults)
    // Otherwise return the value as-is for backward compatibility
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const shouldValidate = Reflect.getMetadata(VALIDATE_KEY, NestedClass);
      const defaults = Reflect.getMetadata(DEFAULTS_KEY, NestedClass) || {};
      const hasDefaults = Object.keys(defaults).length > 0;
      
      // Create an instance if:
      // - Validation is enabled AND nested class has @Validate() (to avoid validation errors)
      // - OR nested class has defaults (to apply them)
      // This handles cases where:
      // - YAML has "api:" with no properties (becomes null)
      // - YAML is missing the key entirely (becomes undefined)
      const shouldCreateInstance = 
        (this.validateOnBind && shouldValidate) || 
        hasDefaults;
        
      if (shouldCreateInstance && (value === null || value === undefined)) {
        value = {}; // Create empty object to trigger instance creation
      } else {
        return value; // Return as-is for backward compatibility
      }
    }

    const instance = new NestedClass();
    const defaults = Reflect.getMetadata(DEFAULTS_KEY, NestedClass) || {};
    
    // Get all properties (decorated and undecorated)
    const allProps = this.getAllPropertiesForNestedClass(instance, NestedClass, value);
    
    // Bind each property
    for (const [propKey, propPath] of allProps) {
      const defaultVal = defaults[propKey];
      const propValue = value[propPath] !== undefined ? value[propPath] : defaultVal;
      
      // Always call convertAndBindType for nested configuration classes
      // even if propValue is undefined, so they can be instantiated with defaults
      const type = Reflect.getMetadata('design:type', instance, propKey);
      const isNestedClass = type && this.isConfigurationClass(type);
      
      if (propValue !== undefined || isNestedClass) {
        // Recursively convert and bind the property
        (instance as any)[propKey] = this.convertAndBindType(propValue, instance, propKey);
      }
    }

    // Validate required properties
    const requiredProps = Reflect.getMetadata(REQUIRED_PROPS_KEY, NestedClass) || [];
    for (const prop of requiredProps) {
      if ((instance as any)[prop] === undefined || (instance as any)[prop] === null) {
        throw new Error(`Required configuration property '${propertyPath}.${prop}' is missing`);
      }
    }

    // Validate with class-validator if needed
    const shouldValidate = Reflect.getMetadata(VALIDATE_KEY, NestedClass);
    if (this.validateOnBind && shouldValidate) {
      const errors = validateSync(instance);
      if (errors.length > 0) {
        const messages = this.formatValidationErrors(errors);
        throw new Error(`Validation failed for ${NestedClass.name} at path '${propertyPath}':\n${messages}`);
      }
    }

    return instance;
  }

  /**
   * Convert value to appropriate type based on property type and bind nested classes
   * 
   * Handles:
   * - Primitive types (Number, Boolean, String, Array)
   * - Map types (converted from plain objects)
   * - Record types (kept as plain objects)
   * - Nested configuration classes (recursively bound with decorator support)
   * 
   * @param value - The configuration value to convert
   * @param instance - The parent class instance
   * @param propertyKey - The property key being bound
   * @returns The converted and bound value
   */
  private convertAndBindType(value: any, instance: any, propertyKey: string): any {
    const type = Reflect.getMetadata('design:type', instance, propertyKey);

    if (!type) return value;

    // Handle Map type
    if (type === Map) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Cannot bind primitive value to Map<string, T> for property '${propertyKey}'`);
      }
      
      // Convert object to Map
      const map = this.mapBinder.objectToMap(value);
      
      // Note: Automatic validation of Map entries is NOT supported.
      // This is a limitation of class-validator, which requires known properties
      // at compile time. Map entries must be validated manually if needed.
      
      return map;
    }

    // Handle Record type (design:type will be Object)
    // Record types are left as plain objects (not converted to Map)
    // Note: Automatic validation of Record entries is NOT supported.
    // This is a limitation of class-validator, which requires known properties
    // at compile time. Record entries must be validated manually if needed.
    if (type === Object && this.mapBinder.isRecordProperty(instance, propertyKey)) {
      // Keep as plain object
      return value;
    }

    // Handle nested configuration class
    if (this.isConfigurationClass(type)) {
      return this.bindNestedClass(value, type, propertyKey);
    }

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
