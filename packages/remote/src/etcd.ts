import { ConfigSource } from '@snow-tzu/type-config';
import { Etcd3, IOptions } from 'etcd3';

export interface EtcdSourceOptions {
  prefix: string;
  hosts?: string | string[];
  credentials?: {
    rootCertificate?: Buffer;
    privateKey?: Buffer;
    certChain?: Buffer;
  };
  auth?: {
    username: string;
    password: string;
  };
  priority?: number;
  client?: Etcd3;
}

/**
 * etcd configuration source
 * Loads configuration from etcd key-value store
 */
export class EtcdSource implements ConfigSource {
  private client: Etcd3;
  public priority: number;
  public name: string;

  constructor(private options: EtcdSourceOptions) {
    this.priority = options.priority ?? 300;
    this.name = `etcd:${options.prefix}`;

    if (options.client) {
      this.client = options.client;
    } else {
      const clientOptions: IOptions = {
        hosts: options.hosts || 'localhost:2379',
      };

      if (options.credentials?.rootCertificate) {
        clientOptions.credentials = {
          rootCertificate: options.credentials.rootCertificate,
          privateKey: options.credentials.privateKey,
          certChain: options.credentials.certChain,
        };
      }

      if (options.auth) {
        clientOptions.auth = options.auth;
      }

      this.client = new Etcd3(clientOptions);
    }
  }

  async load(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    try {
      // Get all keys with the prefix
      const keys = await this.client.getAll().prefix(this.options.prefix).keys();
      
      // Get all values
      const values = await this.client.getAll().prefix(this.options.prefix).strings();

      for (const [key, value] of Object.entries(values)) {
        // Remove prefix from key
        const cleanKey = key.replace(this.options.prefix, '').replace(/^\//, '');
        
        // Convert key path to nested structure
        const nestedKey = cleanKey.replace(/\//g, '.');
        
        // Try to parse as JSON, fall back to string
        let parsedValue: any = value;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string
        }

        this.setNestedValue(result, nestedKey, parsedValue);
      }
    } catch (error) {
      console.error('Failed to load from etcd:', error);
      throw error;
    }

    return result;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    if (!path) {
      // If path is empty, merge the value directly
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(obj, value);
      }
      return;
    }

    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Close the etcd client connection
   */
  async close(): Promise<void> {
    this.client.close();
  }
}
