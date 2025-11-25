import { ConfigSource } from '@snow-tzu/type-config';
import Consul from 'consul';

export interface ConsulSourceOptions {
  prefix: string;
  host?: string;
  port?: number;
  secure?: boolean;
  token?: string;
  priority?: number;
  format?: 'json' | 'yaml' | 'properties';
  client?: Consul.Consul;
}

/**
 * Consul KV configuration source
 * Loads configuration from HashiCorp Consul KV store
 */
export class ConsulSource implements ConfigSource {
  private client: Consul.Consul;
  public priority: number;
  public name: string;

  constructor(private options: ConsulSourceOptions) {
    this.priority = options.priority ?? 300;
    this.name = `consul:${options.prefix}`;
    
    this.client = options.client || new Consul({
      host: options.host || 'localhost',
      port: options.port?.toString() || '8500',
      secure: options.secure || false,
      defaults: options.token ? { token: options.token } : undefined,
    });
  }

  async load(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    try {
      const response = await this.client.kv.get({
        key: this.options.prefix,
        recurse: true,
      });

      if (!response) {
        return result;
      }

      const items = Array.isArray(response) ? response : [response];

      for (const item of items) {
        if (item.Key && item.Value) {
          // Remove prefix from key
          const key = item.Key.replace(this.options.prefix, '').replace(/^\//, '');
          
          // Convert key path to nested structure
          const nestedKey = key.replace(/\//g, '.');
          
          // Parse value based on format
          let value: any = item.Value;
          
          if (this.options.format === 'json') {
            try {
              value = JSON.parse(item.Value);
            } catch {
              value = item.Value;
            }
          }

          this.setNestedValue(result, nestedKey, value);
        }
      }
    } catch (error) {
      console.error('Failed to load from Consul:', error);
      throw error;
    }

    return result;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    if (!path) {
      // If path is empty, merge the value directly (for root-level config)
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
}
