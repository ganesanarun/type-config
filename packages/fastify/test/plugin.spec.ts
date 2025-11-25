import 'reflect-metadata';
import { createFastifyConfig } from '../src';
import { InMemoryConfigSource, ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config';

describe('Fastify Plugin', () => {
  describe('createFastifyConfig', () => {
    const createdManagers: any[] = [];

    afterEach(async () => {
      for (const manager of createdManagers) {
        await manager.dispose();
      }
      createdManagers.length = 0;
    });

    it('should create config manager and container', async () => {
      const result = await createFastifyConfig();
      createdManagers.push(result.configManager);

      expect(result.configManager).toBeDefined();
      expect(result.container).toBeDefined();
    });

    it('should apply profile option', async () => {
      const result = await createFastifyConfig({ profile: 'production' });
      createdManagers.push(result.configManager);

      expect(result.configManager.getProfile()).toBe('production');
    });

    it('should apply config directory option', async () => {
      const result = await createFastifyConfig({ configDir: './config' });
      createdManagers.push(result.configManager);

      expect(result.configManager).toBeDefined();
    });

    it('should apply env prefix option', async () => {
      const result = await createFastifyConfig({ envPrefix: 'APP_' });
      createdManagers.push(result.configManager);

      expect(result.configManager).toBeDefined();
    });

    it('should apply hot reload option', async () => {
      const result = await createFastifyConfig({ enableHotReload: true });
      createdManagers.push(result.configManager);

      expect(result.configManager).toBeDefined();
    });

    it('should apply encryption key option', async () => {
      const result = await createFastifyConfig({ encryptionKey: '12345678901234567890123456789012' });
      createdManagers.push(result.configManager);

      expect(result.configManager).toBeDefined();
    });

    it('should apply validation option', async () => {
      const result = await createFastifyConfig({ validateOnBind: false });
      createdManagers.push(result.configManager);

      expect(result.configManager).toBeDefined();
    });

    it('should add additional sources', async () => {
      const source = new InMemoryConfigSource({ test: 'value' }, 100);

      const result = await createFastifyConfig({ additionalSources: [source] });
      createdManagers.push(result.configManager);

      expect(result.configManager.get('test')).toBe('value');
    });

    it('should register config classes', async () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @ConfigProperty()
        host!: string;
      }

      const result = await createFastifyConfig({
        configClasses: [DatabaseConfig],
        additionalSources: [new InMemoryConfigSource({ database: { host: 'localhost' } }, 100)],
      });
      createdManagers.push(result.configManager);

      expect(result.container.has(DatabaseConfig)).toBe(true);
      const config = result.container.get(DatabaseConfig);
      expect(config.host).toBe('localhost');
    });

    it('should initialize config manager', async () => {
      const result = await createFastifyConfig({
        additionalSources: [new InMemoryConfigSource({ app: { name: 'test' } }, 100)],
      });
      createdManagers.push(result.configManager);

      expect(result.configManager.get('app.name')).toBe('test');
    });
  });
});
