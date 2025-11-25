import 'reflect-metadata';
import { ConfigManager } from './config-manager';
import { CONFIG_PREFIX_KEY, INJECT_KEY, INJECTABLE_KEY } from './decorators';

type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Simple Dependency Injection Container
 */
export class Container {
  private instances: Map<any, any> = new Map();
  private configManager?: ConfigManager;

  setConfigManager(configManager: ConfigManager): void {
    this.configManager = configManager;
  }

  /**
   * Register a configuration class
   */
  registerConfig<T>(ConfigClass: Constructor<T>): void {
    if (!this.configManager) {
      throw new Error('ConfigManager not set in container');
    }
    const instance = this.configManager.bind(ConfigClass);
    this.instances.set(ConfigClass, instance);
  }

  /**
   * Register a service class
   */
  register<T>(ServiceClass: Constructor<T>): void {
    if (!Reflect.getMetadata(INJECTABLE_KEY, ServiceClass)) {
      throw new Error(`Class ${ServiceClass.name} must be decorated with @Injectable`);
    }
  }

  /**
   * Register a specific instance with a token
   */
  registerInstance<T>(token: any, instance: T): void {
    this.instances.set(token, instance);
  }

  /**
   * Check if a token is registered
   */
  has(token: any): boolean {
    return this.instances.has(token);
  }

  /**
   * Resolve a class with dependency injection
   */
  resolve<T>(target: Constructor<T>): T {
    // Return cached instance if exists
    if (this.instances.has(target)) {
      return this.instances.get(target);
    }

    // Get constructor parameter types
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const injections = Reflect.getMetadata(INJECT_KEY, target) || [];

    // Resolve dependencies
    const dependencies = paramTypes.map((paramType: any, index: number) => {
      const token = injections[index] || paramType;

      // Check if it's a configuration class
      if (Reflect.getMetadata(CONFIG_PREFIX_KEY, token)) {
        if (!this.instances.has(token)) {
          this.registerConfig(token);
        }
        return this.instances.get(token);
      }

      // Recursively resolve dependencies
      return this.resolve(token);
    });

    // Create instance
    const instance = new target(...dependencies);
    this.instances.set(target, instance);
    return instance;
  }

  /**
   * Get an instance from the container
   */
  get<T>(token: Constructor<T> | string | symbol): T {
    if (typeof token === 'function') {
      return this.resolve(token);
    }

    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    throw new Error(`No provider found for token: ${String(token)}`);
  }

  /**
   * Clear all instances
   */
  clear(): void {
    this.instances.clear();
  }
}
