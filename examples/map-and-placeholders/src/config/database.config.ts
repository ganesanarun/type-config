import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
} from '@snow-tzu/type-config-nestjs';

/**
 * Database connection configuration for a single database
 */
export class DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema: string;
  ssl: boolean;
}

/**
 * Connection pool configuration
 */
export class PoolConfig {
  min: number;
  max: number;
  idle: number;
}

/**
 * Main databases configuration with Map-based connections
 * Demonstrates map-based configuration binding
 */
@ConfigurationProperties('databases')
export class DatabasesConfig {
  /**
   * Map of database connections by name
   * This demonstrates the Map<string, T> binding feature
   */
  @ConfigProperty('connections')
  @Required()
  connections: Map<string, DatabaseConnection>;

  /**
   * Connection pool settings
   */
  @ConfigProperty('pool')
  @Required()
  pool: PoolConfig;

  /**
   * Helper method to get a specific database connection
   */
  getConnection(name: string): DatabaseConnection | undefined {
    return this.connections.get(name);
  }

  /**
   * Helper method to list all available connection names
   */
  getConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }
}
