import { PlaceholderResolver } from '../src';

describe('PlaceholderResolver', () => {
  let resolver: PlaceholderResolver;

  beforeEach(() => {
    resolver = new PlaceholderResolver();
  });

  describe('hasPlaceholder', () => {
    it('should detect placeholder syntax', () => {
      expect(resolver.hasPlaceholder('${VAR}')).toBe(true);
      expect(resolver.hasPlaceholder('${VAR:fallback}')).toBe(true);
      expect(resolver.hasPlaceholder('prefix ${VAR} suffix')).toBe(true);
    });

    it('should return false for strings without placeholders', () => {
      expect(resolver.hasPlaceholder('plain text')).toBe(false);
      expect(resolver.hasPlaceholder('$VAR')).toBe(false);
      expect(resolver.hasPlaceholder('{VAR}')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(resolver.hasPlaceholder(123 as any)).toBe(false);
      expect(resolver.hasPlaceholder(null as any)).toBe(false);
      expect(resolver.hasPlaceholder(undefined as any)).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve basic placeholder with environment variable', () => {
      const envProvider = (key: string) => (key === 'VAR' ? 'value' : undefined);
      const result = resolver.resolve('${VAR}', envProvider);
      expect(result).toBe('value');
    });

    it('should use fallback when environment variable is not set', () => {
      const envProvider = () => undefined;
      const result = resolver.resolve('${VAR:fallback}', envProvider);
      expect(result).toBe('fallback');
    });

    it('should use environment variable over fallback when set', () => {
      const envProvider = (key: string) => (key === 'VAR' ? 'env_value' : undefined);
      const result = resolver.resolve('${VAR:fallback}', envProvider);
      expect(result).toBe('env_value');
    });

    it('should return undefined when no fallback and variable not set', () => {
      const envProvider = () => undefined;
      const result = resolver.resolve('${VAR}', envProvider);
      expect(result).toBeUndefined();
    });

    it('should resolve placeholder in partial string', () => {
      const envProvider = (key: string) => (key === 'HOST' ? 'localhost' : undefined);
      const result = resolver.resolve('http://${HOST}:8080', envProvider);
      expect(result).toBe('http://localhost:8080');
    });

    it('should resolve multiple placeholders', () => {
      const envProvider = (key: string) => {
        const vars: Record<string, string> = { HOST: 'localhost', PORT: '8080' };
        return vars[key];
      };
      const result = resolver.resolve('${HOST}:${PORT}', envProvider);
      expect(result).toBe('localhost:8080');
    });

    it('should handle empty fallback value', () => {
      const envProvider = () => undefined;
      const result = resolver.resolve('${VAR:}', envProvider);
      expect(result).toBe('');
    });

    it('should handle escaped placeholders', () => {
      const envProvider = (key: string) => (key === 'VAR' ? 'value' : undefined);
      const result = resolver.resolve('\\${VAR}', envProvider);
      expect(result).toBe('${VAR}');
    });

    it('should handle mix of escaped and real placeholders', () => {
      const envProvider = (key: string) => (key === 'REAL' ? 'resolved' : undefined);
      const result = resolver.resolve('\\${ESCAPED} and ${REAL}', envProvider);
      expect(result).toBe('${ESCAPED} and resolved');
    });

    it('should return original value if not a string', () => {
      const result = resolver.resolve(123 as any);
      expect(result).toBe(123);
    });

    it('should preserve surrounding text with multiple placeholders', () => {
      const envProvider = (key: string) => {
        const vars: Record<string, string> = { USER: 'admin', PASS: 'secret' };
        return vars[key];
      };
      const result = resolver.resolve('user=${USER}&pass=${PASS}', envProvider);
      expect(result).toBe('user=admin&pass=secret');
    });
  });

  describe('resolveObject', () => {
    it('should resolve placeholders in nested objects', () => {
      const envProvider = (key: string) => {
        const vars: Record<string, string> = { HOST: 'localhost', PORT: '5432' };
        return vars[key];
      };

      const config = {
        database: {
          host: '${HOST}',
          port: '${PORT}',
        },
      };

      const result = resolver.resolveObject(config, envProvider);
      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: '5432',
        },
      });
    });

    it('should preserve non-string values', () => {
      const envProvider = () => undefined;
      const config = {
        number: 123,
        boolean: true,
        null: null,
        nested: {
          value: 456,
        },
      };

      const result = resolver.resolveObject(config, envProvider);
      expect(result).toEqual(config);
    });

    it('should handle arrays with placeholders', () => {
      const envProvider = (key: string) => (key === 'VAR' ? 'value' : undefined);
      const config = {
        items: ['${VAR}', 'plain', '${VAR:fallback}'],
      };

      const result = resolver.resolveObject(config, envProvider);
      expect(result).toEqual({
        items: ['value', 'plain', 'value'],
      });
    });

    it('should omit properties when placeholder resolution fails', () => {
      const envProvider = () => undefined;
      const config = {
        required: '${MISSING}',
        optional: '${MISSING:fallback}',
        literal: 'value',
      };

      const result = resolver.resolveObject(config, envProvider);
      expect(result).toEqual({
        optional: 'fallback',
        literal: 'value',
      });
      expect(result).not.toHaveProperty('required');
    });

    it('should handle deeply nested structures', () => {
      const envProvider = (key: string) => (key === 'SECRET' ? 'password' : undefined);
      const config = {
        level1: {
          level2: {
            level3: {
              password: '${SECRET}',
            },
          },
        },
      };

      const result = resolver.resolveObject(config, envProvider);
      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              password: 'password',
            },
          },
        },
      });
    });

    it('should handle arrays of objects', () => {
      const envProvider = (key: string) => (key === 'HOST' ? 'localhost' : undefined);
      const config = {
        servers: [
          { host: '${HOST}', port: 8080 },
          { host: '${HOST}', port: 8081 },
        ],
      };

      const result = resolver.resolveObject(config, envProvider);
      expect(result).toEqual({
        servers: [
          { host: 'localhost', port: 8080 },
          { host: 'localhost', port: 8081 },
        ],
      });
    });

    it('should return original value for non-object input', () => {
      const result = resolver.resolveObject(null as any);
      expect(result).toBeNull();
    });
  });
});
