import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  RecordType,
} from '@snow-tzu/type-config-nestjs';
import { IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { PoolConfig } from './database.config';

/**
 * Database connection configuration for a single database
 * 
 * Note: The class-validator decorators below are for documentation only.
 * They do NOT provide automatic validation when used in a Record type.
 * See main.ts for manual validation example.
 */
export class DatabaseConnectionValidated {
  @IsString()
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  database: string;

  @IsString()
  schema: string;

  @IsBoolean()
  ssl: boolean;
}

/**
 * Alternative approach using Record instead of Map
 * 
 * Trade-offs:
 * - ✅ Plain object with bracket notation access
 * - ✅ Works with Object.keys(), Object.entries()
 * - ✅ JSON serialization works directly
 * - ❌ Not a true Map (no Map methods like .get(), .set())
 * - ❌ Must use bracket notation: connections['serhafen-us']
 * - ❌ Automatic validation NOT supported (class-validator limitation)
 * 
 * **IMPORTANT LIMITATION**: 
 * Automatic validation of Record entries does NOT work. This is a limitation of
 * class-validator, which requires known properties at compile time.
 * 
 * You must implement manual validation (see main.ts for example).
 */
@ConfigurationProperties('databases')
export class DatabasesRecordConfig {
  /**
   * Record of database connections by name
   * 
   * Decorators explained:
   * - @ConfigProperty: Maps to 'databases.connections' in YAML
   * - @Required: Validates that the 'connections' property exists (not the entries)
   * - @RecordType: Keeps this as a plain object (doesn't convert to Map)
   * 
   * Note: Entry validation must be done manually - see main.ts
   */
  @ConfigProperty('connections')
  @Required()
  @RecordType()
  connections: Record<string, DatabaseConnectionValidated>;

  @ConfigProperty('pool')
  @Required()
  pool: PoolConfig;

  /**
   * Helper method to get a specific database connection
   */
  getConnection(name: string): DatabaseConnectionValidated | undefined {
    return this.connections[name];
  }

  /**
   * Helper method to list all available connection names
   */
  getConnectionNames(): string[] {
    return Object.keys(this.connections);
  }
}
