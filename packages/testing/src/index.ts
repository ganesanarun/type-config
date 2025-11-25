import { ConfigManager, InMemoryConfigSource, ConfigurationBuilder } from '@snow-tzu/type-config';

type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Create a mock ConfigManager for testing with in-memory config
 */
export async function createMockConfig(config: Record<string, any> = {}): Promise<ConfigManager> {
  const builder = new ConfigurationBuilder()
    .addSource(new InMemoryConfigSource(config, 1000));
  
  const { configManager } = await builder.build();
  return configManager;
}

/**
 * Create a mock configuration with specific config classes
 */
export async function createMockConfigWithClasses(
  config: Record<string, any>,
  configClasses: Constructor[]
) {
  const builder = new ConfigurationBuilder()
    .addSource(new InMemoryConfigSource(config, 1000))
    .registerConfigs(configClasses);
  
  return await builder.build();
}

/**
 * Mock config factory for testing individual config classes
 */
export function mockConfigClass<T extends object>(
  ConfigClass: Constructor<T>,
  overrides: Partial<T> = {}
): T {
  const instance = new ConfigClass();
  return Object.assign(instance, overrides);
}

export { InMemoryConfigSource };
