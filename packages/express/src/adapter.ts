import { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  ConfigManager,
  ConfigManagerOptions,
  ConfigurationBuilder,
  Container,
} from '@snow-tzu/type-config';

type Constructor<T = any> = new (...args: any[]) => T;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      config?: ConfigManager;
      container?: Container;
    }
  }
}

export interface ExpressConfigOptions extends ConfigManagerOptions {
  configClasses?: Constructor[];
  attachToRequest?: boolean;
}

/**
 * Express configuration wrapper
 */
export class ExpressConfig {
  constructor(
    public readonly configManager: ConfigManager,
    public readonly container: Container
  ) {}

  /**
   * Get Express middleware to attach config and container to requests
   */
  middleware(): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
      req.config = this.configManager;
      req.container = this.container;
      next();
    };
  }

  /**
   * Get a configuration class instance
   */
  get<T>(ConfigClass: Constructor<T>): T {
    return this.container.get(ConfigClass);
  }

  /**
   * Get configuration value by path
   */
  getValue<T = any>(path: string, defaultValue?: T): T {
    return this.configManager.get(path, defaultValue);
  }

  /**
   * Get active profile
   */
  getProfile(): string {
    return this.configManager.getProfile();
  }
}

/**
 * Create Express configuration with fluent API
 */
export async function createTypeConfig(options: ExpressConfigOptions = {}): Promise<ExpressConfig> {
  const builder = new ConfigurationBuilder();

  if (options.profile) {
    builder.withProfile(options.profile);
  }
  if (options.configDir) {
    builder.withConfigDir(options.configDir);
  }
  if (options.envPrefix) {
    builder.withEnvPrefix(options.envPrefix);
  }
  if (options.encryptionKey) {
    builder.withEncryption(options.encryptionKey);
  }
  if (options.validateOnBind !== undefined) {
    builder.withValidation(options.validateOnBind);
  }
  if (options.additionalSources) {
    options.additionalSources.forEach(source => builder.addSource(source));
  }
  if (options.configClasses) {
    builder.registerConfigs(options.configClasses);
  }

  const { configManager, container } = await builder.build();

  return new ExpressConfig(configManager, container);
}

/**
 * Express middleware factory for simple use cases
 */
export function configMiddleware(
  configManager: ConfigManager,
  container: Container
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.config = configManager;
    req.container = container;
    next();
  };
}
