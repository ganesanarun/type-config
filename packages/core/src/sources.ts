import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';

/**
 * Configuration source interface
 */
export interface ConfigSource {
  load(): Promise<Record<string, any>>;
  priority: number;
  name?: string;
}

/**
 * File-based configuration source
 * Supports JSON, YAML, and .env files
 */
export class FileConfigSource implements ConfigSource {
  constructor(
    private filePath: string,
    public priority: number = 100,
    public name?: string
  ) {
    this.name = name || `file:${filePath}`;
  }

  async load(): Promise<Record<string, any>> {
    if (!fs.existsSync(this.filePath)) {
      return {};
    }

    const ext = path.extname(this.filePath);
    const content = fs.readFileSync(this.filePath, 'utf-8');

    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.yml':
      case '.yaml':
        return yaml.load(content) as Record<string, any>;
      case '.env':
        return this.parseEnvFile(content);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private parseEnvFile(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (match) {
        result[match[1].trim()] = match[2].trim();
      }
    });
    return result;
  }
}

/**
 * Environment variable configuration source
 * Supports nested properties via underscore notation (e.g., DB_HOST -> db.host)
 */
export class EnvConfigSource implements ConfigSource {
  constructor(
    private prefix: string = '',
    public priority: number = 200,
    public name: string = 'env'
  ) {}

  async load(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    Object.keys(process.env).forEach(key => {
      if (!this.prefix || key.startsWith(this.prefix)) {
        const cleanKey = this.prefix ? key.slice(this.prefix.length) : key;
        const nestedKey = cleanKey.toLowerCase().replace(/_/g, '.');
        this.setNestedValue(result, nestedKey, process.env[key]);
      }
    });

    return result;
  }

  private setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }
}

/**
 * In-memory configuration source
 * Useful for testing or programmatic configuration
 */
export class InMemoryConfigSource implements ConfigSource {
  constructor(
    private config: Record<string, any>,
    public priority: number = 50,
    public name: string = 'memory'
  ) {}

  async load(): Promise<Record<string, any>> {
    return { ...this.config };
  }
}

/**
 * Encryption helper for sensitive configuration values
 */
export class EncryptionHelper {
  private algorithm = 'aes-256-cbc';
  
  constructor(private secretKey: string) {
    if (secretKey.length !== 32) {
      throw new Error('Secret key must be 32 characters long');
    }
  }

  /**
   * Encrypt a value
   */
  encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.secretKey), iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `ENC(${iv.toString('hex')}:${encrypted})`;
  }

  /**
   * Decrypt a value if it's encrypted (format: ENC(iv:encrypted))
   */
  decrypt(value: string): string {
    const match = value.match(/^ENC\(([^:]+):(.+)\)$/);
    if (!match) {
      return value; // Not encrypted
    }

    const iv = Buffer.from(match[1], 'hex');
    const encrypted = match[2];
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.secretKey), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Check if a value is encrypted
   */
  isEncrypted(value: string): boolean {
    return /^ENC\([^:]+:.+\)$/.test(value);
  }

  /**
   * Recursively decrypt all encrypted values in an object
   */
  decryptObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.decrypt(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.decryptObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.decryptObject(obj[key]);
      }
      return result;
    }
    
    return obj;
  }
}
