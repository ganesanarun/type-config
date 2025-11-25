import 'reflect-metadata';
import { TypeConfigModule, CONFIG_MANAGER_TOKEN } from '../src';
import { ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config';

describe('TypeConfigModule', () => {
  describe('forRoot', () => {
    it('should return dynamic module', () => {
      const module = TypeConfigModule.forRoot();

      expect(module.module).toBe(TypeConfigModule);
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });

    it('should be global by default', () => {
      const module = TypeConfigModule.forRoot();

      expect(module.global).toBe(true);
    });

    it('should respect isGlobal option', () => {
      const module = TypeConfigModule.forRoot({ isGlobal: false });

      expect(module.global).toBe(false);
    });

    it('should provide CONFIG_MANAGER_TOKEN', () => {
      const module = TypeConfigModule.forRoot();

      const provider = module.providers?.find((p: any) => p.provide === CONFIG_MANAGER_TOKEN);

      expect(provider).toBeDefined();
    });

    it('should accept profile option', () => {
      const module = TypeConfigModule.forRoot({ profile: 'test' });

      expect(module).toBeDefined();
    });

    it('should accept config directory option', () => {
      const module = TypeConfigModule.forRoot({ configDir: './config' });

      expect(module).toBeDefined();
    });

    it('should accept env prefix option', () => {
      const module = TypeConfigModule.forRoot({ envPrefix: 'APP_' });

      expect(module).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should return dynamic module', () => {
      const module = TypeConfigModule.forRootAsync({
        useFactory: () => ({ profile: 'test' }),
      });

      expect(module.module).toBe(TypeConfigModule);
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });

    it('should be global by default', () => {
      const module = TypeConfigModule.forRootAsync({
        useFactory: () => ({}),
      });

      expect(module.global).toBe(true);
    });

    it('should respect isGlobal option', () => {
      const module = TypeConfigModule.forRootAsync({
        isGlobal: false,
        useFactory: () => ({}),
      });

      expect(module.global).toBe(false);
    });

    it('should provide CONFIG_MANAGER_TOKEN', () => {
      const module = TypeConfigModule.forRootAsync({
        useFactory: () => ({}),
      });

      const provider = module.providers?.find((p: any) => p.provide === CONFIG_MANAGER_TOKEN);

      expect(provider).toBeDefined();
    });

    it('should accept inject option', () => {
      const DEPENDENCY = Symbol('dependency');
      const module = TypeConfigModule.forRootAsync({
        useFactory: (dep: any) => ({ profile: 'test' }),
        inject: [DEPENDENCY],
      });

      const provider = module.providers?.find((p: any) => p.provide === CONFIG_MANAGER_TOKEN);

      expect((provider as any).inject).toEqual([DEPENDENCY]);
    });
  });

  describe('forFeature', () => {
    it('should return dynamic module', () => {
      @ConfigurationProperties('test')
      class TestConfig {
        @ConfigProperty()
        value!: string;
      }

      const module = TypeConfigModule.forFeature([TestConfig]);

      expect(module.module).toBe(TypeConfigModule);
      expect(module.providers).toBeDefined();
      expect(module.exports).toBeDefined();
    });

    it('should provide config classes', () => {
      @ConfigurationProperties('database')
      class DatabaseConfig {
        @ConfigProperty()
        host!: string;
      }

      const module = TypeConfigModule.forFeature([DatabaseConfig]);

      const provider = module.providers?.find((p: any) => p.provide === DatabaseConfig);

      expect(provider).toBeDefined();
    });

    it('should export config classes', () => {
      @ConfigurationProperties('server')
      class ServerConfig {
        @ConfigProperty()
        port!: number;
      }

      const module = TypeConfigModule.forFeature([ServerConfig]);

      const exported = module.exports as any[];

      expect(exported.some(e => e.provide === ServerConfig)).toBe(true);
    });

    it('should throw error for class without decorator', () => {
      class PlainClass {}

      expect(() => TypeConfigModule.forFeature([PlainClass])).toThrow(
        'must be decorated with @ConfigurationProperties'
      );
    });

    it('should register multiple config classes', () => {
      @ConfigurationProperties('config1')
      class Config1 {}

      @ConfigurationProperties('config2')
      class Config2 {}

      const module = TypeConfigModule.forFeature([Config1, Config2]);

      expect(module.providers?.length).toBe(2);
      expect(module.exports?.length).toBe(2);
    });
  });
});
