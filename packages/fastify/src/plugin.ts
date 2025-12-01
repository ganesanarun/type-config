import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import {
  ConfigManager,
  ConfigManagerOptions,
  ConfigurationBuilder,
  Container,
} from '@snow-tzu/type-config';

type Constructor<T = any> = new (...args: any[]) => T;

export interface FastifyConfigOptions extends ConfigManagerOptions {
  configClasses?: Constructor[];
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    config: ConfigManager;
    container: Container;
  }

  interface FastifyRequest {
    config: ConfigManager;
    container: Container;
  }
}

/**
 * Fastify Type Config Plugin
 */
const typeConfigPlugin: FastifyPluginAsync<FastifyConfigOptions> = async (
  fastify: FastifyInstance,
  options: FastifyConfigOptions
) => {
  // Build configuration
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

  // Decorate Fastify instance
  fastify.decorate('config', configManager);
  fastify.decorate('container', container);

  // Add hook to attach to requests
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.config = configManager;
    request.container = container;
  });

  // Add onClose hook to cleanup
  fastify.addHook('onClose', async () => {
    await configManager.dispose();
  });
};

/**
 * Export as Fastify plugin
 */
export const fastifyTypeConfig = fp(typeConfigPlugin, {
  fastify: '4.x',
  name: '@snow-tzu/config-fastify',
});

/**
 * Helper to create config outside the plugin context
 */
export async function createFastifyConfig(options: FastifyConfigOptions = {}) {
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

  return await builder.build();
}
