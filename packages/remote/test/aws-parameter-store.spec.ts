import { AWSParameterStoreSource } from '../src/aws-parameter-store';
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

jest.mock('@aws-sdk/client-ssm');

describe('AWSParameterStoreSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with path', () => {
      const source = new AWSParameterStoreSource({ path: '/app/config' });

      expect(source.name).toBe('aws-parameter-store:/app/config');
      expect(source.priority).toBe(300);
    });

    it('should use custom priority', () => {
      const source = new AWSParameterStoreSource({ path: '/app/config', priority: 500 });

      expect(source.priority).toBe(500);
    });

    it('should use custom region', () => {
      const source = new AWSParameterStoreSource({ path: '/app/config', region: 'us-west-2' });

      expect(source).toBeDefined();
    });

    it('should use custom client', () => {
      const client = new SSMClient({ region: 'us-east-1' });

      const source = new AWSParameterStoreSource({ path: '/app/config', client });

      expect(source).toBeDefined();
    });
  });

  describe('load', () => {
    it('should load parameters from AWS', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameters: [
          { Name: '/app/config/database/host', Value: 'localhost' },
          { Name: '/app/config/database/port', Value: '5432' },
        ],
      });

      const client = { send: mockSend } as any;

      const source = new AWSParameterStoreSource({ path: '/app/config', client });

      const result = await source.load();

      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: '5432',
        },
      });
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle paginated responses', async () => {
      const mockSend = jest
        .fn()
        .mockResolvedValueOnce({
          Parameters: [{ Name: '/app/config/key1', Value: 'value1' }],
          NextToken: 'token123',
        })
        .mockResolvedValueOnce({
          Parameters: [{ Name: '/app/config/key2', Value: 'value2' }],
        });

      const client = { send: mockSend } as any;

      const source = new AWSParameterStoreSource({ path: '/app/config', client });

      const result = await source.load();

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle recursive option', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameters: [],
      });

      const client = { send: mockSend } as any;

      const source = new AWSParameterStoreSource({ path: '/app/config', recursive: true, client });

      await source.load();

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle decryption option', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameters: [],
      });

      const client = { send: mockSend } as any;

      const source = new AWSParameterStoreSource({ path: '/app/config', decryptSecrets: true, client });

      await source.load();

      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockSend = jest.fn().mockRejectedValue(new Error('AWS Error'));

      const client = { send: mockSend } as any;

      const source = new AWSParameterStoreSource({ path: '/app/config', client });

      await expect(source.load()).rejects.toThrow('AWS Error');
      
      consoleSpy.mockRestore();
    });

    it('should handle empty parameters', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameters: [],
      });

      const client = { send: mockSend } as any;

      const source = new AWSParameterStoreSource({ path: '/app/config', client });

      const result = await source.load();

      expect(result).toEqual({});
    });

    it('should handle nested paths', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameters: [
          { Name: '/app/config/server/http/port', Value: '3000' },
          { Name: '/app/config/server/http/host', Value: 'localhost' },
        ],
      });

      const client = { send: mockSend } as any;

      const source = new AWSParameterStoreSource({ path: '/app/config', client });

      const result = await source.load();

      expect(result).toEqual({
        server: {
          http: {
            port: '3000',
            host: 'localhost',
          },
        },
      });
    });
  });
});
