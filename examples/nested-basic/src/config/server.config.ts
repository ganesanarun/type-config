import { Required, ConfigProperty, Validate } from '@snow-tzu/type-config-nestjs';
import { IsString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SslConfig } from './ssl.config';
import { DefaultValue } from '@snow-tzu/type-config';

/**
 * Server Configuration (Level 1 nesting)
 * Demonstrates:
 * - @Required on nested class properties
 * - @DefaultValue on nested class properties
 * - Multi-level nesting (contains SslConfig)
 * - @Validate() for class-validator integration
 */
@Validate()
export class ServerConfig {
  @Required()
  @IsString()
  @DefaultValue('localhost')
  host!: string;

  @Required()
  @IsNumber()
  @Min(1)
  @Max(65535)
  @DefaultValue(8080)
  port!: number;

  // Nested class - @ConfigProperty helps with discovery
  // When using @Validate() on parent class, nested classes need @ValidateNested() and @Type()
  @ConfigProperty('ssl')
  @ValidateNested()
  @Type(() => SslConfig)
  ssl!: SslConfig;
}
