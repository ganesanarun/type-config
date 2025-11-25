import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CONFIG_PREFIX_KEY, ConfigManager, ConfigManagerOptions } from '@snow-tzu/type-config';

type Constructor<T = any> = new (...args: any[]) => T;

export interface TypeConfigModuleOptions extends ConfigManagerOptions {
  isGlobal?: boolean;
}

export interface TypeConfigAsyncOptions {
  isGlobal?: boolean;
  useFactory: (...args: any[]) => Promise<ConfigManagerOptions> | ConfigManagerOptions;
  inject?: any[];
}

/**
 * Token for ConfigManager in NestJS DI
 */
export const CONFIG_MANAGER_TOKEN = Symbol('CONFIG_MANAGER');

/**
 * Type Config Module for NestJS with native DI integration
 * Inspired by Spring Boot's configuration management
 */
@Module({})
export class TypeConfigModule {
  /**
   * Configure the module synchronously
   */
  static forRoot(options: TypeConfigModuleOptions = {}): DynamicModule {
    const configManagerProvider: Provider = {
      provide: CONFIG_MANAGER_TOKEN,
      useFactory: async () => {
        console.log('[TypeConfigModule] Creating ConfigManager with options:', options);
        const configManager = new ConfigManager(options);
        console.log('[TypeConfigModule] Calling initialize...');
        await configManager.initialize();
        console.log('[TypeConfigModule] Initialize complete');
        return configManager;
      },
    };

    return {
      module: TypeConfigModule,
      global: options.isGlobal ?? true,
      providers: [configManagerProvider],
      exports: [configManagerProvider],
    };
  }

  /**
   * Configure the module asynchronously
   */
  static forRootAsync(options: TypeConfigAsyncOptions): DynamicModule {
    const configManagerProvider: Provider = {
      provide: CONFIG_MANAGER_TOKEN,
      useFactory: async (...args: any[]) => {
        const configOptions = await options.useFactory(...args);
        const configManager = new ConfigManager(configOptions);
        await configManager.initialize();
        return configManager;
      },
      inject: options.inject || [],
    };

    return {
      module: TypeConfigModule,
      global: options.isGlobal ?? true,
      providers: [configManagerProvider],
      exports: [configManagerProvider],
    };
  }

  /**
   * Register specific configuration classes for a feature module
   */
  static forFeature(configClasses: Constructor[]): DynamicModule {
    const providers: Provider[] = configClasses.map(ConfigClass => {
      const prefix = Reflect.getMetadata(CONFIG_PREFIX_KEY, ConfigClass);
      if (!prefix) {
        throw new Error(
          `Class ${ConfigClass.name} must be decorated with @ConfigurationProperties`
        );
      }

      return {
        provide: ConfigClass,
        useFactory: (configManager: ConfigManager) => {
          return configManager.bind(ConfigClass);
        },
        inject: [CONFIG_MANAGER_TOKEN],
      };
    });

    return {
      module: TypeConfigModule,
      providers,
      exports: providers,
    };
  }
}
