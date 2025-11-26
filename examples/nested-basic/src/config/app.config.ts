import { ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config-nestjs';
import { ServerConfig } from './server.config';
import { DatabaseConfig } from './database.config';
import { ServicesConfig } from './services.config';
import { Validate } from '@snow-tzu/type-config';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Root Application Configuration
 * Demonstrates:
 * - @ConfigurationProperties with prefix
 * - Multiple nested configuration classes
 * - No @ConfigProperty needed when property names match config keys
 * - Multi-level nesting (server.ssl, database.pool)
 * - @ValidateNested() and @Type() for nested class validation
 */
@ConfigurationProperties('app')
@Validate()
export class AppConfig {
  // Nested classes - @ConfigProperty optional but helps with discovery
  // When using @Validate() on parent class, nested classes need @ValidateNested() and @Type()
  @ConfigProperty()
  @ValidateNested()
  @Type(() => ServerConfig)
  server!: ServerConfig;
  
  @ConfigProperty()
  @ValidateNested()
  @Type(() => DatabaseConfig)
  database!: DatabaseConfig;
  
  @ConfigProperty()
  @ValidateNested()
  @Type(() => ServicesConfig)
  services!: ServicesConfig;
}
