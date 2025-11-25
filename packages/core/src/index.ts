// Core exports
export * from './decorators';
export * from './sources';
export * from './config-manager';
export * from './container';
export * from './builder';

// Re-export commonly used types
export type {
  ConfigManagerOptions,
  ConfigChangeListener,
} from './config-manager';

export type { ConfigSource } from './sources';
