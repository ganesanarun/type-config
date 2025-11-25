import { ConfigSource } from '@snow-tzu/type-config';
import { SSMClient, GetParametersByPathCommand, GetParametersByPathCommandInput } from '@aws-sdk/client-ssm';

export interface AWSParameterStoreOptions {
  path: string;
  region?: string;
  recursive?: boolean;
  decryptSecrets?: boolean;
  priority?: number;
  client?: SSMClient;
}

/**
 * AWS Parameter Store configuration source
 * Loads configuration from AWS Systems Manager Parameter Store
 */
export class AWSParameterStoreSource implements ConfigSource {
  private client: SSMClient;
  public priority: number;
  public name: string;

  constructor(private options: AWSParameterStoreOptions) {
    this.priority = options.priority ?? 300;
    this.name = `aws-parameter-store:${options.path}`;
    this.client = options.client || new SSMClient({ region: options.region || 'us-east-1' });
  }

  async load(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    try {
      const params: GetParametersByPathCommandInput = {
        Path: this.options.path,
        Recursive: this.options.recursive ?? true,
        WithDecryption: this.options.decryptSecrets ?? true,
      };

      let nextToken: string | undefined;
      
      do {
        if (nextToken) {
          params.NextToken = nextToken;
        }

        const command = new GetParametersByPathCommand(params);
        const response = await this.client.send(command);

        if (response.Parameters) {
          for (const param of response.Parameters) {
            if (param.Name && param.Value) {
              // Remove base path and convert to nested object
              const key = param.Name.replace(this.options.path, '').replace(/^\//, '');
              const nestedKey = key.replace(/\//g, '.');
              this.setNestedValue(result, nestedKey, param.Value);
            }
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);

    } catch (error) {
      console.error('Failed to load from AWS Parameter Store:', error);
      throw error;
    }

    return result;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
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
