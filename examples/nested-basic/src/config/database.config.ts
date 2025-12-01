import { Required, DefaultValue, ConfigProperty, Validate } from '@snow-tzu/type-config-nestjs';
import { IsString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PoolConfig } from './pool.config';

/**
 * Database Configuration (Level 1 nesting)
 * Demonstrates:
 * - Mix of @Required and @DefaultValue
 * - Multi-level nesting (contains PoolConfig)
 * - @Validate() for comprehensive validation
 */
@Validate()
export class DatabaseConfig {
  @Required()
  @IsString()
  // @DefaultValue('localhost')
  host!: string;

  @DefaultValue(5432)
  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @Required()
  @IsString()
  @DefaultValue('localhost')
  username!: string;

  @Required()
  @IsString()
  @DefaultValue('password')
  password!: string;

  // Nested pool configuration
  // When using @Validate() on parent class, nested classes need @ValidateNested() and @Type()
  @ConfigProperty()
  @ValidateNested()
  @Type(() => PoolConfig)
  pool!: PoolConfig;
}
