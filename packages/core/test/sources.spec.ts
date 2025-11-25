import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EncryptionHelper, EnvConfigSource, FileConfigSource, InMemoryConfigSource } from '../src';

describe('sources', () => {
  describe('FileConfigSource', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should load JSON file', async () => {
      const configPath = path.join(tempDir, 'test.json');
      const configData = { database: { host: 'localhost', port: 5432 } };
      fs.writeFileSync(configPath, JSON.stringify(configData));

      const source = new FileConfigSource(configPath, 100);
      const result = await source.load();

      expect(result).toEqual(configData);
    });

    it('should load YAML file with .yml extension', async () => {
      const configPath = path.join(tempDir, 'test.yml');
      const yamlContent = 'database:\n  host: localhost\n  port: 5432';
      fs.writeFileSync(configPath, yamlContent);

      const source = new FileConfigSource(configPath, 100);
      const result = await source.load();

      expect(result).toEqual({ database: { host: 'localhost', port: 5432 } });
    });

    it('should load YAML file with .yaml extension', async () => {
      const configPath = path.join(tempDir, 'test.yaml');
      const yamlContent = 'server:\n  port: 3000';
      fs.writeFileSync(configPath, yamlContent);

      const source = new FileConfigSource(configPath, 100);
      const result = await source.load();

      expect(result).toEqual({ server: { port: 3000 } });
    });

    it('should load .env file', async () => {
      const configPath = path.join(tempDir, 'test.env');
      const envContent = 'DB_HOST=localhost\nDB_PORT=5432\n# Comment\nAPI_KEY=secret';
      fs.writeFileSync(configPath, envContent);

      const source = new FileConfigSource(configPath, 100);
      const result = await source.load();

      expect(result).toEqual({
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        API_KEY: 'secret',
      });
    });

    it('should return empty object for non-existent file', async () => {
      const source = new FileConfigSource('/non/existent/path.json', 100);
      const result = await source.load();

      expect(result).toEqual({});
    });

    it('should throw error for unsupported file type', async () => {
      const configPath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(configPath, 'some content');

      const source = new FileConfigSource(configPath, 100);

      await expect(source.load()).rejects.toThrow('Unsupported file type: .txt');
    });

    it('should have correct name property', () => {
      const source = new FileConfigSource('/path/to/config.json', 100);

      expect(source.name).toBe('file:/path/to/config.json');
    });

    it('should use custom name when provided', () => {
      const source = new FileConfigSource('/path/to/config.json', 100, 'custom-name');

      expect(source.name).toBe('custom-name');
    });
  });

  describe('EnvConfigSource', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should load environment variables without prefix', async () => {
      process.env.TEST_VAR = 'value1';
      process.env.ANOTHER_VAR = 'value2';

      const source = new EnvConfigSource('', 200);
      const result = await source.load();

      expect(result.test).toEqual({ var: 'value1' });
      expect(result.another).toEqual({ var: 'value2' });
    });

    it('should load environment variables with prefix', async () => {
      process.env.APP_DATABASE_HOST = 'localhost';
      process.env.APP_DATABASE_PORT = '5432';
      process.env.OTHER_VAR = 'ignored';

      const source = new EnvConfigSource('APP_', 200);
      const result = await source.load();

      expect(result.database).toEqual({ host: 'localhost', port: '5432' });
      expect(result.other).toBeUndefined();
    });

    it('should convert underscores to nested structure', async () => {
      process.env.SERVER_HTTP_PORT = '3000';
      process.env.SERVER_HTTP_HOST = 'localhost';

      const source = new EnvConfigSource('', 200);
      const result = await source.load();

      expect(result.server).toEqual({
        http: {
          port: '3000',
          host: 'localhost',
        },
      });
    });

    it('should have correct priority', () => {
      const source = new EnvConfigSource('', 200);

      expect(source.priority).toBe(200);
    });

    it('should have correct name', () => {
      const source = new EnvConfigSource('APP_', 200);

      expect(source.name).toBe('env');
    });
  });

  describe('InMemoryConfigSource', () => {
    it('should return provided config', async () => {
      const config = { database: { host: 'localhost' }, server: { port: 3000 } };
      const source = new InMemoryConfigSource(config, 50);

      const result = await source.load();

      expect(result).toEqual(config);
    });

    it('should return copy of config', async () => {
      const config = { test: 'value' };
      const source = new InMemoryConfigSource(config, 50);

      const result = await source.load();
      result.test = 'modified';

      expect(config.test).toBe('value');
    });

    it('should have correct priority', () => {
      const source = new InMemoryConfigSource({}, 75);

      expect(source.priority).toBe(75);
    });

    it('should have correct name', () => {
      const source = new InMemoryConfigSource({}, 50);

      expect(source.name).toBe('memory');
    });
  });

  describe('EncryptionHelper', () => {
    const validKey = '12345678901234567890123456789012';

    it('should throw error for invalid key length', () => {
      expect(() => new EncryptionHelper('short')).toThrow('Secret key must be 32 characters long');
    });

    it('should encrypt and decrypt a value', () => {
      const helper = new EncryptionHelper(validKey);
      const original = 'secret-password';

      const encrypted = helper.encrypt(original);
      const decrypted = helper.decrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted).toMatch(/^ENC\([^:]+:.+\)$/);
    });

    it('should return non-encrypted value as-is', () => {
      const helper = new EncryptionHelper(validKey);
      const plaintext = 'not-encrypted';

      const result = helper.decrypt(plaintext);

      expect(result).toBe(plaintext);
    });

    it('should check if value is encrypted', () => {
      const helper = new EncryptionHelper(validKey);

      expect(helper.isEncrypted('ENC(abc123:def456)')).toBe(true);
      expect(helper.isEncrypted('plain-text')).toBe(false);
      expect(helper.isEncrypted('ENC(invalid)')).toBe(false);
    });

    it('should decrypt object recursively', () => {
      const helper = new EncryptionHelper(validKey);
      const encrypted1 = helper.encrypt('secret1');
      const encrypted2 = helper.encrypt('secret2');

      const obj = {
        plain: 'value',
        encrypted: encrypted1,
        nested: {
          encrypted: encrypted2,
          plain: 'value2',
        },
      };

      const result = helper.decryptObject(obj);

      expect(result.plain).toBe('value');
      expect(result.encrypted).toBe('secret1');
      expect(result.nested.encrypted).toBe('secret2');
      expect(result.nested.plain).toBe('value2');
    });

    it('should decrypt arrays', () => {
      const helper = new EncryptionHelper(validKey);
      const encrypted = helper.encrypt('secret');

      const arr = ['plain', encrypted, { value: encrypted }];
      const result = helper.decryptObject(arr);

      expect(result[0]).toBe('plain');
      expect(result[1]).toBe('secret');
      expect(result[2].value).toBe('secret');
    });

    it('should handle non-object values', () => {
      const helper = new EncryptionHelper(validKey);

      expect(helper.decryptObject('plain')).toBe('plain');
      expect(helper.decryptObject(123)).toBe(123);
      expect(helper.decryptObject(null)).toBe(null);
      expect(helper.decryptObject(undefined)).toBe(undefined);
    });
  });
});
